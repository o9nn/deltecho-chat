/**
 * IPC Client for Desktop/Browser Applications
 *
 * Provides a type-safe client for communicating with the Deep Tree Echo orchestrator.
 * Works with both Unix sockets (Node.js) and WebSockets (Browser/Electron renderer).
 */

import { EventEmitter } from "events";
import {
  IPCMessageType,
  IPCTypeMap,
  type IPCMessage,
  type IPCResponse as _IPCResponse,
  type EventNotification,
  createIPCMessage,
} from "./protocol.js";

/**
 * Client configuration
 */
export interface IPCClientConfig {
  /** Connection type */
  type: "socket" | "websocket";
  /** Socket path for Unix socket connections */
  socketPath?: string;
  /** TCP port for socket connections */
  tcpPort?: number;
  /** Use TCP instead of Unix socket */
  useTcp?: boolean;
  /** WebSocket URL for browser connections */
  webSocketUrl?: string;
  /** Reconnect automatically on disconnect */
  autoReconnect?: boolean;
  /** Reconnection delay in ms */
  reconnectDelay?: number;
  /** Maximum reconnection attempts */
  maxReconnectAttempts?: number;
  /** Request timeout in ms */
  requestTimeout?: number;
  /** Heartbeat interval in ms */
  heartbeatInterval?: number;
}

const DEFAULT_CONFIG: IPCClientConfig = {
  type: "websocket",
  socketPath: "/tmp/deep-tree-echo.sock",
  tcpPort: 9876,
  useTcp: false,
  webSocketUrl: "ws://localhost:9877/ws",
  autoReconnect: true,
  reconnectDelay: 1000,
  maxReconnectAttempts: 10,
  requestTimeout: 30000,
  heartbeatInterval: 30000,
};

/**
 * Pending request tracker
 */
interface PendingRequest {
  resolve: (value: unknown) => void;
  reject: (error: Error) => void;
  timeout: NodeJS.Timeout;
}

/**
 * Connection state
 */
export enum ConnectionState {
  DISCONNECTED = "disconnected",
  CONNECTING = "connecting",
  CONNECTED = "connected",
  RECONNECTING = "reconnecting",
}

/**
 * IPC Client for communicating with Deep Tree Echo orchestrator
 */
export class IPCClient extends EventEmitter {
  private config: IPCClientConfig;
  private state: ConnectionState = ConnectionState.DISCONNECTED;
  private ws: WebSocket | null = null;
  private socket: any = null; // net.Socket for Node.js
  private pendingRequests: Map<string, PendingRequest> = new Map();
  private subscriptions: Set<string> = new Set();
  private reconnectAttempts: number = 0;
  private heartbeatTimer: NodeJS.Timeout | null = null;
  private reconnectTimer: NodeJS.Timeout | null = null;

