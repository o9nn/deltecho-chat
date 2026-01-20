/**
 * Electron Renderer Process adapter for eventa
 *
 * Enables communication from renderer to main process
 */

import type {
  Subscription,
  TransportAdapter,
  WireMessage,
} from "../../types.js";

/**
 * Electron IPC Renderer interface (minimal)
 */
export interface ElectronIpcRenderer {
  send(channel: string, ...args: unknown[]): void;
  on(
    channel: string,
    listener: (event: unknown, ...args: unknown[]) => void,
  ): void;
  removeListener(
    channel: string,
    listener: (event: unknown, ...args: unknown[]) => void,
  ): void;
}

const EVENTA_CHANNEL = "eventa:message";

/**
 * Create an eventa transport adapter for Electron renderer process
 *
 * @example
 * ```typescript
 * // In preload.js or renderer.js
 * import { createContext } from '@deltecho/eventa';
 * import { createRendererAdapter } from '@deltecho/eventa/adapters/electron/renderer';
 * import { ipcRenderer } from 'electron';
 *
 * const { adapter, context } = createRendererAdapter(ipcRenderer);
 *
 * // Now you can use the context
 * context.on(someEvent, (envelope) => {
 *     console.log('Received:', envelope.body);
 * });
 * ```
 */
export function createRendererAdapter(ipcRenderer: ElectronIpcRenderer): {
  adapter: TransportAdapter;
} {
  let messageHandler: ((message: WireMessage) => void) | null = null;

  const ipcListener = (_event: unknown, ...args: unknown[]) => {
    const message = args[0] as WireMessage;
    if (messageHandler && message) {
      messageHandler(message);
    }
  };

  ipcRenderer.on(EVENTA_CHANNEL, ipcListener);

  const adapter: TransportAdapter = {
    send(message: WireMessage): void {
      ipcRenderer.send(EVENTA_CHANNEL, message);
    },

    onMessage(handler: (message: WireMessage) => void): Subscription {
      messageHandler = handler;
      return {
        unsubscribe: () => {
          messageHandler = null;
          ipcRenderer.removeListener(EVENTA_CHANNEL, ipcListener);
        },
      };
    },

    close(): void {
      ipcRenderer.removeListener(EVENTA_CHANNEL, ipcListener);
    },
  };

  return { adapter };
}

/**
 * Context bridge helper for exposing eventa to the renderer
 *
 * Use this in your preload script to safely expose eventa APIs
 */
export function createContextBridgeAPI(ipcRenderer: ElectronIpcRenderer): {
  emit: (eventId: string, payload: unknown) => void;
  invoke: (eventId: string, request: unknown) => Promise<unknown>;
  on: (eventId: string, callback: (payload: unknown) => void) => () => void;
} {
  let callId = 0;
  const pendingCalls = new Map<
    string,
    { resolve: (v: unknown) => void; reject: (e: Error) => void }
  >();
  const listeners = new Map<string, Set<(payload: unknown) => void>>();

  ipcRenderer.on(EVENTA_CHANNEL, (_event, ...args: unknown[]) => {
    const message = args[0] as WireMessage;
    if (message.type === "invoke-response" || message.type === "invoke-error") {
      const pending = pendingCalls.get(message.correlationId);
      if (pending) {
        pendingCalls.delete(message.correlationId);
        if (message.type === "invoke-response") {
          pending.resolve(message.payload);
        } else {
          const err = message.payload as { message: string };
          pending.reject(new Error(err.message));
        }
      }
    } else if (message.type === "event") {
      const eventListeners = listeners.get(message.eventId);
      if (eventListeners) {
        for (const listener of eventListeners) {
          listener(message.payload);
        }
      }
    }
  });

  return {
    emit(eventId: string, payload: unknown): void {
      const message: WireMessage = {
        type: "event",
        eventId,
        correlationId: "",
        payload,
        timestamp: Date.now(),
      };
      ipcRenderer.send(EVENTA_CHANNEL, message);
    },

    invoke(eventId: string, request: unknown): Promise<unknown> {
      return new Promise((resolve, reject) => {
        const correlationId = `r_${++callId}_${Date.now()}`;
        pendingCalls.set(correlationId, { resolve, reject });

        const message: WireMessage = {
          type: "invoke-request",
          eventId,
          correlationId,
          payload: request,
          timestamp: Date.now(),
        };
        ipcRenderer.send(EVENTA_CHANNEL, message);
      });
    },

    on(eventId: string, callback: (payload: unknown) => void): () => void {
      if (!listeners.has(eventId)) {
        listeners.set(eventId, new Set());
      }
      listeners.get(eventId)!.add(callback);

      return () => {
        listeners.get(eventId)?.delete(callback);
      };
    },
  };
}
