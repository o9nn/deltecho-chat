import { getLogger } from 'deep-tree-echo-core';
import * as net from 'net';
import * as fs from 'fs';
import * as path from 'path';
import { EventEmitter } from 'events';
import { StorageManager } from './storage-manager.js';

const log = getLogger('deep-tree-echo-orchestrator/IPCServer');

/**
 * IPC message types
 */
export enum IPCMessageType {
  // Request types
  REQUEST_COGNITIVE = 'request_cognitive',
  REQUEST_MEMORY = 'request_memory',
  REQUEST_PERSONA = 'request_persona',
  REQUEST_STATUS = 'request_status',
  REQUEST_CONFIG = 'request_config',

  // Storage request types
  REQUEST_STORAGE_GET = 'request_storage_get',
  REQUEST_STORAGE_SET = 'request_storage_set',
  REQUEST_STORAGE_DELETE = 'request_storage_delete',
  REQUEST_STORAGE_CLEAR = 'request_storage_clear',
  REQUEST_STORAGE_KEYS = 'request_storage_keys',

  // Response types
  RESPONSE_SUCCESS = 'response_success',
  RESPONSE_ERROR = 'response_error',

  // Event types
  EVENT_MESSAGE = 'event_message',
  EVENT_STATE_CHANGE = 'event_state_change',
  EVENT_ERROR = 'event_error',

  // Control types
  PING = 'ping',
  PONG = 'pong',
  SUBSCRIBE = 'subscribe',
  UNSUBSCRIBE = 'unsubscribe',
}

/**
 * IPC message structure
 */
export interface IPCMessage {
  id: string;
  type: IPCMessageType;
  payload?: any;
  timestamp: number;
}

/**
 * IPC request handler function type
 */
export type IPCRequestHandler = (payload: any) => Promise<any>;

/**
 * IPC Server configuration
 */
export interface IPCServerConfig {
  socketPath?: string;
  tcpPort?: number;
  useTcp?: boolean;
  maxConnections?: number;
}

const DEFAULT_CONFIG: IPCServerConfig = {
  socketPath: '/tmp/deep-tree-echo.sock',
  tcpPort: 9876,
  useTcp: false,
  maxConnections: 10,
};

/**
 * IPC Server for communication with desktop applications
 * Provides a protocol for desktop apps to interact with the orchestrator
 */
export class IPCServer extends EventEmitter {
  private config: IPCServerConfig;
  private server: net.Server | null = null;
  private clients: Map<string, net.Socket> = new Map();
  private handlers: Map<IPCMessageType, IPCRequestHandler> = new Map();
  private subscriptions: Map<string, Set<string>> = new Map(); // eventType -> clientIds
  private running: boolean = false;
  private clientIdCounter: number = 0;
  private storageManager: StorageManager;

  constructor(config: Partial<IPCServerConfig> = {}) {
    super();
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.storageManager = new StorageManager();
    this.setupDefaultHandlers();
  }

