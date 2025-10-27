import { describe, it, expect, vi, afterEach } from 'vitest';
import { DynamicTargetedFeatureFlag } from '../../../src/featureFlag/DynamicFeatureFlag';
import { FeatureFlagSupplier } from '../../../src/featureFlag/FeatureFlagSupplier';

describe('FeatureFlagSupplier', () => {
    afterEach(() => {
        vi.restoreAllMocks();
    });

    it('should initialize with targeted feature flags', () => {
        const configSupplier = vi.fn(() => ({
            version: 1,
            description: 'test',
            features: {
                EnhancedDryRun: { enabled: true },
            },
        }));

        const supplier = new FeatureFlagSupplier(configSupplier);

        expect(supplier.featureFlags.size).toBe(0);
        expect(supplier.targetedFeatureFlags.size).toBe(1);
        expect(supplier.targetedFeatureFlags.has('EnhancedDryRun')).toBe(true);
        supplier.close();
    });

    it('should close all dynamic feature flags', () => {
        const configSupplier = vi.fn(() => ({
            version: 1,
            description: 'test',
            features: {},
        }));

        const supplier = new FeatureFlagSupplier(configSupplier);
        const closeSpy = vi.spyOn(DynamicTargetedFeatureFlag.prototype, 'close');

        supplier.close();

        expect(closeSpy).toHaveBeenCalled();
    });

    it('should handle invalid config gracefully', () => {
        const configSupplier = vi.fn(() => 'invalid');

        const supplier = new FeatureFlagSupplier(configSupplier);

        expect(supplier.targetedFeatureFlags.size).toBe(1);
        supplier.close();
    });

    it('should handle undefined config', () => {
        const configSupplier = vi.fn(() => undefined);

        const supplier = new FeatureFlagSupplier(configSupplier);

        expect(supplier.targetedFeatureFlags.size).toBe(1);
        supplier.close();
    });
});
