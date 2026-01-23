/* eslint-disable no-console */
/**
 * WebSocket adapter for eventa
 *
 * Enables cross-boundary communication via WebSocket
 */

import type { Subscription, TransportAdapter, WireMessage } from "../types.js";

export interface WebSocketAdapterOptions {
  /** Reconnect on disconnect */
  autoReconnect?: boolean;
  /** Reconnect delay in ms */
  reconnectDelay?: number;
  /** Maximum reconnect attempts */
  maxReconnectAttempts?: number;
}

/**
 * Create a WebSocket transport adapter for browser/Node.js clients
 */
export function createWebSocketAdapter(
  urlOrSocket: string | WebSocket,
  options: WebSocketAdapterOptions = {},
): { adapter: TransportAdapter; ready: Promise<void>; close: () => void } {
  const {
    autoReconnect = true,
    reconnectDelay = 1000,
    maxReconnectAttempts = 5,
  } = options;

  let socket: WebSocket;
  let reconnectAttempts = 0;
  let messageHandler: ((message: WireMessage) => void) | null = null;
  let closed = false;

  const messageQueue: WireMessage[] = [];

  function connect(): Promise<void> {
    return new Promise((resolve, reject) => {
      if (typeof urlOrSocket === "string") {
        socket = new WebSocket(urlOrSocket);
      } else {
        socket = urlOrSocket;
      }

      socket.onopen = () => {
        reconnectAttempts = 0;
        // Flush queued messages
        while (messageQueue.length > 0) {
          const msg = messageQueue.shift()!;
          socket.send(JSON.stringify(msg));
        }
        resolve();
      };

      socket.onerror = (error) => {
        console.error("[eventa:websocket] Connection error:", error);
        reject(error);
      };

      socket.onclose = () => {
        if (
          !closed &&
          autoReconnect &&
          reconnectAttempts < maxReconnectAttempts
        ) {
          reconnectAttempts++;
          console.log(
            `[eventa:websocket] Reconnecting (attempt ${reconnectAttempts}/${maxReconnectAttempts})...`,
          );
          setTimeout(() => {
            connect().catch(console.error);
          }, reconnectDelay * reconnectAttempts);
        }
      };

      socket.onmessage = (event) => {
        try {
          const message = JSON.parse(event.data as string) as WireMessage;
          if (messageHandler) {
            messageHandler(message);
          }
        } catch (error) {
          console.error("[eventa:websocket] Failed to parse message:", error);
        }
      };
    });
  }

  const adapter: TransportAdapter = {
    send(message: WireMessage): void {
      if (socket.readyState === WebSocket.OPEN) {
        socket.send(JSON.stringify(message));
      } else {
        // Queue message for when connection is ready
        messageQueue.push(message);
      }
    },

    onMessage(handler: (message: WireMessage) => void): Subscription {
      messageHandler = handler;
      return {
        unsubscribe: () => {
          messageHandler = null;
        },
      };
    },

    close(): void {
      closed = true;
      socket.close();
    },
  };

  const ready = connect();

  return {
    adapter,
    ready,
    close: () => {
      closed = true;
      socket?.close();
    },
  };
}

/**
 * Create a WebSocket server adapter for Node.js
 *
 * This is a factory that creates adapters for each connected client
 */
export function createWebSocketServerAdapter(wss: {
  on: (event: string, handler: (socket: WebSocket) => void) => void;
}): {
  onConnection: (
    handler: (adapter: TransportAdapter, socket: WebSocket) => void,
  ) => void;
  broadcast: (message: WireMessage) => void;
  close: () => void;
} {
  const clients = new Set<WebSocket>();
  const handlers = new Set<
    (adapter: TransportAdapter, socket: WebSocket) => void
  >();

  wss.on("connection", (socket: WebSocket) => {
    clients.add(socket);

    const adapter: TransportAdapter = {
      send(message: WireMessage): void {
        if ((socket as unknown as { readyState: number }).readyState === 1) {
          (socket as unknown as { send: (data: string) => void }).send(
            JSON.stringify(message),
          );
        }
      },

      onMessage(handler: (message: WireMessage) => void): Subscription {
        const listener = (event: { data: string } | string) => {
          try {
            const data = typeof event === "string" ? event : event.data;
            const message = JSON.parse(data) as WireMessage;
            handler(message);
          } catch (error) {
            console.error("[eventa:ws-server] Failed to parse message:", error);
          }
        };

        (
          socket as unknown as {
            on: (event: string, handler: (data: string) => void) => void;
          }
        ).on("message", listener);

        return {
          unsubscribe: () => {
            // Most WS libraries don't have removeListener, so we rely on socket close
          },
        };
      },

      close(): void {
        (socket as unknown as { close: () => void }).close();
        clients.delete(socket);
      },
    };

    // Handle disconnect
    (
      socket as unknown as { on: (event: string, handler: () => void) => void }
    ).on("close", () => {
      clients.delete(socket);
    });

    // Notify handlers
    for (const handler of handlers) {
      handler(adapter, socket);
    }
  });

  return {
    onConnection(
      handler: (adapter: TransportAdapter, socket: WebSocket) => void,
    ): void {
      handlers.add(handler);
    },

    broadcast(message: WireMessage): void {
      const data = JSON.stringify(message);
      for (const client of clients) {
        if ((client as unknown as { readyState: number }).readyState === 1) {
          (client as unknown as { send: (data: string) => void }).send(data);
        }
      }
    },

    close(): void {
      for (const client of clients) {
        (client as unknown as { close: () => void }).close();
      }
      clients.clear();
    },
  };
}
