import { Meter, metrics } from '@opentelemetry/api';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ScopedTelemetry } from '../../../src/telemetry/ScopedTelemetry';
import { TelemetryContext } from '../../../src/telemetry/TelemetryContext';

describe('ScopedTelemetry with TelemetryContext', () => {
    let meter: Meter;
    let telemetry: ScopedTelemetry;

    beforeEach(() => {
        meter = metrics.getMeter('test-meter');
        telemetry = new ScopedTelemetry('TestScope', meter);
    });

    it('should include HandlerSource in count metrics when context is set', () => {
        const counter = meter.createCounter('test.counter');
        const addSpy = vi.spyOn(counter, 'add');

        TelemetryContext.run('TestHandler', () => {
            telemetry.count('metric', 1);
        });

        expect(addSpy).toHaveBeenCalledWith(
            1,
            expect.objectContaining({
                HandlerSource: 'TestHandler',
            }),
        );
    });

    it('should not include HandlerSource when no context is set', () => {
        const counter = meter.createCounter('test.counter');
        const addSpy = vi.spyOn(counter, 'add');

        telemetry.count('metric', 1);

        expect(addSpy).toHaveBeenCalledWith(
            1,
            expect.not.objectContaining({
                HandlerSource: expect.anything(),
            }),
        );
    });

    it('should include HandlerSource in histogram metrics', () => {
        const histogram = meter.createHistogram('test.histogram');
        const recordSpy = vi.spyOn(histogram, 'record');

        TelemetryContext.run('HistogramHandler', () => {
            telemetry.histogram('metric', 100);
        });

        expect(recordSpy).toHaveBeenCalledWith(
            100,
            expect.objectContaining({
                HandlerSource: 'HistogramHandler',
            }),
        );
    });

    it('should include HandlerSource in measure operations', () => {
        const histogram = meter.createHistogram('test.duration');
        const recordSpy = vi.spyOn(histogram, 'record');

        TelemetryContext.run('MeasureHandler', () => {
            telemetry.measure('test', () => 'result');
        });

        expect(recordSpy).toHaveBeenCalledWith(
            expect.any(Number),
            expect.objectContaining({
                HandlerSource: 'MeasureHandler',
            }),
        );
    });

    it('should include HandlerSource in async measure operations', async () => {
        const histogram = meter.createHistogram('test.duration');
        const recordSpy = vi.spyOn(histogram, 'record');

        await TelemetryContext.run('AsyncHandler', async () => {
            await telemetry.measureAsync('test', () => Promise.resolve('result'));
        });

        expect(recordSpy).toHaveBeenCalledWith(
            expect.any(Number),
            expect.objectContaining({
                HandlerSource: 'AsyncHandler',
            }),
        );
    });

    it('should include HandlerSource in trackExecution operations', () => {
        const counter = meter.createCounter('test.count');
        const histogram = meter.createHistogram('test.duration');
        const countSpy = vi.spyOn(counter, 'add');
        const histogramSpy = vi.spyOn(histogram, 'record');

        TelemetryContext.run('TrackHandler', () => {
            telemetry.trackExecution('test', () => 'result');
        });

        expect(countSpy).toHaveBeenCalledWith(
            expect.any(Number),
            expect.objectContaining({
                HandlerSource: 'TrackHandler',
            }),
        );

        expect(histogramSpy).toHaveBeenCalledWith(
            expect.any(Number),
            expect.objectContaining({
                HandlerSource: 'TrackHandler',
            }),
        );
    });

    it('should preserve custom attributes along with HandlerSource', () => {
        const counter = meter.createCounter('test.counter');
        const addSpy = vi.spyOn(counter, 'add');

        TelemetryContext.run('CustomHandler', () => {
            telemetry.count('metric', 1, {
                attributes: {
                    customKey: 'customValue',
                },
            });
        });

        expect(addSpy).toHaveBeenCalledWith(
            1,
            expect.objectContaining({
                HandlerSource: 'CustomHandler',
                customKey: 'customValue',
            }),
        );
    });

    it('should handle nested contexts correctly', () => {
        const counter = meter.createCounter('test.counter');
        const addSpy = vi.spyOn(counter, 'add');

        TelemetryContext.run('OuterHandler', () => {
            telemetry.count('outer', 1);

            TelemetryContext.run('InnerHandler', () => {
                telemetry.count('inner', 1);
            });

            telemetry.count('outer-again', 1);
        });

        expect(addSpy).toHaveBeenNthCalledWith(1, 1, expect.objectContaining({ HandlerSource: 'OuterHandler' }));

        expect(addSpy).toHaveBeenNthCalledWith(2, 1, expect.objectContaining({ HandlerSource: 'InnerHandler' }));

        expect(addSpy).toHaveBeenNthCalledWith(3, 1, expect.objectContaining({ HandlerSource: 'OuterHandler' }));
    });

    it('should include HandlerSource in countUpDown operations', () => {
        const upDownCounter = meter.createUpDownCounter('test.updown');
        const addSpy = vi.spyOn(upDownCounter, 'add');

        TelemetryContext.run('UpDownHandler', () => {
            telemetry.countUpDown('metric', 5);
        });

        expect(addSpy).toHaveBeenCalledWith(
            5,
            expect.objectContaining({
                HandlerSource: 'UpDownHandler',
            }),
        );
    });

    it('should include HandlerSource in countBoolean operations', () => {
        const counter = meter.createCounter('test.counter');
        const addSpy = vi.spyOn(counter, 'add');

        TelemetryContext.run('BoolHandler', () => {
            telemetry.countBoolean('metric', true);
        });

        expect(addSpy).toHaveBeenCalledWith(
            1,
            expect.objectContaining({
                HandlerSource: 'BoolHandler',
            }),
        );
    });
});
