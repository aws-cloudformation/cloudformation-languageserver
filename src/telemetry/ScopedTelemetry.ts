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
    MetricAdvice,
} from '@opentelemetry/api';
import { Closeable } from '../utils/Closeable';
import { typeOf } from '../utils/TypeCheck';

export type MetricConfig = {
    description?: string;
    unit?: string;
    valueType?: ValueType;
    advice?: MetricAdvice;
    trackObjectKey?: string;
    attributes?: Attributes;
};

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

    count(name: string, value: number, config?: MetricConfig): void {
        const { options, attributes } = generateConfig(config);
        this.getOrCreateCounter(name, options)?.add(value, attributes);
    }

    countBoolean(name: string, value: boolean, config?: MetricConfig): void {
        const { options, attributes } = generateConfig(config);
        this.getOrCreateCounter(name, options)?.add(value ? 1 : 0, attributes);
    }

    countUpDown(name: string, value: number, config?: MetricConfig): void {
        const { options, attributes } = generateConfig(config);
        this.getOrCreateUpDownCounter(name, options)?.add(value, attributes);
    }

    countUpDownBoolean(name: string, value: boolean, config?: MetricConfig): void {
        const { options, attributes } = generateConfig(config);
        this.getOrCreateUpDownCounter(name, options)?.add(value ? 1 : 0, attributes);
    }

    histogram(name: string, value: number, config?: MetricConfig): void {
        const { options, attributes } = generateConfig(config);
        this.getOrCreateHistogram(name, options)?.record(value, attributes);
    }

    gauge(name: string, value: number, config?: MetricConfig): void {
        const { options, attributes } = generateConfig(config);
        this.getOrCreateGauge(name, options)?.record(value, attributes);
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

    measure<T>(name: string, fn: () => T, config?: MetricConfig): T {
        return this.executeWithMetrics(name, fn, false, config);
    }

    async measureAsync<T>(name: string, fn: () => Promise<T>, config?: MetricConfig): Promise<T> {
        return await this.executeWithMetricsAsync(name, fn, false, config);
    }

    trackExecution<T>(name: string, fn: () => T, config?: MetricConfig): T {
        return this.executeWithMetrics(name, fn, true, config);
    }

    async trackExecutionAsync<T>(name: string, fn: () => Promise<T>, config?: MetricConfig): Promise<T> {
        return await this.executeWithMetricsAsync(name, fn, true, config);
    }

    private executeWithMetrics<T>(name: string, fn: () => T, trackResponse: boolean, config?: MetricConfig): T {
        if (!this.meter) {
            return fn();
        }

        const startTime = performance.now();
        this.count(`${name}.count`, 1, config);
        this.count(`${name}.fault`, 0, config);

        try {
            const result = fn();

            if (trackResponse) this.recordResponse(name, result, config);
            return result;
        } catch (error) {
            this.count(`${name}.fault`, 1, config);
            throw error;
        } finally {
            this.recordDuration(name, performance.now() - startTime, config);
        }
    }

    private async executeWithMetricsAsync<T>(
        name: string,
        fn: () => Promise<T>,
        trackResponse: boolean,
        config?: MetricConfig,
    ): Promise<T> {
        if (!this.meter) {
            return await fn();
        }

        const startTime = performance.now();
        this.count(`${name}.count`, 1, config);
        this.count(`${name}.fault`, 0, config);

        try {
            const result = await fn();

            if (trackResponse) this.recordResponse(name, result, config);
            return result;
        } catch (error) {
            this.count(`${name}.fault`, 1, config);
            throw error;
        } finally {
            this.recordDuration(name, performance.now() - startTime, config);
        }
    }

    private recordResponse<T>(name: string, result: T, config?: MetricConfig): void {
        const trackObjectKey = config?.trackObjectKey;
        const value =
            trackObjectKey && result && typeof result === 'object' ? result[trackObjectKey as keyof T] : result;
        const { type, size } = typeOf(value);

        if (size !== undefined) {
            this.histogram(`${name}.response.type.size`, size, config);
        }

        this.count(`${name}.response.type.${type}`, 1, config);
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

    private recordDuration(name: string, duration: number, config?: MetricConfig) {
        this.histogram(`${name}.duration`, duration, {
            unit: 'ms',
            valueType: ValueType.DOUBLE,
            ...config,
        });
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

function generateConfig(config?: MetricConfig) {
    const { attributes = {}, unit = '1', valueType = ValueType.INT, ...options } = config ?? {};
    return {
        options: { unit, valueType, ...options },
        attributes: generateAttr(attributes),
    };
}

function generateAttr(attributes?: Attributes): Attributes {
    return { 'aws.emf.storage_resolution': AwsEmfStorageResolution, ...attributes };
}
