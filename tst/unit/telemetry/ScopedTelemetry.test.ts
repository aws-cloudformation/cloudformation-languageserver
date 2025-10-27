import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ScopedTelemetry } from '../../../src/telemetry/ScopedTelemetry';

describe('ScopedTelemetry', () => {
    let mockMeter: any;
    let scopedTelemetry: ScopedTelemetry;

    beforeEach(() => {
        mockMeter = {
            createCounter: vi.fn(() => ({ add: vi.fn() })),
            createUpDownCounter: vi.fn(() => ({ add: vi.fn() })),
            createHistogram: vi.fn(() => ({ record: vi.fn() })),
            createGauge: vi.fn(() => ({ record: vi.fn() })),
            createObservableGauge: vi.fn(() => ({})),
        };
        scopedTelemetry = new ScopedTelemetry('test-scope', mockMeter);
    });

    describe('count', () => {
        it('should increment counter', () => {
            scopedTelemetry.count('test', 5);

            expect(mockMeter.createCounter).toHaveBeenCalledWith('test', undefined);
        });
    });

    describe('countBoolean', () => {
        it('should count true as 1', () => {
            scopedTelemetry.countBoolean('test', true);

            expect(mockMeter.createCounter).toHaveBeenCalled();
        });

        it('should count false as 0', () => {
            scopedTelemetry.countBoolean('test', false);

            expect(mockMeter.createCounter).toHaveBeenCalled();
        });
    });

    describe('histogram', () => {
        it('should record histogram value', () => {
            scopedTelemetry.histogram('test', 100);

            expect(mockMeter.createHistogram).toHaveBeenCalledWith('test', undefined);
        });
    });

    describe('measure', () => {
        it('should measure sync function execution', () => {
            const fn = vi.fn(() => 'result');

            const result = scopedTelemetry.measure('test', fn);

            expect(result).toBe('result');
            expect(fn).toHaveBeenCalled();
            expect(mockMeter.createCounter).toHaveBeenCalledWith('test.count', expect.any(Object));
            expect(mockMeter.createHistogram).toHaveBeenCalledWith('test.duration', expect.any(Object));
        });

        it('should record fault on error', () => {
            const fn = vi.fn(() => {
                throw new Error('test error');
            });

            expect(() => scopedTelemetry.measure('test', fn)).toThrow('test error');
            expect(mockMeter.createCounter).toHaveBeenCalledWith('test.fault', expect.any(Object));
        });
    });

    describe('measureAsync', () => {
        it('should measure async function execution', async () => {
            const fn = vi.fn(async () => {
                await Promise.resolve();
                return 'result';
            });

            const result = await scopedTelemetry.measureAsync('test', fn);

            expect(result).toBe('result');
            expect(fn).toHaveBeenCalled();
        });

        it('should record fault on async error', async () => {
            const fn = vi.fn(async () => {
                await Promise.resolve();
                throw new Error('test error');
            });

            await expect(scopedTelemetry.measureAsync('test', fn)).rejects.toThrow('test error');
            expect(mockMeter.createCounter).toHaveBeenCalledWith('test.fault', expect.any(Object));
        });
    });

    describe('trackExecution', () => {
        it('should track execution and response type', () => {
            const fn = vi.fn(() => 'result');

            const result = scopedTelemetry.trackExecution('test', fn);

            expect(result).toBe('result');
            expect(mockMeter.createCounter).toHaveBeenCalledWith('test.response.type.string', expect.any(Object));
        });

        it('should track null response', () => {
            const fn = vi.fn(() => null);

            scopedTelemetry.trackExecution('test', fn);

            expect(mockMeter.createCounter).toHaveBeenCalledWith('test.response.type.null', expect.any(Object));
        });

        it('should track undefined response', () => {
            const fn = vi.fn(() => undefined);

            scopedTelemetry.trackExecution('test', fn);

            expect(mockMeter.createCounter).toHaveBeenCalledWith('test.response.type.undefined', expect.any(Object));
        });

        it('should track array response with size', () => {
            const fn = vi.fn(() => [1, 2, 3]);

            scopedTelemetry.trackExecution('test', fn);

            expect(mockMeter.createCounter).toHaveBeenCalledWith('test.response.type.array', expect.any(Object));
            expect(mockMeter.createHistogram).toHaveBeenCalledWith('test.response.type.size', expect.any(Object));
        });
    });

    describe('trackExecutionAsync', () => {
        it('should track async execution', async () => {
            const fn = vi.fn(async () => {
                await Promise.resolve();
                return 'result';
            });

            const result = await scopedTelemetry.trackExecutionAsync('test', fn);

            expect(result).toBe('result');
            expect(mockMeter.createCounter).toHaveBeenCalledWith('test.response.type.string', expect.any(Object));
        });
    });

    describe('close', () => {
        it('should clear all metrics', () => {
            scopedTelemetry.count('test', 1);
            scopedTelemetry.close();

            expect(scopedTelemetry['counters'].size).toBe(0);
            expect(scopedTelemetry['histograms'].size).toBe(0);
        });
    });
});
