/**
 * Tests for @deltecho/eventa core functionality
 */

import {
    createContext,
    defineEventa,
    defineInvokeEventa,
    defineInvoke,
    defineInvokeHandler,
} from '../src/index.js';

describe('Eventa Core', () => {
    describe('defineEventa', () => {
        it('should create an event definition with unique ID', () => {
            const event1 = defineEventa<{ x: number }>();
            const event2 = defineEventa<{ y: number }>();

            expect(event1.id).toBeDefined();
            expect(event2.id).toBeDefined();
            expect(event1.id).not.toBe(event2.id);
        });

        it('should create an event with custom name', () => {
            const event = defineEventa<void>('test:custom_event');
            expect(event.id).toBe('test:custom_event');
        });
    });

    describe('defineInvokeEventa', () => {
        it('should create an invoke event definition', () => {
            const event = defineInvokeEventa<{ result: string }, { input: number }>('rpc:test');
            expect(event.id).toBe('rpc:test');
        });
    });

    describe('EventContext', () => {
        it('should create a context with default options', () => {
            const ctx = createContext();
            expect(ctx).toBeDefined();
            expect(ctx.getId()).toBeDefined();
        });

        it('should create a context with custom ID', () => {
            const ctx = createContext({ contextId: 'my-context' });
            expect(ctx.getId()).toBe('my-context');
        });

        describe('emit and on', () => {
            it('should emit events to listeners', () => {
                const ctx = createContext();
                const event = defineEventa<{ value: number }>('test:emit');
                const received: number[] = [];

                ctx.on(event, (envelope) => {
                    received.push(envelope.body.value);
                });

                ctx.emit(event, { value: 42 });
                ctx.emit(event, { value: 100 });

                expect(received).toEqual([42, 100]);
            });

            it('should support multiple listeners', () => {
                const ctx = createContext();
                const event = defineEventa<string>('test:multi');
                let count = 0;

                ctx.on(event, () => { count++; });
                ctx.on(event, () => { count++; });
                ctx.on(event, () => { count++; });

                ctx.emit(event, 'hello');

                expect(count).toBe(3);
            });

            it('should unsubscribe correctly', () => {
                const ctx = createContext();
                const event = defineEventa<number>('test:unsub');
                let received = 0;

                const sub = ctx.on(event, (env) => {
                    received = env.body;
                });

                ctx.emit(event, 1);
                expect(received).toBe(1);

                sub.unsubscribe();

                ctx.emit(event, 2);
                expect(received).toBe(1); // Should not change
            });
        });

        describe('once', () => {
            it('should only fire once', () => {
                const ctx = createContext();
                const event = defineEventa<number>('test:once');
                let count = 0;

                ctx.once(event, () => { count++; });

                ctx.emit(event, 1);
                ctx.emit(event, 2);
                ctx.emit(event, 3);

                expect(count).toBe(1);
            });
        });

        describe('invoke', () => {
            it('should invoke local handlers', async () => {
                const ctx = createContext();
                const rpc = defineInvokeEventa<{ doubled: number }, { value: number }>('rpc:double');

                ctx.registerHandler(rpc, (request) => {
                    return { doubled: request.value * 2 };
                });

                const result = await ctx.invoke(rpc, { value: 21 });
                expect(result.doubled).toBe(42);
            });

            it('should support async handlers', async () => {
                const ctx = createContext();
                const rpc = defineInvokeEventa<string, void>('rpc:async');

                ctx.registerHandler(rpc, async () => {
                    await new Promise(resolve => setTimeout(resolve, 10));
                    return 'async result';
                });

                const result = await ctx.invoke(rpc, undefined);
                expect(result).toBe('async result');
            });

            it('should throw if no handler registered and no transport', async () => {
                const ctx = createContext();
                const rpc = defineInvokeEventa<void, void>('rpc:missing');

                await expect(ctx.invoke(rpc, undefined)).rejects.toThrow(
                    'No handler registered'
                );
            });
        });

        describe('defineInvoke helper', () => {
            it('should create a reusable invoke function', async () => {
                const ctx = createContext();
                const rpc = defineInvokeEventa<number, number>('rpc:square');

                defineInvokeHandler(ctx, rpc, (n) => n * n);

                const square = defineInvoke(ctx, rpc);

                expect(await square(5)).toBe(25);
                expect(await square(10)).toBe(100);
            });
        });

        describe('close', () => {
            it('should clean up on close', () => {
                const ctx = createContext();
                const event = defineEventa<void>('test:close');
                let called = false;

                ctx.on(event, () => {
                    called = true;
                });

                ctx.close();

                ctx.emit(event, undefined);
                expect(called).toBe(false); // Should not be called after close
            });
        });
    });
});
