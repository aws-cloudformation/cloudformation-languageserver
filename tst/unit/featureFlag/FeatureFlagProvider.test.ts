import { readFileSync } from 'fs';
import { join } from 'path';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { FeatureFlagConfigSchema } from '../../../src/featureFlag/FeatureFlagBuilder';
import { FeatureFlagProvider } from '../../../src/featureFlag/FeatureFlagProvider';
import { ScopedTelemetry } from '../../../src/telemetry/ScopedTelemetry';

describe('FeatureFlagProvider', () => {
    it('can parse feature flags', () => {
        [
            join(__dirname, '..', '..', '..', 'assets', 'featureFlag', 'alpha.json'),
            join(__dirname, '..', '..', '..', 'assets', 'featureFlag', 'beta.json'),
            join(__dirname, '..', '..', '..', 'assets', 'featureFlag', 'prod.json'),
        ].map((path) => {
            const file = readFileSync(path, 'utf8');
            expect(file).toBeDefined();
            expect(FeatureFlagConfigSchema.parse(JSON.parse(file))).toBeDefined();
        });
    });

    describe('gauge registration', () => {
        let provider: FeatureFlagProvider;
        let registerGaugeProviderSpy: ReturnType<typeof vi.spyOn>;

        beforeEach(() => {
            registerGaugeProviderSpy = vi.spyOn(ScopedTelemetry.prototype, 'registerGaugeProvider');
        });

        afterEach(() => {
            provider?.close();
            vi.restoreAllMocks();
        });

        it('registers gauges for each feature flag', () => {
            provider = new FeatureFlagProvider(
                () => Promise.resolve({ features: { Constants: { enabled: true } } }),
                join(__dirname, '..', '..', '..', 'assets', 'featureFlag', 'alpha.json'),
            );

            expect(registerGaugeProviderSpy).toHaveBeenCalledWith(
                'featureFlag.Constants',
                expect.any(Function),
                expect.objectContaining({ description: 'State of Constants feature flag' }),
            );
        });

        it('gauge provider reflects current flag state', () => {
            provider = new FeatureFlagProvider(
                () => Promise.resolve({ features: { Constants: { enabled: false } } }),
                join(__dirname, '..', '..', '..', 'assets', 'featureFlag', 'alpha.json'),
            );

            const gaugeProvider = registerGaugeProviderSpy.mock.calls[0][1] as () => number;
            // Alpha config has Constants disabled
            expect(gaugeProvider()).toBe(0);
        });
    });
});