  constructor(config: Partial<IPCClientConfig> = {}) {
    super();
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  /**
   * Get current connection state
   */
  public getState(): ConnectionState {
    return this.state;
  }

  /**
   * Check if connected
   */
  public isConnected(): boolean {
    return this.state === ConnectionState.CONNECTED;
  }

  /**
   * Connect to the orchestrator
   */
  public async connect(): Promise<void> {
    if (this.state === ConnectionState.CONNECTED) {
      return;
    }

    this.state = ConnectionState.CONNECTING;
    this.emit("connecting");

    try {
      if (this.config.type === "websocket") {
        await this.connectWebSocket();
      } else {
        await this.connectSocket();
      }

      this.state = ConnectionState.CONNECTED;
      this.reconnectAttempts = 0;
      this.startHeartbeat();
      this.emit("connected");

      // Re-subscribe to events
      if (this.subscriptions.size > 0) {
        await this.subscribe(Array.from(this.subscriptions));
      }
    } catch (error) {
      this.state = ConnectionState.DISCONNECTED;
      throw error;
    }
  }

  /**
   * Connect via WebSocket
   */
  private async connectWebSocket(): Promise<void> {
    return new Promise((resolve, reject) => {
      const url = this.config.webSocketUrl!;

      // Use native WebSocket (works in browser and Node.js 18+)
      this.ws = new WebSocket(url);

      this.ws.onopen = () => {
        resolve();
      };

      this.ws.onclose = () => {
        this.handleDisconnect();
      };

      this.ws.onerror = (error) => {
        if (this.state === ConnectionState.CONNECTING) {
          reject(new Error(`WebSocket connection failed: ${error}`));
        }
        this.emit("error", error);
      };

      this.ws.onmessage = (event) => {
        this.handleMessage(event.data.toString());
      };

      // Connection timeout
      setTimeout(() => {
        if (this.state === ConnectionState.CONNECTING) {
          this.ws?.close();
          reject(new Error("Connection timeout"));
        }
      }, 10000);
    });
  }

  /**
   * Connect via Unix/TCP socket (Node.js only)
   */
  private async connectSocket(): Promise<void> {
    return new Promise((resolve, reject) => {
      // Dynamic import for Node.js net module
      import("net")
        .then((net) => {
          this.socket = new net.Socket();
          let buffer = "";

          if (this.config.useTcp) {
            this.socket.connect(this.config.tcpPort!, "localhost");
          } else {
            this.socket.connect(this.config.socketPath!);
          }

          this.socket.on("connect", () => {
            resolve();
          });

          this.socket.on("data", (data: Buffer) => {
            buffer += data.toString();

            // Process complete messages (newline-delimited JSON)
            const lines = buffer.split("\n");
            buffer = lines.pop() || "";

            for (const line of lines) {
              if (line.trim()) {
                this.handleMessage(line);
              }
            }
          });

          this.socket.on("close", () => {
            this.handleDisconnect();
          });

          this.socket.on("error", (error: Error) => {
            if (this.state === ConnectionState.CONNECTING) {
              reject(error);
            }
            this.emit("error", error);
          });

          // Connection timeout
          setTimeout(() => {
            if (this.state === ConnectionState.CONNECTING) {
              this.socket?.destroy();
              reject(new Error("Connection timeout"));
            }
          }, 10000);
        })
        .catch(reject);
    });
  }

  /**
   * Handle incoming message
   */
  private handleMessage(data: string): void {
    try {
      const message: IPCMessage = JSON.parse(data);

      // Handle events
      if (message.type === "event") {
        const event = message.payload as EventNotification;
        this.emit("event", event);
        this.emit(`event:${event.eventType}`, event.data);
        return;
      }

      // Handle responses
      const pending = this.pendingRequests.get(message.id);
      if (pending) {
        clearTimeout(pending.timeout);
        this.pendingRequests.delete(message.id);

        if (message.type === IPCMessageType.RESPONSE_SUCCESS) {
          pending.resolve(message.payload);
        } else if (message.type === IPCMessageType.RESPONSE_ERROR) {
          const errorPayload = message.payload as { error: string };
          pending.reject(new Error(errorPayload.error));
        }
      }
    } catch (_error) {
      this.emit("error", new Error(`Failed to parse message: ${data}`));
    }
  }

  /**
   * Handle disconnection
   */
  private handleDisconnect(): void {
    const wasConnected = this.state === ConnectionState.CONNECTED;
    this.stopHeartbeat();

    if (
      this.config.autoReconnect &&
      wasConnected &&
      this.reconnectAttempts < this.config.maxReconnectAttempts!
    ) {
      this.state = ConnectionState.RECONNECTING;
      this.emit("reconnecting", this.reconnectAttempts);

      this.reconnectTimer = setTimeout(
        () => {
          this.reconnectAttempts++;
          this.connect().catch(() => {
            // Reconnection failed, will retry
          });
        },
        this.config.reconnectDelay! * Math.min(this.reconnectAttempts + 1, 5),
      );
    } else {
      this.state = ConnectionState.DISCONNECTED;
      this.emit("disconnected");

      // Reject all pending requests
      for (const [id, pending] of this.pendingRequests) {
        clearTimeout(pending.timeout);
        pending.reject(new Error("Disconnected"));
        this.pendingRequests.delete(id);
      }
    }
  }

  /**
   * Send a typed request and wait for response
   */
  public async request<T extends keyof IPCTypeMap>(
    type: T,
    payload: IPCTypeMap[T]["request"],
  ): Promise<IPCTypeMap[T]["response"]> {
    if (!this.isConnected()) {
      throw new Error("Not connected");
    }

    const message = createIPCMessage(
      type as unknown as IPCMessageType,
      payload,
    );

    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        this.pendingRequests.delete(message.id);
        reject(new Error(`Request timeout: ${type}`));
      }, this.config.requestTimeout);

      this.pendingRequests.set(message.id, {
        resolve: resolve as (value: unknown) => void,
        reject,
        timeout,
      });

