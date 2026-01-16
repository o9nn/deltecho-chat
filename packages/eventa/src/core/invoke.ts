/**
 * RPC/Invoke utilities for eventa
 *
 * Provides define* functions for type-safe RPC calls
 */

import type { EventContext } from './context.js';
import type {
    InvokeEventDefinition,
    InvokeHandler,
    StreamHandler,
    Subscription,
} from '../types.js';

/**
 * Define an invoke function that can be reused
 *
 * @example
 * ```typescript
 * const getUser = defineInvokeEventa<User, { id: string }>('getUser');
 * const invokeGetUser = defineInvoke(ctx, getUser);
 *
 * // Later...
 * const user = await invokeGetUser({ id: '123' });
 * ```
 */
export function defineInvoke<TResponse, TRequest>(
    context: EventContext,
    event: InvokeEventDefinition<TResponse, TRequest>
): (request: TRequest) => Promise<TResponse> {
    return (request: TRequest) => context.invoke(event, request);
}

/**
 * Define and register an invoke handler
 *
 * @example
 * ```typescript
 * const getUser = defineInvokeEventa<User, { id: string }>('getUser');
 *
 * defineInvokeHandler(ctx, getUser, async ({ id }) => {
 *     return await database.users.findById(id);
 * });
 * ```
 */
export function defineInvokeHandler<TResponse, TRequest>(
    context: EventContext,
    event: InvokeEventDefinition<TResponse, TRequest>,
    handler: InvokeHandler<TResponse, TRequest>
): Subscription {
    return context.registerHandler(event, handler);
}

/**
 * Define and register a stream handler for multi-response RPC
 *
 * @example
 * ```typescript
 * const streamLogs = defineInvokeEventa<LogEntry, { since: number }>('streamLogs');
 *
 * defineStreamInvokeHandler(ctx, streamLogs, async ({ since }, envelope, emit) => {
 *     const cursor = logs.find({ timestamp: { $gt: since } });
 *     for await (const entry of cursor) {
 *         emit(entry);
 *     }
 * });
 * ```
 */
export function defineStreamInvokeHandler<TResponse, TRequest>(
    context: EventContext,
    event: InvokeEventDefinition<TResponse, TRequest>,
    handler: StreamHandler<TResponse, TRequest>
): Subscription {
    return context.registerStreamHandler(event, handler);
}

/**
 * Batch multiple invoke calls
 *
 * @example
 * ```typescript
 * const results = await batchInvoke(ctx, [
 *     [getUser, { id: '1' }],
 *     [getUser, { id: '2' }],
 *     [getSettings, {}],
 * ]);
 * ```
 */
export async function batchInvoke(
    context: EventContext,
    calls: Array<[InvokeEventDefinition<unknown, unknown>, unknown]>
): Promise<unknown[]> {
    return Promise.all(
        calls.map(([event, request]) => context.invoke(event, request))
    );
}

/**
 * Create a typed invoke client from event definitions
 *
 * @example
 * ```typescript
 * const api = createInvokeClient(ctx, {
 *     getUser,
 *     getSettings,
 *     updateProfile,
 * });
 *
 * const user = await api.getUser({ id: '123' });
 * const settings = await api.getSettings({});
 * ```
 */
export function createInvokeClient<
    T extends Record<string, InvokeEventDefinition<unknown, unknown>>
>(
    context: EventContext,
    events: T
): {
        [K in keyof T]: T[K] extends InvokeEventDefinition<infer R, infer Q>
        ? (request: Q) => Promise<R>
        : never;
    } {
    const client: Record<string, (request: unknown) => Promise<unknown>> = {};

    for (const [key, event] of Object.entries(events)) {
        client[key] = defineInvoke(context, event);
    }

    return client as {
        [K in keyof T]: T[K] extends InvokeEventDefinition<infer R, infer Q>
        ? (request: Q) => Promise<R>
        : never;
    };
}
