/**
 * Core types for the eventa system
 */

/**
 * Unique identifier for event types
 */
export type EventId = string & { readonly __brand: 'EventId' };

/**
 * Event definition structure
 */
export interface EventDefinition<TPayload = unknown> {
    readonly id: EventId;
    readonly __payload?: TPayload;
}

/**
 * RPC/Invoke event definition with request and response types
 */
export interface InvokeEventDefinition<TResponse = unknown, TRequest = unknown> {
    readonly id: EventId;
    readonly __response?: TResponse;
    readonly __request?: TRequest;
}

/**
 * Event envelope wrapping payload with metadata
 */
export interface EventEnvelope<T = unknown> {
    eventId: EventId;
    body: T;
    timestamp: number;
    correlationId?: string;
}

/**
 * Event listener callback type
 */
export type EventListener<T> = (envelope: EventEnvelope<T>) => void | Promise<void>;

/**
 * Invoke handler function type
 */
export type InvokeHandler<TResponse, TRequest> = (
    request: TRequest,
    envelope: EventEnvelope<TRequest>
) => TResponse | Promise<TResponse>;

/**
 * Stream handler for multi-response RPC
 */
export type StreamHandler<TResponse, TRequest> = (
    request: TRequest,
    envelope: EventEnvelope<TRequest>,
    emit: (response: TResponse) => void
) => void | Promise<void>;

/**
 * Context options for different adapters
 */
export interface ContextOptions {
    /** Unique identifier for this context */
    contextId?: string;
    /** Timeout for RPC calls in milliseconds */
    rpcTimeout?: number;
    /** Enable debug logging */
    debug?: boolean;
}

/**
 * Subscription handle for cleanup
 */
export interface Subscription {
    unsubscribe(): void;
}

/**
 * Pending RPC call tracker
 */
export interface PendingCall<T = unknown> {
    resolve: (value: T) => void;
    reject: (error: Error) => void;
    timeout: ReturnType<typeof setTimeout>;
}

/**
 * Wire message format for transport
 */
export interface WireMessage {
    type: 'event' | 'invoke-request' | 'invoke-response' | 'invoke-error' | 'stream-data' | 'stream-end';
    eventId: string;
    correlationId: string;
    payload: unknown;
    timestamp: number;
}

/**
 * Transport adapter interface
 */
export interface TransportAdapter {
    send(message: WireMessage): void;
    onMessage(handler: (message: WireMessage) => void): Subscription;
    close?(): void;
}
