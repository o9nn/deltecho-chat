/**
 * Event context - the channel that bridges peers
 *
 * Context is the core abstraction that allows events to flow
 * between different parts of the application
 */

import type {
    ContextOptions,
    EventDefinition,
    EventEnvelope,
    EventId,
    EventListener,
    InvokeEventDefinition,
    InvokeHandler,
    PendingCall,
    StreamHandler,
    Subscription,
    TransportAdapter,
    WireMessage,
} from '../types.js';

/**
 * Event context for type-safe event communication
 */
export class EventContext {
    private listeners = new Map<EventId, Set<EventListener<unknown>>>();
    private invokeHandlers = new Map<EventId, InvokeHandler<unknown, unknown>>();
    private streamHandlers = new Map<EventId, StreamHandler<unknown, unknown>>();
    private pendingCalls = new Map<string, PendingCall>();
    private transport?: TransportAdapter;
    private readonly contextId: string;
    private readonly rpcTimeout: number;
    private readonly debug: boolean;

    constructor(options: ContextOptions = {}) {
        this.contextId = options.contextId || `ctx_${Date.now().toString(36)}`;
        this.rpcTimeout = options.rpcTimeout || 30000;
        this.debug = options.debug || false;
    }

    /**
     * Attach a transport adapter for cross-boundary communication
     */
    attachTransport(adapter: TransportAdapter): Subscription {
        this.transport = adapter;

        const sub = adapter.onMessage((message) => {
            this.handleWireMessage(message);
        });

        return {
            unsubscribe: () => {
                sub.unsubscribe();
                this.transport = undefined;
            },
        };
    }

    /**
     * Emit an event to all listeners
     */
    emit<TPayload>(event: EventDefinition<TPayload>, payload: TPayload): void {
        const envelope: EventEnvelope<TPayload> = {
            eventId: event.id,
            body: payload,
            timestamp: Date.now(),
        };

        this.log('emit', event.id, payload);

        // Notify local listeners
        const listeners = this.listeners.get(event.id);
        if (listeners) {
            for (const listener of listeners) {
                try {
                    listener(envelope as EventEnvelope<unknown>);
                } catch (error) {
                    console.error(`[eventa] Error in listener for ${event.id}:`, error);
                }
            }
        }

        // Send over transport if attached
        if (this.transport) {
            const wireMessage: WireMessage = {
                type: 'event',
                eventId: event.id,
                correlationId: '',
                payload,
                timestamp: envelope.timestamp,
            };
            this.transport.send(wireMessage);
        }
    }

    /**
     * Subscribe to an event
     */
    on<TPayload>(
        event: EventDefinition<TPayload>,
        listener: EventListener<TPayload>
    ): Subscription {
        if (!this.listeners.has(event.id)) {
            this.listeners.set(event.id, new Set());
        }

        const listeners = this.listeners.get(event.id)!;
        listeners.add(listener as EventListener<unknown>);

        this.log('on', event.id);

        return {
            unsubscribe: () => {
                listeners.delete(listener as EventListener<unknown>);
                if (listeners.size === 0) {
                    this.listeners.delete(event.id);
                }
            },
        };
    }

    /**
     * Subscribe to an event for a single occurrence
     */
    once<TPayload>(
        event: EventDefinition<TPayload>,
        listener: EventListener<TPayload>
    ): Subscription {
        const sub = this.on(event, (envelope) => {
            sub.unsubscribe();
            listener(envelope);
        });
        return sub;
    }

    /**
     * Register a handler for RPC invocations
     */
    registerHandler<TResponse, TRequest>(
        event: InvokeEventDefinition<TResponse, TRequest>,
        handler: InvokeHandler<TResponse, TRequest>
    ): Subscription {
        this.invokeHandlers.set(event.id, handler as InvokeHandler<unknown, unknown>);
        this.log('registerHandler', event.id);

        return {
            unsubscribe: () => {
                this.invokeHandlers.delete(event.id);
            },
        };
    }

    /**
     * Register a stream handler for multi-response RPC
     */
    registerStreamHandler<TResponse, TRequest>(
        event: InvokeEventDefinition<TResponse, TRequest>,
        handler: StreamHandler<TResponse, TRequest>
    ): Subscription {
        this.streamHandlers.set(event.id, handler as StreamHandler<unknown, unknown>);
        this.log('registerStreamHandler', event.id);

        return {
            unsubscribe: () => {
                this.streamHandlers.delete(event.id);
            },
        };
    }

