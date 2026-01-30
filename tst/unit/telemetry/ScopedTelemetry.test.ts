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

            expect(mockMeter.createCounter).toHaveBeenCalledWith('test', { unit: '1', valueType: 1 });
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

            expect(mockMeter.createHistogram).toHaveBeenCalledWith('test', { unit: '1', valueType: 1 });
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

        it('should record fault with error attributes', () => {
            const mockCounter = { add: vi.fn() };
            mockMeter.createCounter.mockReturnValue(mockCounter);

            const fn = vi.fn(() => {
                throw new TypeError('test error');
            });

            expect(() => scopedTelemetry.measure('test', fn, { captureErrorAttributes: true })).toThrow('test error');
            expect(mockCounter.add).toHaveBeenCalledWith(
                1,
                expect.objectContaining({
                    'error.type': 'TypeError',
                }),
            );
        });

        it('should not capture error attributes on fault when config is undefined', () => {
            const mockCounter = { add: vi.fn() };
            mockMeter.createCounter.mockReturnValue(mockCounter);

            const fn = vi.fn(() => {
                throw new Error('test error');
            });

            expect(() => scopedTelemetry.measure('test', fn)).toThrow('test error');
            expect(mockCounter.add).not.toHaveBeenCalledWith(
                1,
                expect.objectContaining({ 'error.type': expect.any(String) }),
            );
        });

        it('should not capture error attributes on fault when captureErrorAttributes is false', () => {
            const mockCounter = { add: vi.fn() };
            mockMeter.createCounter.mockReturnValue(mockCounter);

            const fn = vi.fn(() => {
                throw new Error('test error');
            });

            expect(() => scopedTelemetry.measure('test', fn, { captureErrorAttributes: false })).toThrow('test error');
            expect(mockCounter.add).not.toHaveBeenCalledWith(
                1,
                expect.objectContaining({ 'error.type': expect.any(String) }),
            );
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

        it('should record fault with error attributes on async error', async () => {
            const mockCounter = { add: vi.fn() };
            mockMeter.createCounter.mockReturnValue(mockCounter);

            const fn = vi.fn(() => {
                return Promise.reject(new ReferenceError('test error'));
            });

            await expect(scopedTelemetry.measureAsync('test', fn, { captureErrorAttributes: true })).rejects.toThrow(
                'test error',
            );
            expect(mockCounter.add).toHaveBeenCalledWith(
                1,
                expect.objectContaining({
                    'error.type': 'ReferenceError',
                }),
            );
        });

        it('should not capture error attributes on async fault when config is undefined', async () => {
            const mockCounter = { add: vi.fn() };
            mockMeter.createCounter.mockReturnValue(mockCounter);

            const fn = vi.fn(() => Promise.reject(new Error('test error')));

            await expect(scopedTelemetry.measureAsync('test', fn)).rejects.toThrow('test error');
            expect(mockCounter.add).not.toHaveBeenCalledWith(
                1,
                expect.objectContaining({ 'error.type': expect.any(String) }),
            );
        });

        it('should not capture error attributes on async fault when captureErrorAttributes is false', async () => {
            const mockCounter = { add: vi.fn() };
            mockMeter.createCounter.mockReturnValue(mockCounter);

            const fn = vi.fn(() => Promise.reject(new Error('test error')));

            await expect(scopedTelemetry.measureAsync('test', fn, { captureErrorAttributes: false })).rejects.toThrow(
                'test error',
            );
            expect(mockCounter.add).not.toHaveBeenCalledWith(
                1,
                expect.objectContaining({ 'error.type': expect.any(String) }),
            );
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

        it('should track object property when trackObjectKey is specified', () => {
            const fn = vi.fn(() => ({ items: [1, 2, 3], other: 'data' }));

            scopedTelemetry.trackExecution('test', fn, { trackObjectKey: 'items' });

            expect(mockMeter.createCounter).toHaveBeenCalledWith('test.response.type.array', expect.any(Object));
            expect(mockMeter.createHistogram).toHaveBeenCalledWith('test.response.type.size', expect.any(Object));
        });

        it('should track whole object when trackObjectKey not found', () => {
            const fn = vi.fn(() => ({ data: 'value' }));

            scopedTelemetry.trackExecution('test', fn, { trackObjectKey: 'missing' });

            expect(mockMeter.createCounter).toHaveBeenCalledWith('test.response.type.undefined', expect.any(Object));
        });

        it('should not capture error attributes on fault when config is undefined', () => {
            const mockCounter = { add: vi.fn() };
            mockMeter.createCounter.mockReturnValue(mockCounter);

            const fn = vi.fn(() => {
                throw new Error('test error');
            });

            expect(() => scopedTelemetry.trackExecution('test', fn)).toThrow('test error');
            expect(mockCounter.add).not.toHaveBeenCalledWith(
                1,
                expect.objectContaining({ 'error.type': expect.any(String) }),
            );
        });

        it('should not capture error attributes on fault when captureErrorAttributes is false', () => {
            const mockCounter = { add: vi.fn() };
            mockMeter.createCounter.mockReturnValue(mockCounter);

            const fn = vi.fn(() => {
                throw new Error('test error');
            });

            expect(() => scopedTelemetry.trackExecution('test', fn, { captureErrorAttributes: false })).toThrow(
                'test error',
            );
            expect(mockCounter.add).not.toHaveBeenCalledWith(
                1,
                expect.objectContaining({ 'error.type': expect.any(String) }),
            );
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

        it('should not capture error attributes on async fault when config is undefined', async () => {
            const mockCounter = { add: vi.fn() };
            mockMeter.createCounter.mockReturnValue(mockCounter);

            const fn = vi.fn(() => Promise.reject(new Error('test error')));

            await expect(scopedTelemetry.trackExecutionAsync('test', fn)).rejects.toThrow('test error');
            expect(mockCounter.add).not.toHaveBeenCalledWith(
                1,
                expect.objectContaining({ 'error.type': expect.any(String) }),
            );
        });

        it('should not capture error attributes on async fault when captureErrorAttributes is false', async () => {
            const mockCounter = { add: vi.fn() };
            mockMeter.createCounter.mockReturnValue(mockCounter);

            const fn = vi.fn(() => Promise.reject(new Error('test error')));

            await expect(
                scopedTelemetry.trackExecutionAsync('test', fn, { captureErrorAttributes: false }),
            ).rejects.toThrow('test error');
            expect(mockCounter.add).not.toHaveBeenCalledWith(
                1,
                expect.objectContaining({ 'error.type': expect.any(String) }),
            );
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

    describe('error', () => {
        let mockAdd: ReturnType<typeof vi.fn>;

        beforeEach(() => {
            mockAdd = vi.fn();
            mockMeter.createCounter = vi.fn(() => ({ add: mockAdd }));
        });

        it('should not capture error attributes when config is undefined', () => {
            const error = new Error('test error');

            scopedTelemetry.error('test.error', error);

            expect(mockAdd).toHaveBeenCalledWith(1, {
                HandlerSource: 'Unknown',
                'aws.emf.storage_resolution': 1,
            });
        });

        it('should not capture error attributes when captureErrorAttributes is false', () => {
            const error = new Error('test error');

            scopedTelemetry.error('test.error', error, undefined, { captureErrorAttributes: false });

            expect(mockAdd).toHaveBeenCalledWith(1, {
                HandlerSource: 'Unknown',
                'aws.emf.storage_resolution': 1,
            });
        });

        it('should record error with default origin Unknown when not provided', () => {
            const error = new Error('test error');
            error.stack = 'Error: test error\n    at func (file.ts:10:5)';

            scopedTelemetry.error('test.error', error, undefined, { captureErrorAttributes: true });

            expect(mockMeter.createCounter).toHaveBeenCalledWith('test.error', {
                unit: '1',
                valueType: 1,
                description: undefined,
                advice: undefined,
            });
            expect(mockAdd).toHaveBeenCalledWith(1, {
                HandlerSource: 'Unknown',
                'aws.emf.storage_resolution': 1,
                'error.type': 'Error',
                'error.origin': 'Unknown',
                'error.message': 'Error: test error',
                'error.stack': 'at func (file.ts:10:5)',
            });
        });

        it('should record error with uncaughtException origin', () => {
            const error = new TypeError('type error');
            error.stack = 'TypeError: type error\n    at test (test.ts:1:1)';

            scopedTelemetry.error('test.error', error, 'uncaughtException', { captureErrorAttributes: true });

            expect(mockAdd).toHaveBeenCalledWith(1, {
                HandlerSource: 'Unknown',
                'aws.emf.storage_resolution': 1,
                'error.type': 'TypeError',
                'error.origin': 'uncaughtException',
                'error.message': 'TypeError: type error',
                'error.stack': 'at test (test.ts:1:1)',
            });
        });

        it('should record error with unhandledRejection origin', () => {
            const error = new Error('rejection');
            error.stack = 'Error: rejection\n    at promise (p.ts:5:10)';

            scopedTelemetry.error('test.error', error, 'unhandledRejection', { captureErrorAttributes: true });

            expect(mockAdd).toHaveBeenCalledWith(1, {
                HandlerSource: 'Unknown',
                'aws.emf.storage_resolution': 1,
                'error.type': 'Error',
                'error.origin': 'unhandledRejection',
                'error.message': 'Error: rejection',
                'error.stack': 'at promise (p.ts:5:10)',
            });
        });

        it('should merge config attributes with error attributes', () => {
            const error = new Error('test');
            error.stack = 'Error: test\n    at x (x.ts:1:1)';

            scopedTelemetry.error('test.error', error, undefined, {
                attributes: { custom: 'value', region: 'us-east-1' },
                captureErrorAttributes: true,
            });

            expect(mockAdd).toHaveBeenCalledWith(1, {
                HandlerSource: 'Unknown',
                'aws.emf.storage_resolution': 1,
                custom: 'value',
                region: 'us-east-1',
                'error.type': 'Error',
                'error.origin': 'Unknown',
                'error.message': 'Error: test',
                'error.stack': 'at x (x.ts:1:1)',
            });
        });

        it('should pass config options to counter', () => {
            const error = new Error('test');
            error.stack = 'Error: test\n    at x (x.ts:1:1)';

            scopedTelemetry.error('test.error', error, undefined, {
                unit: 'errors',
                description: 'Error counter',
                captureErrorAttributes: true,
            });

            expect(mockMeter.createCounter).toHaveBeenCalledWith('test.error', {
                unit: 'errors',
                valueType: 1,
                description: 'Error counter',
                advice: undefined,
            });
            expect(mockAdd).toHaveBeenCalledWith(1, {
                HandlerSource: 'Unknown',
                'aws.emf.storage_resolution': 1,
                'error.type': 'Error',
                'error.origin': 'Unknown',
                'error.message': 'Error: test',
                'error.stack': 'at x (x.ts:1:1)',
            });
        });

        it('should handle non-Error string value', () => {
            scopedTelemetry.error('test.error', 'string error', undefined, { captureErrorAttributes: true });

            expect(mockAdd).toHaveBeenCalledWith(1, {
                HandlerSource: 'Unknown',
                'aws.emf.storage_resolution': 1,
                'error.type': 'string',
                'error.origin': 'Unknown',
            });
        });

        it('should handle non-Error null value', () => {
            scopedTelemetry.error('test.error', null, undefined, { captureErrorAttributes: true });

            expect(mockAdd).toHaveBeenCalledWith(1, {
                HandlerSource: 'Unknown',
                'aws.emf.storage_resolution': 1,
                'error.type': 'object',
                'error.origin': 'Unknown',
            });
        });

        it('should handle non-Error undefined value', () => {
            scopedTelemetry.error('test.error', undefined, undefined, { captureErrorAttributes: true });

            expect(mockAdd).toHaveBeenCalledWith(1, {
                HandlerSource: 'Unknown',
                'aws.emf.storage_resolution': 1,
                'error.type': 'undefined',
                'error.origin': 'Unknown',
            });
        });
    });
});
