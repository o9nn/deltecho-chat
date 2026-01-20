/**
 * WebSocket Server for Browser Clients
 *
 * Provides the same IPC protocol over WebSocket for browser-based clients.
 * This enables the frontend/Electron renderer to communicate with the orchestrator.
 */

import { getLogger } from "deep-tree-echo-core";
import { EventEmitter } from "events";
import * as http from "http";
import * as https from "https";
import {
  IPCMessageType,
  type IPCMessage,
  type IPCResponse,
} from "@deltecho/ipc";

const log = getLogger("deep-tree-echo-orchestrator/WebSocketServer");

/**
 * WebSocket Server configuration
 */
export interface WebSocketServerConfig {
  port?: number;
  host?: string;
  path?: string;
  maxConnections?: number;
  heartbeatInterval?: number;
  useHttps?: boolean;
  httpsOptions?: {
    key: string;
    cert: string;
  };
}

const DEFAULT_CONFIG: WebSocketServerConfig = {
  port: 9877,
  host: "localhost",
  path: "/ws",
  maxConnections: 50,
  heartbeatInterval: 30000,
  useHttps: false,
};

/**
 * WebSocket client connection
 */
interface WebSocketClient {
  id: string;
  ws: WebSocket;
  subscriptions: Set<string>;
  lastHeartbeat: number;
}

/**
 * Request handler type
 */
type RequestHandler = (payload: unknown) => Promise<unknown>;

/**
 * WebSocket Server for browser clients
 *
 * Note: This uses the WebSocket global which is available in Node.js 18+
 * For older Node versions, you would need to import from 'ws' package
 */
export class WebSocketServer extends EventEmitter {
  private config: WebSocketServerConfig;
  private httpServer: http.Server | https.Server | null = null;
  private clients: Map<string, WebSocketClient> = new Map();
  private handlers: Map<string, RequestHandler> = new Map();
  private subscriptions: Map<string, Set<string>> = new Map();
  private running: boolean = false;
  private clientIdCounter: number = 0;
  private heartbeatTimer: NodeJS.Timeout | null = null;

