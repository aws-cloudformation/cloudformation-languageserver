import { performance } from 'perf_hooks';
import {
    Attributes,
    Counter,
    Gauge,
    Histogram,
    Meter,
    MetricOptions,
    ObservableGauge,
    Tracer,
    UpDownCounter,
    ValueType,
} from '@opentelemetry/api';
import { Closeable } from '../utils/Closeable';

export class ScopedTelemetry implements Closeable {
    private readonly counters = new Map<string, Counter>();
    private readonly upDownCounters = new Map<string, UpDownCounter>();
    private readonly histograms = new Map<string, Histogram>();
    private readonly gauges = new Map<string, ObservableGauge>();
    private readonly syncGauges = new Map<string, Gauge>();

    constructor(
        readonly scope: string,
        private readonly meter?: Meter,
        private readonly tracer?: Tracer,
    ) {}

    count(name: string, value: number, options?: MetricOptions, attributes?: Attributes): void {
        this.getOrCreateCounter(name, options)?.add(value, generateAttr(attributes));
    }

    countBoolean(name: string, value: boolean, options?: MetricOptions, attributes?: Attributes): void {
        this.getOrCreateCounter(name, options)?.add(value ? 1 : 0, generateAttr(attributes));
    }

    countUpDown(name: string, value: number, options?: MetricOptions, attributes?: Attributes): void {
        this.getOrCreateUpDownCounter(name, options)?.add(value, generateAttr(attributes));
    }

    countUpDownBoolean(name: string, value: boolean, options?: MetricOptions, attributes?: Attributes): void {
        this.getOrCreateUpDownCounter(name, options)?.add(value ? 1 : 0, generateAttr(attributes));
    }

    histogram(name: string, value: number, options?: MetricOptions, attributes?: Attributes): void {
        this.getOrCreateHistogram(name, options)?.record(value, generateAttr(attributes));
    }

    gauge(name: string, value: number, options?: MetricOptions, attributes?: Attributes): void {
        this.getOrCreateGauge(name, options)?.record(value, generateAttr(attributes));
    }

    registerGaugeProvider(name: string, provider: () => number, options?: MetricOptions): void {
        if (!this.meter) {
            return;
        }

        const gauge = this.meter.createObservableGauge(name, options);
        this.gauges.set(name, gauge);

        this.meter.addBatchObservableCallback(
            (observableResult) => {
                observableResult.observe(gauge, provider());
            },
            [gauge],
        );
    }

    measure<T>(name: string, fn: () => T, options?: MetricOptions, attributes?: Attributes): T {
        return this.executeWithMetrics(name, fn, false, options, attributes);
    }

    async measureAsync<T>(
        name: string,
        fn: () => Promise<T>,
        options?: MetricOptions,
        attributes?: Attributes,
    ): Promise<T> {
        return await this.executeWithMetricsAsync(name, fn, false, options, attributes);
    }

    trackExecution<T>(name: string, fn: () => T, options?: MetricOptions, attributes?: Attributes): T {
        return this.executeWithMetrics(name, fn, true, options, attributes);
    }

    async trackExecutionAsync<T>(
        name: string,
        fn: () => Promise<T>,
        options?: MetricOptions,
        attributes?: Attributes,
    ): Promise<T> {
        return await this.executeWithMetricsAsync(name, fn, true, options, attributes);
    }

    private executeWithMetrics<T>(
        name: string,
        fn: () => T,
        trackResponse: boolean,
        options?: MetricOptions,
        attributes?: Attributes,
    ): T {
        if (!this.meter) {
            return fn();
        }

        const startTime = performance.now();
        this.count(`${name}.count`, 1, { unit: '1', ...options }, attributes);
        this.count(`${name}.fault`, 0, { unit: '1', ...options }, attributes);

        try {
            const result = fn();

            if (trackResponse) this.recordResponse(name, result, options, attributes);
            return result;
        } catch (error) {
            this.count(`${name}.fault`, 1, { unit: '1', ...options }, attributes);
            throw error;
        } finally {
            this.recordDuration(name, performance.now() - startTime, options, attributes);
        }
    }

    private async executeWithMetricsAsync<T>(
        name: string,
        fn: () => Promise<T>,
        trackResponse: boolean,
        options?: MetricOptions,
        attributes?: Attributes,
    ): Promise<T> {
        if (!this.meter) {
            return await fn();
        }

        const startTime = performance.now();
        this.count(`${name}.count`, 1, { unit: '1', ...options }, attributes);
        this.count(`${name}.fault`, 0, { unit: '1', ...options }, attributes);

        try {
            const result = await fn();

            if (trackResponse) this.recordResponse(name, result, options, attributes);
            return result;
        } catch (error) {
            this.count(`${name}.fault`, 1, { unit: '1', ...options }, attributes);
            throw error;
        } finally {
            this.recordDuration(name, performance.now() - startTime, options, attributes);
        }
    }

    private recordResponse<T>(name: string, result: T, options?: MetricOptions, attributes?: Attributes): void {
        let responseType = 'value';
        if (result === undefined) {
            responseType = 'undefined';
        } else if (result === null) {
            responseType = 'null';
        } else if (Array.isArray(result)) {
            responseType = 'array';
            this.histogram(`${name}.response.type.array.size`, result.length, { unit: '1', ...options }, attributes);
        } else if (typeof result === 'object') {
            responseType = 'object';
        }

        this.count(`${name}.response.type.${responseType}`, 1, { unit: '1', ...options }, attributes);
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

    private getOrCreateCounter(name: string, options?: MetricOptions): Counter | undefined {
        if (!this.meter) {
            return undefined;
        }

        let counter = this.counters.get(name);
        if (!counter) {
            counter = this.meter.createCounter(name, options);
            this.counters.set(name, counter);
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

    private getOrCreateGauge(name: string, options?: MetricOptions): Gauge | undefined {
        if (!this.meter) {
            return undefined;
        }

        let gauge = this.syncGauges.get(name);
        if (!gauge) {
            gauge = this.meter.createGauge(name, options);
            this.syncGauges.set(name, gauge);
        }
        return gauge;
    }

    private recordDuration(name: string, duration: number, options?: MetricOptions, attributes?: Attributes) {
        this.histogram(
            `${name}.duration`,
            duration,
            { unit: 'ms', valueType: ValueType.DOUBLE, ...options },
            attributes,
        );
    }

    close(): void {
        this.counters.clear();
        this.upDownCounters.clear();
        this.histograms.clear();
        this.gauges.clear();
        this.syncGauges.clear();
    }
}

const AwsEmfStorageResolution = 1; // High-resolution metrics (1-second granularity) https://github.com/open-telemetry/opentelemetry-collector-contrib/tree/main/exporter/awsemfexporter#metric-attributes
function generateAttr(attributes?: Attributes): Attributes {
    return { 'aws.emf.storage_resolution': AwsEmfStorageResolution, ...attributes };
}