  /**
   * Set up default request handlers
   */
  private setupDefaultHandlers(): void {
    // Ping handler
    this.registerHandler(IPCMessageType.PING, async () => {
      return { status: 'ok', timestamp: Date.now() };
    });

    // Status handler
    this.registerHandler(IPCMessageType.REQUEST_STATUS, async () => {
      return {
        running: this.running,
        clients: this.clients.size,
        uptime: process.uptime(),
      };
    });

    // Subscribe handler
    this.registerHandler(IPCMessageType.SUBSCRIBE, async (payload) => {
      const { clientId, eventType } = payload;
      if (!this.subscriptions.has(eventType)) {
        this.subscriptions.set(eventType, new Set());
      }
      this.subscriptions.get(eventType)!.add(clientId);
      return { subscribed: true, eventType };
    });

    // Unsubscribe handler
    this.registerHandler(IPCMessageType.UNSUBSCRIBE, async (payload) => {
      const { clientId, eventType } = payload;
      this.subscriptions.get(eventType)?.delete(clientId);
      return { unsubscribed: true, eventType };
    });

    // Storage handlers
    this.registerHandler(IPCMessageType.REQUEST_STORAGE_GET, async (payload) => {
      const { key } = payload;
      const value = await this.storageManager.get(key);
      return { value };
    });

    this.registerHandler(IPCMessageType.REQUEST_STORAGE_SET, async (payload) => {
      const { key, value } = payload;
      await this.storageManager.set(key, value);
      return { success: true };
    });

    this.registerHandler(IPCMessageType.REQUEST_STORAGE_DELETE, async (payload) => {
      const { key } = payload;
      await this.storageManager.delete(key);
      return { success: true };
    });

    this.registerHandler(IPCMessageType.REQUEST_STORAGE_CLEAR, async (payload) => {
      const { prefix } = payload;
      await this.storageManager.clear(prefix);
      return { success: true };
    });

    this.registerHandler(IPCMessageType.REQUEST_STORAGE_KEYS, async (payload) => {
      const { prefix } = payload;
      const keys = await this.storageManager.keys(prefix);
      return { keys };
    });
  }

  /**
   * Register a request handler
   */
  public registerHandler(type: IPCMessageType, handler: IPCRequestHandler): void {
    this.handlers.set(type, handler);
    log.info(`Registered handler for ${type}`);
  }

  /**
   * Start the IPC server
   */
  public async start(): Promise<void> {
    if (this.running) {
      log.warn('IPC server is already running');
      return;
    }

    log.info('Starting IPC server...');

    return new Promise((resolve, reject) => {
      try {
        if (this.config.useTcp) {
          // TCP server
          this.server = net.createServer((socket) => this.handleConnection(socket));
          this.server.listen(this.config.tcpPort, () => {
            log.info(`IPC server listening on TCP port ${this.config.tcpPort}`);
            this.running = true;
            resolve();
          });
        } else {
          // Unix socket server
          const socketPath = this.config.socketPath!;

          // Remove existing socket file if it exists
          if (fs.existsSync(socketPath)) {
            fs.unlinkSync(socketPath);
          }

          // Ensure directory exists
          const socketDir = path.dirname(socketPath);
          if (!fs.existsSync(socketDir)) {
            fs.mkdirSync(socketDir, { recursive: true });
          }

          this.server = net.createServer((socket) => this.handleConnection(socket));
          this.server.listen(socketPath, () => {
            log.info(`IPC server listening on socket ${socketPath}`);
            this.running = true;
            resolve();
          });
        }

        this.server.on('error', (error) => {
          log.error('IPC server error:', error);
          this.emit('error', error);
          reject(error);
        });

        this.server.on('close', () => {
          log.info('IPC server closed');
          this.running = false;
        });
      } catch (error) {
        log.error('Failed to start IPC server:', error);
        reject(error);
      }
    });
  }

  /**
   * Handle new client connection
   */
  private handleConnection(socket: net.Socket): void {
    const clientId = `client_${++this.clientIdCounter}`;

    if (this.clients.size >= this.config.maxConnections!) {
      log.warn(`Max connections reached, rejecting client ${clientId}`);
      socket.end();
      return;
    }

    log.info(`Client connected: ${clientId}`);
    this.clients.set(clientId, socket);
    this.emit('client_connected', { clientId });

    let buffer = '';

    socket.on('data', async (data) => {
      buffer += data.toString();

      // Process complete messages (newline-delimited JSON)
      const lines = buffer.split('\n');
      buffer = lines.pop() || ''; // Keep incomplete line in buffer

      for (const line of lines) {
        if (line.trim()) {
          try {
            const message: IPCMessage = JSON.parse(line);
            await this.handleMessage(clientId, message, socket);
          } catch (error) {
            log.error(`Failed to parse message from ${clientId}:`, error);
            this.sendError(socket, 'parse_error', 'Invalid JSON message');
          }
        }
      }
    });

    socket.on('close', () => {
      log.info(`Client disconnected: ${clientId}`);
      this.clients.delete(clientId);

      // Remove from all subscriptions
      for (const subscribers of this.subscriptions.values()) {
        subscribers.delete(clientId);
      }

      this.emit('client_disconnected', { clientId });
    });

    socket.on('error', (error) => {
      log.error(`Client ${clientId} error:`, error);
      this.clients.delete(clientId);
    });
  }