  constructor(config: Partial<WebSocketServerConfig> = {}) {
    super();
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  /**
   * Register a request handler
   */
  public registerHandler(type: string, handler: RequestHandler): void {
    this.handlers.set(type, handler);
    log.debug(`Registered WebSocket handler for ${type}`);
  }

  /**
   * Start the WebSocket server
   */
  public async start(): Promise<void> {
    if (this.running) {
      log.warn("WebSocket server is already running");
      return;
    }

    log.info("Starting WebSocket server...");

    return new Promise((resolve, reject) => {
      try {
        // Create HTTP(S) server
        if (this.config.useHttps && this.config.httpsOptions) {
          this.httpServer = https.createServer({
            key: this.config.httpsOptions.key,
            cert: this.config.httpsOptions.cert,
          });
        } else {
          this.httpServer = http.createServer();
        }

        // Handle upgrade requests for WebSocket
        this.httpServer.on("upgrade", (request, socket, head) => {
          const url = new URL(
            request.url || "/",
            `http://${request.headers.host}`,
          );

          if (url.pathname === this.config.path) {
            this.handleUpgrade(request, socket, head);
          } else {
            socket.destroy();
          }
        });

        // Basic HTTP endpoint for health checks
        this.httpServer.on("request", (req, res) => {
          if (req.url === "/health") {
            res.writeHead(200, { "Content-Type": "application/json" });
            res.end(
              JSON.stringify({
                status: "ok",
                clients: this.clients.size,
                uptime: process.uptime(),
              }),
            );
          } else {
            res.writeHead(404);
            res.end("Not Found");
          }
        });

        this.httpServer.listen(this.config.port, this.config.host, () => {
          log.info(
            `WebSocket server listening on ${
              this.config.useHttps ? "wss" : "ws"
            }://${this.config.host}:${this.config.port}${this.config.path}`,
          );
          this.running = true;
          this.startHeartbeat();
          resolve();
        });

        this.httpServer.on("error", (error) => {
          log.error("WebSocket server error:", error);
          this.emit("error", error);
          reject(error);
        });
      } catch (error) {
        log.error("Failed to start WebSocket server:", error);
        reject(error);
      }
    });
  }

  /**
   * Handle WebSocket upgrade request
   */
  private handleUpgrade(
    request: http.IncomingMessage,
    socket: any,
    head: Buffer,
  ): void {
    // Check max connections
    if (this.clients.size >= this.config.maxConnections!) {
      log.warn("Max WebSocket connections reached");
      socket.write("HTTP/1.1 503 Service Unavailable\r\n\r\n");
      socket.destroy();
      return;
    }

    // Implementation limitation: Native WebSocket in Node.js doesn't easily support server-side
    // upgrade handling without 'ws' library or complex manual framing.
    // However, if we assume we are running in an environment where 'ws' might be available or
    // if this was intended to use a library.
    // Given dependencies, we might need 'ws'.
    // But for now, following the existing file's pattern which seemed to imply partial support or missing 'ws' import?
    // Actually the original file had: `// import { WebSocketServer as WSServer } from 'ws';` commented out.
    // It had `handleConnection(ws: WebSocket)` but no logic to actually CREATE that WebSocket from the request.
    // It sent 501 Not Implemented.

    // I will keep it as is (mock implementation/placeholder) but strictly typed.
    // If the user wants a working WebSocket server, they need 'ws' package.
    // But since I'm refactoring, I should leave it as-is logic-wise, just type updates.

    log.debug("WebSocket upgrade requested - using fallback mode");

    socket.write("HTTP/1.1 501 Not Implemented\r\n");
    socket.write("Content-Type: text/plain\r\n");
    socket.write("\r\n");
    socket.write(
      "WebSocket requires ws package. Install with: pnpm add ws @types/ws\r\n",
    );
    socket.destroy();
  }

  /**
   * Handle WebSocket connection (called when using 'ws' package)
   */
  public handleConnection(ws: WebSocket): void {
    const clientId = `ws_${++this.clientIdCounter}`;

    const client: WebSocketClient = {
      id: clientId,
      ws,
      subscriptions: new Set(),
      lastHeartbeat: Date.now(),
    };

    this.clients.set(clientId, client);
    log.info(`WebSocket client connected: ${clientId}`);
    this.emit("client_connected", { clientId });

    ws.onmessage = async (event) => {
      try {
        const data =
          typeof event.data === "string" ? event.data : event.data.toString();
        const message: IPCMessage = JSON.parse(data);
        await this.handleMessage(client, message);
      } catch (error) {
        log.error(`Failed to parse WebSocket message:`, error);
        this.sendError(ws, "parse_error", "Invalid JSON message");
      }
    };

    ws.onclose = () => {
      log.info(`WebSocket client disconnected: ${clientId}`);
      this.removeClient(clientId);
      this.emit("client_disconnected", { clientId });
    };

    ws.onerror = (error: Event) => {
      log.error(`WebSocket client ${clientId} error:`, error);
      this.removeClient(clientId);
    };
  }

  /**
   * Handle incoming message
   */
  private async handleMessage(
    client: WebSocketClient,
    message: IPCMessage,
  ): Promise<void> {
    log.debug(`WS message from ${client.id}: ${message.type}`);

    // Handle control messages
    if (message.type === IPCMessageType.PING) {
      client.lastHeartbeat = Date.now();
      this.sendResponse(client.ws, message.id, IPCMessageType.PONG, {
        timestamp: Date.now(),
      });
      return;
    }

    if (message.type === IPCMessageType.SUBSCRIBE) {
      const eventTypes =
        (message.payload as { eventTypes?: string[] })?.eventTypes || [];
      for (const eventType of eventTypes) {
        client.subscriptions.add(eventType);
        if (!this.subscriptions.has(eventType)) {
          this.subscriptions.set(eventType, new Set());
        }
        this.subscriptions.get(eventType)!.add(client.id);
      }
      this.sendResponse(
        client.ws,
        message.id,
        IPCMessageType.RESPONSE_SUCCESS,
        { subscribed: eventTypes },
      );
      return;
    }

    if (message.type === IPCMessageType.UNSUBSCRIBE) {
      const eventTypes =
        (message.payload as { eventTypes?: string[] })?.eventTypes || [];
      for (const eventType of eventTypes) {
        client.subscriptions.delete(eventType);
        this.subscriptions.get(eventType)?.delete(client.id);
      }
      this.sendResponse(
        client.ws,
        message.id,
        IPCMessageType.RESPONSE_SUCCESS,
        { unsubscribed: eventTypes },
      );
      return;
    }

    // Handle registered handlers
    const handler = this.handlers.get(message.type);
    if (!handler) {
      this.sendError(
        client.ws,
        message.id,
        `Unknown message type: ${message.type}`,
      );
      return;
    }

    try {
      const result = await handler(message.payload);
      this.sendResponse(
        client.ws,
        message.id,
        IPCMessageType.RESPONSE_SUCCESS,
        result,
      );
    } catch (error) {
      log.error(`Handler error for ${message.type}:`, error);
      this.sendError(client.ws, message.id, (error as Error).message);
    }
  }

  /**
   * Send response to client
   */
  private sendResponse(
    ws: WebSocket,
    requestId: string,
    type: IPCMessageType | string,
    payload: unknown,
  ): void {
    const response: IPCMessage = {
      id: requestId,
      type: type as IPCMessageType,
      payload,
      timestamp: Date.now(),
    };
    ws.send(JSON.stringify(response));
  }

  /**
   * Send error response
   */
  private sendError(ws: WebSocket, requestId: string, message: string): void {
    this.sendResponse(ws, requestId, IPCMessageType.RESPONSE_ERROR, {
      error: message,
    });
  }

  /**
   * Broadcast event to subscribed clients
   */
  public broadcast(eventType: string, payload: unknown): void {
    const subscribers = this.subscriptions.get(eventType);
    if (!subscribers || subscribers.size === 0) return;

    const message: IPCMessage = {
      id: `broadcast_${Date.now()}`,
      type: IPCMessageType.EVENT,
      payload: { eventType, data: payload },
      timestamp: Date.now(),
    };

    const messageStr = JSON.stringify(message);

    for (const clientId of subscribers) {
      const client = this.clients.get(clientId);
      if (client && client.ws.readyState === 1) {
        // WebSocket.OPEN = 1
        client.ws.send(messageStr);
      }
    }
  }

  /**
   * Start heartbeat checks
   */
  private startHeartbeat(): void {
    this.heartbeatTimer = setInterval(() => {
      const now = Date.now();
      const timeout = this.config.heartbeatInterval! * 2;

      for (const [clientId, client] of this.clients) {
        if (now - client.lastHeartbeat > timeout) {
          log.warn(`WebSocket client ${clientId} timed out`);
          client.ws.close();
          this.removeClient(clientId);
        }
      }
    }, this.config.heartbeatInterval);
  }

  /**
   * Remove a client
   */
  private removeClient(clientId: string): void {
    this.clients.delete(clientId);
    for (const subscribers of this.subscriptions.values()) {
      subscribers.delete(clientId);
    }
  }

  /**
   * Stop the WebSocket server
   */
  public async stop(): Promise<void> {
    if (!this.running) return;

    log.info("Stopping WebSocket server...");

    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer);
      this.heartbeatTimer = null;
    }

    // Close all client connections
    for (const client of this.clients.values()) {
      client.ws.close();
    }
    this.clients.clear();
    this.subscriptions.clear();

    return new Promise((resolve) => {
      if (this.httpServer) {
        this.httpServer.close(() => {
          this.httpServer = null;
          this.running = false;
          log.info("WebSocket server stopped");
          resolve();
        });
      } else {
        this.running = false;
        resolve();
      }
    });
  }

  /**
   * Check if server is running
   */
  public isRunning(): boolean {
    return this.running;
  }

  /**
   * Get connected client count
   */
  public getClientCount(): number {
    return this.clients.size;
  }

  /**
   * Get connected client IDs
   */
  public getClientIds(): string[] {
    return Array.from(this.clients.keys());
  }
}
