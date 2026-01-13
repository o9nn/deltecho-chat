import { MemoryStorage } from '../memory/storage.js';
import * as net from 'net';
import { EventEmitter } from 'events';
import { getLogger } from '../utils/logger.js';

const logger = getLogger('OrchestratorStorageAdapter');

/**
 * IPC message types (must match orchestrator's IPCMessageType)
 */
enum IPCMessageType {
  REQUEST_STORAGE_GET = 'request_storage_get',
  REQUEST_STORAGE_SET = 'request_storage_set',
  REQUEST_STORAGE_DELETE = 'request_storage_delete',
  REQUEST_STORAGE_CLEAR = 'request_storage_clear',
  REQUEST_STORAGE_KEYS = 'request_storage_keys',
  RESPONSE_SUCCESS = 'response_success',
  RESPONSE_ERROR = 'response_error',
  PING = 'ping',
  PONG = 'pong',
}

/**
 * IPC message structure
 */
interface IPCMessage {
  id: string;
  type: IPCMessageType;
  payload?: any;
  timestamp: number;
}

/**
 * Storage adapter that communicates with Deep Tree Echo orchestrator via IPC
 *
 * This adapter enables desktop applications to store cognitive data (memories,
 * persona state, etc.) through the orchestrator daemon, providing centralized
 * storage that persists across application restarts.
 *
 * @example
 * ```typescript
 * // In desktop app (Electron/Tauri)
 * const storage = new OrchestratorStorageAdapter({
 *   socketPath: '/tmp/deep-tree-echo.sock'
 * });
 * await storage.connect();
 *
 * const ragMemory = new RAGMemoryStore(storage);
 * ```
 */
export class OrchestratorStorageAdapter extends EventEmitter implements MemoryStorage {
  private socket: net.Socket | null = null;
  private connected: boolean = false;
  private reconnectInterval: number = 5000;
  private reconnectTimer: NodeJS.Timeout | null = null;
  private messageQueue: Map<
    string,
    { resolve: Function; reject: Function; timeout: NodeJS.Timeout }
  > = new Map();
  private readonly socketPath: string;
  private readonly storagePrefix: string;
  private buffer: string = '';

  constructor(options: { socketPath?: string; storagePrefix?: string } = {}) {
    super();
    this.socketPath = options.socketPath || '/tmp/deep-tree-echo.sock';
    this.storagePrefix = options.storagePrefix || 'deltecho';
  }

  /**
   * Connect to the orchestrator IPC server
   */
  async connect(): Promise<void> {
    return new Promise((resolve, reject) => {
      if (this.connected) {
        resolve();
        return;
      }

      this.socket = net.createConnection(this.socketPath);

      this.socket.on('connect', () => {
        this.connected = true;
        this.emit('connected');
        logger.info(`Connected to orchestrator at ${this.socketPath}`);

        // Send initial ping
        this.sendPing().catch((err) => logger.error('Ping failed:', err));

        resolve();
      });

      this.socket.on('data', (data: Buffer) => {
        this.handleData(data);
      });

      this.socket.on('error', (error: Error) => {
        logger.error('Socket error:', error);
        this.emit('error', error);
        if (!this.connected) {
          reject(error);
        }
      });

      this.socket.on('close', () => {
        logger.info('Disconnected from orchestrator');
        this.connected = false;
        this.socket = null;
        this.emit('disconnected');
        this.scheduleReconnect();
      });

      // Timeout for initial connection
      setTimeout(() => {
        if (!this.connected) {
          reject(new Error('Connection timeout'));
        }
      }, 5000);
    });
  }

  /**
   * Disconnect from the orchestrator
   */
  async disconnect(): Promise<void> {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }

    if (this.socket) {
      this.socket.destroy();
      this.socket = null;
    }

    this.connected = false;

