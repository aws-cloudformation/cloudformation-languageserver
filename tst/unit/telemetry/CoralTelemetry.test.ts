import { Meter, UpDownCounter, Histogram } from '@opentelemetry/api';
import { describe, it, expect, beforeEach, afterEach, vi, Mocked } from 'vitest';
import { CoralTelemetry } from '../../../src/telemetry/CoralTelemetry';

const mockUpDownCounter: Mocked<UpDownCounter> = {
    add: vi.fn(),
};

const mockHistogram: Mocked<Histogram> = {
    record: vi.fn(),
};

const mockMeter: Mocked<Meter> = {
    createUpDownCounter: vi.fn().mockReturnValue(mockUpDownCounter),
    createHistogram: vi.fn().mockReturnValue(mockHistogram),
} as any;

describe('CoralTelemetry', () => {
    let telemetry: CoralTelemetry;
    const scope = 'test-scope';

    beforeEach(() => {
        vi.clearAllMocks();
        telemetry = new CoralTelemetry(scope, mockMeter, undefined);
    });

    afterEach(() => {
        telemetry.cleanup();
    });

    describe('Metrics', () => {
        it('should create and use an UpDownCounter for count', () => {
            const name = 'test.count';
            const value = 5;
            telemetry.count(name, value);

            expect(mockMeter.createUpDownCounter).toHaveBeenCalledWith(name, undefined);
            expect(mockUpDownCounter.add).toHaveBeenCalledWith(value, undefined);
        });

        it('should count a boolean value as 1 for true', () => {
            const name = 'test.boolean.true';
            telemetry.countBoolean(name, true);

            expect(mockMeter.createUpDownCounter).toHaveBeenCalledWith(name, undefined);
            expect(mockUpDownCounter.add).toHaveBeenCalledWith(1, undefined);
        });

        it('should count a boolean value as 0 for false', () => {
            const name = 'test.boolean.false';
            telemetry.countBoolean(name, false);

            expect(mockMeter.createUpDownCounter).toHaveBeenCalledWith(name, undefined);
            expect(mockUpDownCounter.add).toHaveBeenCalledWith(0, undefined);
        });

        it('should create and use a Histogram', () => {
            const name = 'test.histogram';
            const value = 120;
            telemetry.histogram(name, value);

            expect(mockMeter.createHistogram).toHaveBeenCalledWith(name, undefined);
            expect(mockHistogram.record).toHaveBeenCalledWith(value, undefined);
        });

        it('should reuse existing counters and histograms', () => {
            telemetry.count('reused.counter', 1);
            telemetry.count('reused.counter', 2);
            expect(mockMeter.createUpDownCounter).toHaveBeenCalledTimes(1);

            telemetry.histogram('reused.histogram', 10);
            telemetry.histogram('reused.histogram', 20);
            expect(mockMeter.createHistogram).toHaveBeenCalledTimes(1);
        });
    });

    describe('Timing', () => {
        it('should time a synchronous function and record latency', () => {
            const name = 'timed.sync.func';
            telemetry.time(name, () => {});

            expect(mockHistogram.record).toHaveBeenCalled();
            expect(mockMeter.createHistogram).toHaveBeenCalledWith(`${name}.latency`, { unit: 'ms' });
        });

        it('should time an asynchronous function and record latency', async () => {
            const name = 'timed.async.func';
            await telemetry.timeAsync(name, () => Promise.resolve());

            expect(mockHistogram.record).toHaveBeenCalled();
            expect(mockMeter.createHistogram).toHaveBeenCalledWith(`${name}.latency`, { unit: 'ms' });
        });
    });

    describe('Execution Tracking', () => {
        const name = 'tracked.execution';

        it('should track a successful synchronous execution', () => {
            telemetry.trackExecution(name, () => {});

            expect(mockUpDownCounter.add).toHaveBeenCalledWith(1, undefined);
            expect(mockUpDownCounter.add).toHaveBeenCalledWith(0, undefined);
            expect(mockMeter.createUpDownCounter).toHaveBeenCalledWith(`${name}.call`, { unit: '1' });
            expect(mockMeter.createUpDownCounter).toHaveBeenCalledWith(`${name}.fault`, { unit: '1' });
        });

        it('should track a failed synchronous execution', () => {
            const error = new Error('failed execution');
            expect(() =>
                telemetry.trackExecution(name, () => {
                    throw error;
                }),
            ).toThrow(error);

            expect(mockUpDownCounter.add).toHaveBeenCalledWith(1, undefined);
            expect(mockUpDownCounter.add).toHaveBeenCalledWith(1, undefined);
        });

        it('should track a successful asynchronous execution', async () => {
            await telemetry.trackExecutionAsync(name, () => Promise.resolve());

            expect(mockUpDownCounter.add).toHaveBeenCalledWith(1, undefined);
            expect(mockUpDownCounter.add).toHaveBeenCalledWith(0, undefined);
        });

        it('should track a failed asynchronous execution', async () => {
            const error = new Error('failed async execution');
            await expect(telemetry.trackExecutionAsync(name, () => Promise.reject(error))).rejects.toThrow(error);

            expect(mockUpDownCounter.add).toHaveBeenCalledWith(1, undefined);
            expect(mockUpDownCounter.add).toHaveBeenCalledWith(1, undefined);
        });
    });
});