      this.send(message);
    });
  }

  /**
   * Send a message (no response expected)
   */
  private send(message: IPCMessage): void {
    const data = JSON.stringify(message);

    if (this.ws) {
      this.ws.send(data);
    } else if (this.socket) {
      this.socket.write(data + "\n");
    }
  }

  /**
   * Start heartbeat
   */
  private startHeartbeat(): void {
    this.heartbeatTimer = setInterval(async () => {
      try {
        await this.ping();
      } catch {
        // Ping failed, connection may be dead
        this.handleDisconnect();
      }
    }, this.config.heartbeatInterval);
  }

  /**
   * Stop heartbeat
   */
  private stopHeartbeat(): void {
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer);
      this.heartbeatTimer = null;
    }
  }

  /**
   * Disconnect from orchestrator
   */
  public async disconnect(): Promise<void> {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }

    this.config.autoReconnect = false;
    this.stopHeartbeat();

    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }

    if (this.socket) {
      this.socket.destroy();
      this.socket = null;
    }

    this.state = ConnectionState.DISCONNECTED;
    this.emit("disconnected");
  }

  // ============================================================================
  // High-level API methods
  // ============================================================================

  /**
   * Ping the orchestrator
   */
  public async ping(): Promise<{ pong: true; timestamp: number }> {
    return this.request(IPCMessageType.PING, undefined as any);
  }

  /**
   * Process a message through the cognitive system
   */
  public async processMessage(
    message: string,
    options: { chatId?: number; skipSentiment?: boolean } = {},
  ) {
    return this.request(IPCMessageType.COGNITIVE_PROCESS, {
      message,
      ...options,
    });
  }

  /**
   * Quick process - returns just the response text
   */
  public async quickProcess(message: string, chatId?: number): Promise<string> {
    const result = await this.request(IPCMessageType.COGNITIVE_QUICK_PROCESS, {
      message,
      chatId,
    });
    return result.response;
  }

  /**
   * Get cognitive state
   */
  public async getCognitiveState() {
    return this.request(IPCMessageType.COGNITIVE_GET_STATE, undefined as any);
  }

  /**
   * Get emotional state
   */
  public async getEmotionalState() {
    return this.request(
      IPCMessageType.COGNITIVE_GET_EMOTIONAL_STATE,
      undefined as any,
    );
  }

  /**
   * Update emotional state
   */
  public async updateEmotionalState(emotions: Record<string, number>) {
    return this.request(IPCMessageType.COGNITIVE_UPDATE_EMOTIONAL_STATE, {
      emotions,
    });
  }

  /**
   * Get message history
   */
  public async getHistory(limit?: number) {
    return this.request(IPCMessageType.COGNITIVE_GET_HISTORY, { limit });
  }

  /**
   * Clear message history
   */
  public async clearHistory() {
    return this.request(
      IPCMessageType.COGNITIVE_CLEAR_HISTORY,
      undefined as any,
    );
  }

  /**
   * Get system status
   */
  public async getSystemStatus() {
    return this.request(IPCMessageType.SYSTEM_STATUS, undefined as any);
  }

  /**
   * Search memories
   */
  public async searchMemories(query: string, limit?: number) {
    return this.request(IPCMessageType.MEMORY_SEARCH, { query, limit });
  }

  /**
   * Get persona info
   */
  public async getPersona() {
    return this.request(IPCMessageType.PERSONA_GET, undefined as any);
  }

  /**
   * Subscribe to events
   */
  public async subscribe(eventTypes: string[]): Promise<void> {
    for (const type of eventTypes) {
      this.subscriptions.add(type);
    }

    if (this.isConnected()) {
      await this.request(IPCMessageType.SUBSCRIBE, { eventTypes });
    }
  }

  /**
   * Unsubscribe from events
   */
  public async unsubscribe(eventTypes: string[]): Promise<void> {
    for (const type of eventTypes) {
      this.subscriptions.delete(type);
    }

    if (this.isConnected()) {
      await this.request(IPCMessageType.UNSUBSCRIBE, { eventTypes });
    }
  }

  /**
   * Get storage value
   */
  public async storageGet(key: string) {
    return this.request(IPCMessageType.STORAGE_GET, { key });
  }

  /**
   * Set storage value
   */
  public async storageSet(key: string, value: unknown) {
    return this.request(IPCMessageType.STORAGE_SET, { key, value });
  }

  /**
   * Delete storage value
   */
  public async storageDelete(key: string) {
    return this.request(IPCMessageType.STORAGE_DELETE, { key });
  }
}

/**
 * Create a pre-configured IPC client for WebSocket connections (browser/renderer)
 */
export function createBrowserClient(
  url: string = "ws://localhost:9877/ws",
): IPCClient {
  return new IPCClient({
    type: "websocket",
    webSocketUrl: url,
    autoReconnect: true,
  });
}

/**
 * Create a pre-configured IPC client for socket connections (Node.js)
 */
export function createNodeClient(
  options: { useTcp?: boolean; port?: number; socketPath?: string } = {},
): IPCClient {
  return new IPCClient({
    type: "socket",
    useTcp: options.useTcp ?? false,
    tcpPort: options.port ?? 9876,
    socketPath: options.socketPath ?? "/tmp/deep-tree-echo.sock",
    autoReconnect: true,
  });
}