    // Reject all pending messages
    for (const [id, pending] of this.messageQueue.entries()) {
      clearTimeout(pending.timeout);
      pending.reject(new Error('Disconnected'));
      this.messageQueue.delete(id);
    }
  }

  /**
   * Schedule automatic reconnection
   */
  private scheduleReconnect(): void {
    if (this.reconnectTimer) {
      return;
    }

    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = null;
      logger.info('Attempting to reconnect...');
      this.connect().catch((error) => {
        logger.error('Reconnection failed:', error);
      });
    }, this.reconnectInterval);
  }

  /**
   * Handle incoming data from socket
   */
  private handleData(data: Buffer): void {
    // Append to buffer
    this.buffer += data.toString();

    // Try to parse complete messages (newline-delimited JSON)
    let newlineIndex: number;
    while ((newlineIndex = this.buffer.indexOf('\n')) !== -1) {
      const line = this.buffer.slice(0, newlineIndex);
      this.buffer = this.buffer.slice(newlineIndex + 1);

      if (line.trim()) {
        try {
          const message: IPCMessage = JSON.parse(line);
          this.handleMessage(message);
        } catch (error) {
          logger.error('Failed to parse message:', error);
        }
      }
    }
  }

  /**
   * Handle a parsed IPC message
   */
  private handleMessage(message: IPCMessage): void {
    // Handle pong responses
    if (message.type === IPCMessageType.PONG) {
      this.emit('pong', message.payload);
      return;
    }

    // Handle responses to our requests
    const pending = this.messageQueue.get(message.id);
    if (pending) {
      clearTimeout(pending.timeout);
      this.messageQueue.delete(message.id);

      if (message.type === IPCMessageType.RESPONSE_SUCCESS) {
        pending.resolve(message.payload);
      } else if (message.type === IPCMessageType.RESPONSE_ERROR) {
        pending.reject(new Error(message.payload?.message || 'Request failed'));
      }
    }
  }

  /**
   * Send a message to the orchestrator
   */
  private async sendMessage(
    type: IPCMessageType,
    payload?: any,
    timeoutMs: number = 5000
  ): Promise<any> {
    if (!this.connected || !this.socket) {
      throw new Error('Not connected to orchestrator');
    }

    const message: IPCMessage = {
      id: this.generateMessageId(),
      type,
      payload,
      timestamp: Date.now(),
    };

    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        this.messageQueue.delete(message.id);
        reject(new Error('Request timeout'));
      }, timeoutMs);

      this.messageQueue.set(message.id, { resolve, reject, timeout });

      // Send as newline-delimited JSON
      const data = JSON.stringify(message) + '\n';
      this.socket!.write(data, (error) => {
        if (error) {
          clearTimeout(timeout);
          this.messageQueue.delete(message.id);
          reject(error);
        }
      });
    });
  }

  /**
   * Send a ping to the orchestrator
   */
  private async sendPing(): Promise<void> {
    try {
      await this.sendMessage(IPCMessageType.PING, {}, 2000);
    } catch (error) {
      logger.error('Ping failed:', error);
    }
  }

  /**
   * Generate a unique message ID
   */
  private generateMessageId(): string {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Load data from orchestrator storage
   */
  async load(key: string): Promise<string | undefined> {
    try {
      const prefixedKey = `${this.storagePrefix}:${key}`;
      const response = await this.sendMessage(IPCMessageType.REQUEST_STORAGE_GET, {
        key: prefixedKey,
      });
      return response?.value ?? undefined;
    } catch (error) {
      logger.error(`Failed to load key ${key}:`, error);
      return undefined;
    }
  }

  /**
   * Save data to orchestrator storage
   */
  async save(key: string, value: string): Promise<void> {
    try {
      const prefixedKey = `${this.storagePrefix}:${key}`;
      await this.sendMessage(IPCMessageType.REQUEST_STORAGE_SET, { key: prefixedKey, value });
    } catch (error) {
      logger.error(`Failed to save key ${key}:`, error);
      throw error;
    }
  }

  /**
   * Delete data from storage
   */
  async delete(key: string): Promise<void> {
    try {
      const prefixedKey = `${this.storagePrefix}:${key}`;
      await this.sendMessage(IPCMessageType.REQUEST_STORAGE_DELETE, { key: prefixedKey });
    } catch (error) {
      logger.error(`Failed to delete key ${key}:`, error);
      throw error;
    }
  }

  /**
   * Clear all data with the current prefix
   */
  async clear(): Promise<void> {
    try {
      await this.sendMessage(IPCMessageType.REQUEST_STORAGE_CLEAR, { prefix: this.storagePrefix });
    } catch (error) {
      logger.error('Failed to clear storage:', error);
      throw error;
    }
  }

  /**
   * List all keys with the current prefix
   */
  async keys(): Promise<string[]> {
    try {
      const response = await this.sendMessage(IPCMessageType.REQUEST_STORAGE_KEYS, {
        prefix: this.storagePrefix,
      });
      const allKeys = response?.keys || [];
      return allKeys.map((key: string) => key.replace(`${this.storagePrefix}:`, ''));
    } catch (error) {
      logger.error('Failed to list keys:', error);
      return [];
    }
  }
}
