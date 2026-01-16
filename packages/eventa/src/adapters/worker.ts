/**
 * Web Worker adapter for eventa
 *
 * Enables communication with Web Workers
 */

import type { Subscription, TransportAdapter, WireMessage } from '../types.js';

/**
 * Create an eventa transport adapter for the main thread (to communicate with a worker)
 *
 * @example
 * ```typescript
 * const worker = new Worker('./worker.js', { type: 'module' });
 * const { adapter, context } = createWorkerAdapter(worker);
 *
 * // Define and invoke RPC
 * const heavyComputation = defineInvokeEventa<Result, Params>('compute');
 * const result = await context.invoke(heavyComputation, { data: [...] });
 * ```
 */
export function createWorkerAdapter(
    worker: Worker
): { adapter: TransportAdapter; context: ReturnType<typeof import('../core/context.js').createContext> } {
    let messageHandler: ((message: WireMessage) => void) | null = null;

    const workerListener = (event: MessageEvent) => {
        if (event.data && event.data.type && event.data.eventId) {
            if (messageHandler) {
                messageHandler(event.data as WireMessage);
            }
        }
    };

    worker.addEventListener('message', workerListener);

    const adapter: TransportAdapter = {
        send(message: WireMessage): void {
            worker.postMessage(message);
        },

        onMessage(handler: (message: WireMessage) => void): Subscription {
            messageHandler = handler;
            return {
                unsubscribe: () => {
                    messageHandler = null;
                    worker.removeEventListener('message', workerListener);
                },
            };
        },

        close(): void {
            worker.removeEventListener('message', workerListener);
            worker.terminate();
        },
    };

    // Create a context and attach the adapter
    const { createContext } = require('../core/context.js');
    const context = createContext({ contextId: 'worker-main' });
    context.attachTransport(adapter);

    return { adapter, context };
}

/**
 * Create an eventa transport adapter for inside a Web Worker
 *
 * Call this from within the worker script
 *
 * @example
 * ```typescript
 * // worker.js
 * import { createWorkerSelfAdapter, defineInvokeHandler } from '@deltecho/eventa/adapters/worker';
 *
 * const { context } = createWorkerSelfAdapter();
 *
 * defineInvokeHandler(context, heavyComputation, async ({ data }) => {
 *     // Perform computation
 *     return { result: processData(data) };
 * });
 * ```
 */
export function createWorkerSelfAdapter(): {
    adapter: TransportAdapter;
    context: ReturnType<typeof import('../core/context.js').createContext>;
} {
    let messageHandler: ((message: WireMessage) => void) | null = null;

    // 'self' in a worker context is the global scope
    const workerScope = self as unknown as {
        addEventListener(type: string, listener: (event: MessageEvent) => void): void;
        removeEventListener(type: string, listener: (event: MessageEvent) => void): void;
        postMessage(message: unknown): void;
    };

    const selfListener = (event: MessageEvent) => {
        if (event.data && event.data.type && event.data.eventId) {
            if (messageHandler) {
                messageHandler(event.data as WireMessage);
            }
        }
    };

    workerScope.addEventListener('message', selfListener);

    const adapter: TransportAdapter = {
        send(message: WireMessage): void {
            workerScope.postMessage(message);
        },

        onMessage(handler: (message: WireMessage) => void): Subscription {
            messageHandler = handler;
            return {
                unsubscribe: () => {
                    messageHandler = null;
                    workerScope.removeEventListener('message', selfListener);
                },
            };
        },

        close(): void {
            workerScope.removeEventListener('message', selfListener);
        },
    };

    // Create a context and attach the adapter
    const { createContext } = require('../core/context.js');
    const context = createContext({ contextId: 'worker-self' });
    context.attachTransport(adapter);

    return { adapter, context };
}

/**
 * Create a SharedWorker adapter
 */
export function createSharedWorkerAdapter(
    port: MessagePort
): { adapter: TransportAdapter; context: ReturnType<typeof import('../core/context.js').createContext> } {
    let messageHandler: ((message: WireMessage) => void) | null = null;

    const portListener = (event: MessageEvent) => {
        if (event.data && event.data.type && event.data.eventId) {
            if (messageHandler) {
                messageHandler(event.data as WireMessage);
            }
        }
    };

    port.addEventListener('message', portListener);
    port.start();

    const adapter: TransportAdapter = {
        send(message: WireMessage): void {
            port.postMessage(message);
        },

        onMessage(handler: (message: WireMessage) => void): Subscription {
            messageHandler = handler;
            return {
                unsubscribe: () => {
                    messageHandler = null;
                    port.removeEventListener('message', portListener);
                },
            };
        },

        close(): void {
            port.removeEventListener('message', portListener);
            port.close();
        },
    };

    const { createContext } = require('../core/context.js');
    const context = createContext({ contextId: 'shared-worker' });
    context.attachTransport(adapter);

    return { adapter, context };
}
