import { metrics } from '@opentelemetry/api';
import { describe, it, expect, vi, afterEach } from 'vitest';

const RandomGeneratedId = 'SomeRandomId';

function mockOtelSdk() {
    return {
        meterProvider: { getMeter: vi.fn(), shutdown: vi.fn().mockResolvedValue(undefined) },
        metricsReader: { forceFlush: vi.fn().mockResolvedValue(undefined) },
        instrumentation: { setMeterProvider: vi.fn(), disable: vi.fn() },
    };
}

async function loadWithMocks() {
    vi.resetModules();

    const sdk = mockOtelSdk();
    const otelSdk = vi.fn(() => sdk);
    vi.doMock('../../../src/telemetry/OTELInstrumentation', () => ({ otelSdk }));

    vi.doMock('../../../src/telemetry/LoggerFactory', () => ({
        LoggerFactory: {
            getLogger: () => ({ info: vi.fn(), error: vi.fn(), warn: vi.fn(), debug: vi.fn() }),
            isPinoStreamError: () => false,
        },
    }));

    vi.doMock('crypto', async (importOriginal) => {
        const actual = await importOriginal<typeof import('crypto')>();
        return { ...actual, randomUUID: vi.fn(() => RandomGeneratedId) };
    });

    const { TelemetryService } = await import('../../../src/telemetry/TelemetryService');
    return { TelemetryService, otelSdk, sdk };
}

describe('TelemetryService', () => {
    const ProvidedId = 'provided-client-id';
    const Extension = { name: 'my-ide', version: '2.0.0' };

    afterEach(() => {
        metrics.disable();
        vi.clearAllMocks();
    });

    it('uses the provided clientId when one is supplied', async () => {
        const { TelemetryService, otelSdk } = await loadWithMocks();

        TelemetryService.initialize(undefined, {
            telemetryEnabled: true,
            clientInfo: { clientId: ProvidedId, extension: Extension },
        });

        expect(otelSdk).toHaveBeenCalledWith(ProvidedId, undefined, Extension);
        expect(otelSdk).not.toHaveBeenCalledWith(RandomGeneratedId, expect.anything(), expect.anything());
    });

    it('generates a clientId when none is provided', async () => {
        const { TelemetryService, otelSdk } = await loadWithMocks();

        TelemetryService.initialize(undefined, { telemetryEnabled: true });

        expect(otelSdk).toHaveBeenCalledWith(RandomGeneratedId, undefined, undefined);
        expect(otelSdk).not.toHaveBeenCalledWith(ProvidedId, expect.anything(), expect.anything());
    });

    it('registers the meter provider globally and hands it to the instrumentation', async () => {
        const { TelemetryService, sdk } = await loadWithMocks();

        TelemetryService.initialize(undefined, { telemetryEnabled: true });

        expect(sdk.instrumentation.setMeterProvider).toHaveBeenCalledWith(sdk.meterProvider);
        expect(metrics.getMeterProvider()).toBe(sdk.meterProvider);
    });

    it('flushes pending metrics, then stops the instrumentation and the provider on close', async () => {
        const { TelemetryService, sdk } = await loadWithMocks();
        TelemetryService.initialize(undefined, { telemetryEnabled: true });
        const order: string[] = [];
        sdk.metricsReader.forceFlush.mockImplementation(() => {
            order.push('flush');
            return Promise.resolve();
        });
        sdk.instrumentation.disable.mockImplementation(() => order.push('disable'));
        sdk.meterProvider.shutdown.mockImplementation(() => {
            order.push('shutdown');
            return Promise.resolve();
        });

        await TelemetryService.instance.close();

        expect(order).toEqual(['flush', 'disable', 'shutdown']);
    });

    it('still shuts the provider down when the flush fails', async () => {
        const { TelemetryService, sdk } = await loadWithMocks();
        TelemetryService.initialize(undefined, { telemetryEnabled: true });
        sdk.metricsReader.forceFlush.mockRejectedValue(new Error('export failed'));

        await expect(TelemetryService.instance.close()).resolves.toBeUndefined();

        expect(sdk.instrumentation.disable).toHaveBeenCalledOnce();
        expect(sdk.meterProvider.shutdown).toHaveBeenCalledOnce();
    });

    it('does not call otelSDK if telemetry is disabled', async () => {
        const { TelemetryService, otelSdk, sdk } = await loadWithMocks();

        TelemetryService.initialize(undefined, {
            telemetryEnabled: false,
        });
        await TelemetryService.instance.close();

        expect(otelSdk).not.toHaveBeenCalled();
        expect(sdk.meterProvider.shutdown).not.toHaveBeenCalled();
    });
});