  /**
   * Handle incoming message
   */
  private async handleMessage(
    clientId: string,
    message: IPCMessage,
    socket: net.Socket
  ): Promise<void> {
    log.debug(`Received message from ${clientId}: ${message.type}`);

    const handler = this.handlers.get(message.type);

    if (!handler) {
      this.sendError(socket, message.id, `Unknown message type: ${message.type}`);
      return;
    }

    try {
      const result = await handler({ ...message.payload, clientId });
      this.sendResponse(socket, message.id, IPCMessageType.RESPONSE_SUCCESS, result);
    } catch (error) {
      log.error(`Handler error for ${message.type}:`, error);
      this.sendError(socket, message.id, (error as Error).message);
    }
  }

  /**
   * Send response to client
   */
  private sendResponse(
    socket: net.Socket,
    requestId: string,
    type: IPCMessageType,
    payload: any
  ): void {
    const response: IPCMessage = {
      id: requestId,
      type,
      payload,
      timestamp: Date.now(),
    };
    socket.write(JSON.stringify(response) + '\n');
  }

  /**
   * Send error response to client
   */
  private sendError(socket: net.Socket, requestId: string, message: string): void {
    this.sendResponse(socket, requestId, IPCMessageType.RESPONSE_ERROR, { error: message });
  }

  /**
   * Broadcast event to subscribed clients
   */
  public broadcast(eventType: string, payload: any): void {
    const subscribers = this.subscriptions.get(eventType);
    if (!subscribers || subscribers.size === 0) return;

    const message: IPCMessage = {
      id: `broadcast_${Date.now()}`,
      type: IPCMessageType.EVENT_MESSAGE,
      payload: { eventType, data: payload },
      timestamp: Date.now(),
    };

    const messageStr = JSON.stringify(message) + '\n';

    for (const clientId of subscribers) {
      const socket = this.clients.get(clientId);
      if (socket && !socket.destroyed) {
        socket.write(messageStr);
      }
    }
  }

  /**
   * Send message to specific client
   */
  public sendToClient(clientId: string, type: IPCMessageType, payload: any): boolean {
    const socket = this.clients.get(clientId);
    if (!socket || socket.destroyed) return false;

    const message: IPCMessage = {
      id: `msg_${Date.now()}`,
      type,
      payload,
      timestamp: Date.now(),
    };

    socket.write(JSON.stringify(message) + '\n');
    return true;
  }

  /**
   * Stop the IPC server
   */
  public async stop(): Promise<void> {
    if (!this.running) return;

    log.info('Stopping IPC server...');

    return new Promise((resolve) => {
      // Close all client connections
      for (const [clientId, socket] of this.clients) {
        log.debug(`Closing connection to ${clientId}`);
        socket.end();
      }
      this.clients.clear();
      this.subscriptions.clear();

      if (this.server) {
        this.server.close(() => {
          // Clean up socket file
          if (!this.config.useTcp && this.config.socketPath) {
            try {
              if (fs.existsSync(this.config.socketPath)) {
                fs.unlinkSync(this.config.socketPath);
              }
            } catch (error) {
              log.warn('Failed to clean up socket file:', error);
            }
          }

          this.server = null;
          this.running = false;
          log.info('IPC server stopped');
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
   * Get list of connected client IDs
   */
  public getClientIds(): string[] {
    return Array.from(this.clients.keys());
  }
}