    /**
     * Invoke an RPC call and wait for response
     */
    async invoke<TResponse, TRequest>(
        event: InvokeEventDefinition<TResponse, TRequest>,
        request: TRequest
    ): Promise<TResponse> {
        const correlationId = `${this.contextId}_${Date.now()}_${Math.random().toString(36).slice(2)}`;

        this.log('invoke', event.id, request);

        // Check for local handler first
        const handler = this.invokeHandlers.get(event.id);
        if (handler) {
            const envelope: EventEnvelope<TRequest> = {
                eventId: event.id,
                body: request,
                timestamp: Date.now(),
                correlationId,
            };
            return handler(request, envelope) as Promise<TResponse>;
        }

        // Use transport for remote invocation
        if (!this.transport) {
            throw new Error(`No handler registered for ${event.id} and no transport attached`);
        }

        return new Promise<TResponse>((resolve, reject) => {
            const timeout = setTimeout(() => {
                this.pendingCalls.delete(correlationId);
                reject(new Error(`RPC call ${event.id} timed out after ${this.rpcTimeout}ms`));
            }, this.rpcTimeout);

            this.pendingCalls.set(correlationId, {
                resolve: resolve as (value: unknown) => void,
                reject,
                timeout,
            });

            const wireMessage: WireMessage = {
                type: 'invoke-request',
                eventId: event.id,
                correlationId,
                payload: request,
                timestamp: Date.now(),
            };

            this.transport!.send(wireMessage);
        });
    }

    /**
     * Handle incoming wire messages
     */
    private async handleWireMessage(message: WireMessage): Promise<void> {
        this.log('handleWireMessage', message.type, message.eventId);

        switch (message.type) {
            case 'event': {
                const listeners = this.listeners.get(message.eventId as EventId);
                if (listeners) {
                    const envelope: EventEnvelope = {
                        eventId: message.eventId as EventId,
                        body: message.payload,
                        timestamp: message.timestamp,
                        correlationId: message.correlationId,
                    };
                    for (const listener of listeners) {
                        try {
                            await listener(envelope);
                        } catch (error) {
                            console.error(`[eventa] Error in listener:`, error);
                        }
                    }
                }
                break;
            }

            case 'invoke-request': {
                const handler = this.invokeHandlers.get(message.eventId as EventId);
                if (handler && this.transport) {
                    try {
                        const envelope: EventEnvelope = {
                            eventId: message.eventId as EventId,
                            body: message.payload,
                            timestamp: message.timestamp,
                            correlationId: message.correlationId,
                        };
                        const result = await handler(message.payload, envelope);
                        this.transport.send({
                            type: 'invoke-response',
                            eventId: message.eventId,
                            correlationId: message.correlationId,
                            payload: result,
                            timestamp: Date.now(),
                        });
                    } catch (error) {
                        this.transport.send({
                            type: 'invoke-error',
                            eventId: message.eventId,
                            correlationId: message.correlationId,
                            payload: {
                                message: error instanceof Error ? error.message : String(error),
                                stack: error instanceof Error ? error.stack : undefined,
                            },
                            timestamp: Date.now(),
                        });
                    }
                }
                break;
            }

            case 'invoke-response': {
                const pending = this.pendingCalls.get(message.correlationId);
                if (pending) {
                    clearTimeout(pending.timeout);
                    this.pendingCalls.delete(message.correlationId);
                    pending.resolve(message.payload);
                }
                break;
            }

            case 'invoke-error': {
                const pending = this.pendingCalls.get(message.correlationId);
                if (pending) {
                    clearTimeout(pending.timeout);
                    this.pendingCalls.delete(message.correlationId);
                    const errorPayload = message.payload as { message: string; stack?: string };
                    const error = new Error(errorPayload.message);
                    if (errorPayload.stack) {
                        error.stack = errorPayload.stack;
                    }
                    pending.reject(error);
                }
                break;
            }

            case 'stream-data':
            case 'stream-end':
                // TODO: Implement stream handling
                break;
        }
    }

    /**
     * Get the context ID
     */
    getId(): string {
        return this.contextId;
    }

    /**
     * Close the context and cleanup
     */
    close(): void {
        // Cancel all pending calls
        for (const [id, pending] of this.pendingCalls) {
            clearTimeout(pending.timeout);
            pending.reject(new Error('Context closed'));
            this.pendingCalls.delete(id);
        }

        // Clear all listeners
        this.listeners.clear();
        this.invokeHandlers.clear();
        this.streamHandlers.clear();

        // Close transport
        if (this.transport?.close) {
            this.transport.close();
        }
    }

    private log(action: string, ...args: unknown[]): void {
        if (this.debug) {
            console.log(`[eventa:${this.contextId}] ${action}`, ...args);
        }
    }
}

/**
 * Create a new event context
 */
export function createContext(options?: ContextOptions): EventContext {
    return new EventContext(options);
}
