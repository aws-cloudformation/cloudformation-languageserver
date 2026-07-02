import { describe, it, expect, vi, afterEach } from 'vitest';

const RandomGeneratedId = 'SomeRandomId';

async function loadWithMocks() {
    vi.resetModules();

    const otelSdk = vi.fn(() => ({
        metricsReader: { forceFlush: vi.fn().mockResolvedValue(undefined) },
        sdk: { start: vi.fn(), shutdown: vi.fn().mockResolvedValue(undefined) },
    }));
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
    return { TelemetryService, otelSdk };
}

describe('TelemetryService', () => {
    const ProvidedId = 'provided-client-id';
    const Extension = { name: 'my-ide', version: '2.0.0' };

    afterEach(() => {
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

    it('does not call otelSDK if telemetry is disabled', async () => {
        const { TelemetryService, otelSdk } = await loadWithMocks();

        TelemetryService.initialize(undefined, {
            telemetryEnabled: false,
        });

        expect(otelSdk).not.toHaveBeenCalledWith(expect.anything(), expect.anything(), expect.anything());
    });
});
