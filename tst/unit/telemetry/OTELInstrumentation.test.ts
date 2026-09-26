import { diag } from '@opentelemetry/api';
import { RuntimeNodeInstrumentation } from '@opentelemetry/instrumentation-runtime-node';
import {
    AggregationTemporality,
    InMemoryMetricExporter,
    MeterProvider,
    PeriodicExportingMetricReader,
} from '@opentelemetry/sdk-metrics';
import { describe, it, expect, afterEach, vi } from 'vitest';
import type { OtelSdk } from '../../../src/telemetry/OTELInstrumentation';

// tst/setup.ts already loaded OTELInstrumentation with the real exporter, so the module is re-imported after
// swapping the exporter for an in-memory one that records its constructor options.
async function loadOtelSdk() {
    vi.resetModules();
    const exporterOptions: unknown[] = [];
    vi.doMock('@opentelemetry/exporter-metrics-otlp-http', () => ({
        OTLPMetricExporter: class extends InMemoryMetricExporter {
            constructor(options: unknown) {
                super(AggregationTemporality.DELTA);
                exporterOptions.push(options);
            }
        },
    }));
    const { otelSdk } = await import('../../../src/telemetry/OTELInstrumentation');
    return { otelSdk, exporterOptions };
}

describe('otelSdk', () => {
    const ClientId = 'client-id';
    let sdk: OtelSdk;

    afterEach(async () => {
        sdk.instrumentation.disable();
        await sdk.meterProvider.shutdown();
        diag.disable();
    });

    it('builds a metrics-only pipeline with a periodic OTLP reader and the runtime instrumentation', async () => {
        const { otelSdk } = await loadOtelSdk();

        sdk = otelSdk(ClientId);

        expect(sdk.meterProvider).toBeInstanceOf(MeterProvider);
        expect(sdk.metricsReader).toBeInstanceOf(PeriodicExportingMetricReader);
        expect(sdk.instrumentation).toBeInstanceOf(RuntimeNodeInstrumentation);
        expect(sdk.instrumentation.getConfig().monitoringPrecision).toBe(60_000);
    });

    it('exports delta metrics to the environment telemetry endpoint', async () => {
        const { otelSdk, exporterOptions } = await loadOtelSdk();

        sdk = otelSdk(ClientId);

        expect(exporterOptions).toEqual([
            {
                url: 'http://localhost:1234/v1/metrics',
                temporalityPreference: AggregationTemporality.DELTA,
            },
        ]);
    });

    it('collects runtime metrics through the reader once the instrumentation is bound to the provider', async () => {
        const { otelSdk } = await loadOtelSdk();
        sdk = otelSdk(ClientId, { name: 'editor', version: '1.0' }, { name: 'extension', version: '2.0' });
        sdk.instrumentation.setMeterProvider(sdk.meterProvider);

        const { resourceMetrics, errors } = await sdk.metricsReader.collect();

        expect(errors).toEqual([]);
        expect(resourceMetrics.scopeMetrics.map((scope) => scope.scope.name)).toContain(
            '@opentelemetry/instrumentation-runtime-node',
        );
        expect(resourceMetrics.resource.attributes).toMatchObject({
            'client.id': ClientId,
            'client.type': 'editor-1.0',
            'aws.client.type': 'extension-2.0',
        });
    });
});
