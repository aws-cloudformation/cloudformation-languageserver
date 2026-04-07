import { performance } from 'perf_hooks';
import {
    Attributes,
    Counter,
    Histogram,
    Meter,
    MetricOptions,
    ObservableGauge,
    Tracer,
    UpDownCounter,
    ValueType,
} from '@opentelemetry/api';
import { Closeable } from '../utils/Closeable';
import { errorAttributes } from '../utils/Errors';
import { typeOf } from '../utils/TypeCheck';
import { TelemetryContext } from './TelemetryContext';

export interface MetricConfig extends MetricOptions {
    trackObjectKey?: string;
    attributes?: Attributes;
    captureErrorAttributes?: boolean;
    captureErrorType?: boolean;
}

export class ScopedTelemetry implements Closeable {
    private readonly counters = new Map<string, Counter>();
    private readonly upDownCounters = new Map<string, UpDownCounter>();
    private readonly histograms = new Map<string, Histogram>();
    private readonly gauges = new Map<string, ObservableGauge>();

    private constructor(
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

    histogram(name: string, value: number, config?: MetricConfig): void {
        const { options, attributes } = generateConfig(config);
        this.getOrCreateHistogram(name, options)?.record(value, attributes);
    }

    error(name: string, error: unknown, origin?: 'uncaughtException' | 'unhandledRejection', config?: MetricConfig) {
        if (config?.captureErrorAttributes) {
            config.attributes = {
                ...config.attributes,
                ...errorAttributes(error, origin),
            };
        } else if (config?.captureErrorType) {
            config.attributes = {
                ...config.attributes,
                'error.type': error instanceof Error ? error.name : typeof error,
            };
        }
        this.count(name, 1, config);
    }

    registerGaugeProvider(name: string, provider: () => number, config?: MetricConfig): void {
        if (!this.meter) {
            return;
        }

        const gauge = this.getOrCreateGauge(name, generateConfig(config).options);
        if (!gauge) {
            return;
        }

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

    countExecution<T>(name: string, fn: () => T, config?: MetricConfig): T {
        this.count(`${name}.count`, 1, config);
        this.count(`${name}.fault`, 0, config);
        try {
            return fn();
        } catch (error) {
            this.error(`${name}.fault`, error, undefined, config);
            throw error;
        }
    }

    async countExecutionAsync<T>(name: string, fn: () => Promise<T>, config?: MetricConfig): Promise<T> {
        this.count(`${name}.count`, 1, config);
        this.count(`${name}.fault`, 0, config);
        try {
            return await fn();
        } catch (error) {
            this.error(`${name}.fault`, error, undefined, config);
            throw error;
        }
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
            this.error(`${name}.fault`, error, undefined, config);
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
            this.error(`${name}.fault`, error, undefined, config);
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

    private recordDuration(name: string, duration: number, config?: MetricConfig) {
        this.histogram(`${name}.duration`, duration, {
            ...config,
            unit: 'ms',
            valueType: ValueType.DOUBLE,
        });
    }

    /**
     * ================================================
     * Create the OTEL instruments with configured options
     * ============================================
     */
    private getOrCreateUpDownCounter(name: string, options?: MetricOptions): UpDownCounter | undefined {
        if (!this.meter) {
            return undefined;
        }

        const sanitized = sanitizeMetricName(name);
        let counter = this.upDownCounters.get(sanitized);
        if (!counter) {
            counter = this.meter.createUpDownCounter(sanitized, options);
            this.upDownCounters.set(sanitized, counter);
        }
        return counter;
    }

    private getOrCreateCounter(name: string, options?: MetricOptions): Counter | undefined {
        if (!this.meter) {
            return undefined;
        }

        const sanitized = sanitizeMetricName(name);
        let counter = this.counters.get(sanitized);
        if (!counter) {
            counter = this.meter.createCounter(sanitized, options);
            this.counters.set(sanitized, counter);
        }
        return counter;
    }

    private getOrCreateHistogram(name: string, options?: MetricOptions): Histogram | undefined {
        if (!this.meter) {
            return undefined;
        }

        const sanitized = sanitizeMetricName(name);
        let histogram = this.histograms.get(sanitized);
        if (!histogram) {
            histogram = this.meter.createHistogram(sanitized, options);
            this.histograms.set(sanitized, histogram);
        }
        return histogram;
    }

    private getOrCreateGauge(name: string, options?: MetricOptions): ObservableGauge | undefined {
        if (!this.meter) {
            return undefined;
        }

        const sanitized = sanitizeMetricName(name);
        let gauge = this.gauges.get(sanitized);
        if (!gauge) {
            gauge = this.meter.createObservableGauge(sanitized, options);
            this.gauges.set(sanitized, gauge);
        }

        return gauge;
    }

    close(): void {
        this.counters.clear();
        this.upDownCounters.clear();
        this.histograms.clear();
        this.gauges.clear();
    }
}

/**
 * Sanitizes a metric name to comply with OpenTelemetry naming rules.
 * Valid names must match: /^[a-z][a-z0-9_.\-/]{0,254}$/i
 * - https://github.com/open-telemetry/opentelemetry-js/blob/f7cd6ab6e2bc6224738b1e7dc78e53794cf64668/packages/sdk-metrics/src/InstrumentDescriptor.ts#L97
 */
function sanitizeMetricName(name: string): string {
    return name.replaceAll(/[^a-zA-Z0-9._-]/g, '_').slice(0, 255);
}

function generateConfig(config?: MetricConfig): { options: MetricOptions; attributes: Attributes } {
    const { attributes = {}, unit = '1', valueType = ValueType.DOUBLE, description, advice } = config ?? {};
    return {
        options: { unit, valueType, description, advice },
        attributes: generateAttr(attributes),
    };
}

function generateAttr(attributes?: Attributes): Attributes {
    return {
        'aws.emf.storage_resolution': 1, // High-resolution metrics (1-second granularity) https://github.com/open-telemetry/opentelemetry-collector-contrib/tree/main/exporter/awsemfexporter#metric-attributes
        ...TelemetryContext.getContext(),
        ...attributes,
    };
}
