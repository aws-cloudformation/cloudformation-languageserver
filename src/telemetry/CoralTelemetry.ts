import { performance } from 'perf_hooks';
import { Attributes, context, Histogram, Meter, Span, trace, Tracer, ObservableGauge } from '@opentelemetry/api';
import { MetricOptions, UpDownCounter } from '@opentelemetry/api/build/src/metrics/Metric';
import { extractErrorMessage } from '../utils/Errors';

export class CoralTelemetry {
    private readonly upDownCounters = new Map<string, UpDownCounter>();
    private readonly histograms = new Map<string, Histogram>();
    private readonly gauges = new Map<string, ObservableGauge>();

    constructor(
        readonly scope: string,
        private readonly meter?: Meter,
        private readonly tracer?: Tracer,
    ) {}

    count(name: string, value: number, options?: MetricOptions, attributes?: Attributes): void {
        this.getOrCreateUpDownCounter(name, options)?.add(value, attributes);
    }

    countBoolean(name: string, value: boolean, options?: MetricOptions, attributes?: Attributes): void {
        this.getOrCreateUpDownCounter(name, options)?.add(value ? 1 : 0, attributes);
    }

    histogram(name: string, value: number, options?: MetricOptions, attributes?: Attributes): void {
        this.getOrCreateHistogram(name, options)?.record(value, attributes);
    }

    registerGaugeProvider(name: string, provider: () => number, options?: MetricOptions): void {
        if (!this.meter) {
            return;
        }

        const gauge = this.meter.createObservableGauge(name, options);
        this.gauges.set(name, gauge);

        // Register the callback to provide the gauge value
        this.meter.addBatchObservableCallback(
            (observableResult) => {
                try {
                    const value = provider();
                    observableResult.observe(gauge, value);
                } catch {
                    // Silently ignore errors in gauge providers to avoid crashing the system
                }
            },
            [gauge],
        );
    }

    withSpan<T>(name: string, fn: (span?: Span) => T, attributes?: Attributes, parent?: Span): T {
        if (!this.tracer) {
            return fn();
        }

        const parentContext = parent ? trace.setSpan(context.active(), parent) : context.active();
        const span = this.tracer.startSpan(name, { attributes }, parentContext);

        try {
            return context.with(trace.setSpan(context.active(), span), () => fn(span));
        } catch (error) {
            const err = error instanceof Error ? error : new Error(extractErrorMessage(error));
            span.recordException(err);
            throw error;
        } finally {
            span.end();
        }
    }

    async withSpanAsync<T>(
        name: string,
        fn: (span?: Span) => Promise<T>,
        attributes?: Attributes,
        parent?: Span,
    ): Promise<T> {
        if (!this.tracer) {
            return await fn();
        }

        const parentContext = parent ? trace.setSpan(context.active(), parent) : context.active();
        const span = this.tracer.startSpan(name, { attributes }, parentContext);

        try {
            return await context.with(trace.setSpan(context.active(), span), () => fn(span));
        } catch (error) {
            const err = error instanceof Error ? error : new Error(extractErrorMessage(error));
            span.recordException(err);
            throw error;
        } finally {
            span.end();
        }
    }

    time<T>(name: string, fn: () => T, options?: MetricOptions, attributes?: Attributes): T {
        const startTime = performance.now();
        try {
            return fn();
        } finally {
            const duration = performance.now() - startTime;
            this.histogram(`${name}.latency`, duration, { unit: 'ms', ...options }, attributes);
        }
    }

    async timeAsync<T>(
        name: string,
        fn: () => Promise<T>,
        options?: MetricOptions,
        attributes?: Attributes,
    ): Promise<T> {
        const startTime = performance.now();
        try {
            return await fn();
        } finally {
            const duration = performance.now() - startTime;
            this.histogram(`${name}.latency`, duration, { unit: 'ms', ...options }, attributes);
        }
    }

    trackExecution<T>(name: string, fn: () => T, options?: MetricOptions, attributes?: Attributes): T {
        this.countBoolean(`${name}.call`, true, { unit: '1', ...options }, attributes);
        try {
            const result = fn();
            this.countBoolean(`${name}.fault`, false, { unit: '1', ...options }, attributes);
            return result;
        } catch (error) {
            this.countBoolean(`${name}.fault`, true, { unit: '1', ...options }, attributes);
            throw error;
        }
    }

    async trackExecutionAsync<T>(
        name: string,
        fn: () => Promise<T>,
        options?: MetricOptions,
        attributes?: Attributes,
    ): Promise<T> {
        this.countBoolean(`${name}.call`, true, { unit: '1', ...options }, attributes);
        try {
            const result = await fn();
            this.countBoolean(`${name}.fault`, false, { unit: '1', ...options }, attributes);
            return result;
        } catch (error) {
            this.countBoolean(`${name}.fault`, true, { unit: '1', ...options }, attributes);
            throw error;
        }
    }

    private getOrCreateUpDownCounter(name: string, options?: MetricOptions): UpDownCounter | undefined {
        if (!this.meter) {
            return undefined;
        }

        let counter = this.upDownCounters.get(name);
        if (!counter) {
            counter = this.meter.createUpDownCounter(name, options);
            this.upDownCounters.set(name, counter);
        }
        return counter;
    }

    private getOrCreateHistogram(name: string, options?: MetricOptions): Histogram | undefined {
        if (!this.meter) {
            return undefined;
        }

        let histogram = this.histograms.get(name);
        if (!histogram) {
            histogram = this.meter.createHistogram(name, options);
            this.histograms.set(name, histogram);
        }
        return histogram;
    }

    cleanup(): void {
        this.upDownCounters.clear();
        this.histograms.clear();
        this.gauges.clear();
    }
}
