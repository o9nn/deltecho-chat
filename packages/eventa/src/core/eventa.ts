/**
 * Event definition utilities
 *
 * All events should be defined with these utilities for type safety
 */

import type {
  EventDefinition,
  EventId,
  InvokeEventDefinition,
} from "../types.js";

let eventCounter = 0;

/**
 * Generate a unique event ID
 */
function generateEventId(name?: string): EventId {
  const id = name || `event_${++eventCounter}_${Date.now().toString(36)}`;
  return id as EventId;
}

/**
 * Define a simple event with a payload type
 *
 * @example
 * ```typescript
 * const playerMoved = defineEventa<{ x: number; y: number }>();
 * context.emit(playerMoved, { x: 100, y: 200 });
 * context.on(playerMoved, ({ body }) => console.log(body.x, body.y));
 * ```
 */
export function defineEventa<TPayload = void>(
  name?: string,
): EventDefinition<TPayload> {
  return {
    id: generateEventId(name),
  } as EventDefinition<TPayload>;
}

/**
 * Define an RPC/invoke event with request and response types
 *
 * @example
 * ```typescript
 * const getUser = defineInvokeEventa<{ user: User }, { userId: string }>('rpc:getUser');
 * const user = await invokeGetUser({ userId: '123' });
 * ```
 */
export function defineInvokeEventa<TResponse = void, TRequest = void>(
  name?: string,
): InvokeEventDefinition<TResponse, TRequest> {
  return {
    id: generateEventId(name),
  } as InvokeEventDefinition<TResponse, TRequest>;
}

/**
 * Type helper to extract payload type from event definition
 */
export type EventPayload<E> = E extends EventDefinition<infer P> ? P : never;

/**
 * Type helper to extract request type from invoke event definition
 */
export type InvokeRequest<E> =
  E extends InvokeEventDefinition<unknown, infer R> ? R : never;

/**
 * Type helper to extract response type from invoke event definition
 */
export type InvokeResponse<E> =
  E extends InvokeEventDefinition<infer R, unknown> ? R : never;
