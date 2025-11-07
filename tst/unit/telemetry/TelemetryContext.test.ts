import { describe, it, expect, vi } from 'vitest';
import { TelemetryContext, withTelemetryContext } from '../../../src/telemetry/TelemetryContext';

describe('TelemetryContext', () => {
    it('should store and retrieve handler context', () => {
        const result = TelemetryContext.run('TestHandler', () => {
            return TelemetryContext.getContext().HandlerSource;
        });

        expect(result).toEqual('TestHandler');
    });

    it('should return undefined when no context is set', () => {
        const handler = TelemetryContext.getContext().HandlerSource;
        expect(handler).toEqual('Unknown');
    });

    it('should propagate context through nested function calls', () => {
        const nestedFunction = () => {
            return TelemetryContext.getContext().HandlerSource;
        };

        const result = TelemetryContext.run('NestedHandler', () => {
            return nestedFunction();
        });

        expect(result).toBe('NestedHandler');
    });

    it('should propagate context through async operations', async () => {
        const asyncFunction = async () => {
            await Promise.resolve();
            return TelemetryContext.getContext().HandlerSource;
        };

        const result = await TelemetryContext.run('AsyncHandler', async () => {
            return await asyncFunction();
        });

        expect(result).toBe('AsyncHandler');
    });

    it('should isolate contexts between different runs', () => {
        const handler1 = TelemetryContext.run('Handler1', () => {
            return TelemetryContext.getContext().HandlerSource;
        });

        const handler2 = TelemetryContext.run('Handler2', () => {
            return TelemetryContext.getContext().HandlerSource;
        });

        expect(handler1).toBe('Handler1');
        expect(handler2).toBe('Handler2');
    });

    it('should handle nested context runs with different handlers', () => {
        const result = TelemetryContext.run('OuterHandler', () => {
            const outer = TelemetryContext.getContext().HandlerSource;

            const inner = TelemetryContext.run('InnerHandler', () => {
                return TelemetryContext.getContext().HandlerSource;
            });

            const outerAgain = TelemetryContext.getContext().HandlerSource;

            return { outer, inner, outerAgain };
        });

        expect(result.outer).toBe('OuterHandler');
        expect(result.inner).toBe('InnerHandler');
        expect(result.outerAgain).toBe('OuterHandler');
    });

    it('should return function result', () => {
        const result = TelemetryContext.run('TestHandler', () => {
            return 42;
        });

        expect(result).toBe(42);
    });

    it('should return async function result', async () => {
        const result = await TelemetryContext.run('TestHandler', () => {
            return Promise.resolve(42);
        });

        expect(result).toBe(42);
    });

    it('should propagate exceptions', () => {
        expect(() => {
            TelemetryContext.run('TestHandler', () => {
                throw new Error('Test error');
            });
        }).toThrow('Test error');
    });

    it('should propagate async exceptions', async () => {
        await expect(async () => {
            await TelemetryContext.run('TestHandler', () => {
                return Promise.reject(new Error('Async test error'));
            });
        }).rejects.toThrow('Async test error');
    });

    describe('withTelemetryContext', () => {
        it('should wrap sync handler and set context', () => {
            const handler = vi.fn((x: number) => x * 2);
            const wrapped = withTelemetryContext('TestHandler', handler);

            const result = wrapped(5);

            expect(result).toBe(10);
            expect(handler).toHaveBeenCalledWith(5);
        });

        it('should wrap async handler and set context', async () => {
            const handler = vi.fn(async (x: number) => await Promise.resolve(x * 2));
            const wrapped = withTelemetryContext('TestHandler', handler);

            const result = await wrapped(5);

            expect(result).toBe(10);
            expect(handler).toHaveBeenCalledWith(5);
        });

        it('should make context available inside handler', () => {
            const handler = vi.fn(() => {
                return TelemetryContext.getContext().HandlerSource;
            });
            const wrapped = withTelemetryContext('MyHandler', handler);

            const result = wrapped();

            expect(result).toBe('MyHandler');
        });

        it('should make context available in async handler', async () => {
            const handler = vi.fn(async () => {
                await Promise.resolve();
                return TelemetryContext.getContext().HandlerSource;
            });
            const wrapped = withTelemetryContext('AsyncHandler', handler);

            const result = await wrapped();

            expect(result).toBe('AsyncHandler');
        });

        it('should propagate exceptions', () => {
            const handler = vi.fn(() => {
                throw new Error('Test error');
            });
            const wrapped = withTelemetryContext('TestHandler', handler);

            expect(() => wrapped()).toThrow('Test error');
        });

        it('should propagate async exceptions', async () => {
            const handler = vi.fn(() => {
                return Promise.reject(new Error('Async error'));
            });
            const wrapped = withTelemetryContext('TestHandler', handler);

            await expect(wrapped()).rejects.toThrow('Async error');
        });

        it('should handle multiple arguments', () => {
            const handler = vi.fn((a: number, b: string, c: boolean) => `${a}-${b}-${c}`);
            const wrapped = withTelemetryContext('TestHandler', handler);

            const result = wrapped(42, 'test', true);

            expect(result).toBe('42-test-true');
            expect(handler).toHaveBeenCalledWith(42, 'test', true);
        });

        it('should isolate contexts between concurrent calls', async () => {
            const results: string[] = [];

            const handler1 = vi.fn(async () => {
                await new Promise((resolve) => setTimeout(resolve, 10));
                results.push(TelemetryContext.getContext().HandlerSource!);
            });

            const handler2 = vi.fn(async () => {
                await new Promise((resolve) => setTimeout(resolve, 5));
                results.push(TelemetryContext.getContext().HandlerSource!);
            });

            const wrapped1 = withTelemetryContext('Handler1', handler1);
            const wrapped2 = withTelemetryContext('Handler2', handler2);

            await Promise.all([wrapped1(), wrapped2()]);

            expect(results).toContain('Handler1');
            expect(results).toContain('Handler2');
        });
    });
});
