import { describe, it, expect, vi, afterEach } from 'vitest';
import { DynamicTargetedFeatureFlag } from '../../../src/featureFlag/DynamicFeatureFlag';
import { FeatureFlagSupplier } from '../../../src/featureFlag/FeatureFlagSupplier';

describe('FeatureFlagSupplier', () => {
    const configSupplier = () => {
        return {
            version: 1,
            description: 'test',
            features: {
                EnhancedDryRun: { enabled: true, fleetPercentage: 100, allowlistedRegions: ['us-east-1'] },
                Constants: { enabled: false },
            },
        };
    };

    const throwError = () => {
        throw new Error('Error fallback');
    };

    afterEach(() => {
        vi.restoreAllMocks();
    });

    it('should initialize with feature flags', () => {
        const supplier = new FeatureFlagSupplier(configSupplier, throwError);

        expect([...supplier.featureFlags.keys()]).toEqual(['Constants']);
        expect(supplier.featureFlags.get('Constants')?.isEnabled()).toBe(false);

        expect([...supplier.targetedFeatureFlags.keys()]).toEqual(['EnhancedDryRun']);
        expect(supplier.targetedFeatureFlags.get('EnhancedDryRun')?.isEnabled('us-east-1')).toBe(true);
        expect(supplier.targetedFeatureFlags.get('EnhancedDryRun')?.isEnabled('us-east-2')).toBe(false);

        supplier.close();
    });

    it('should close all dynamic feature flags', () => {
        const supplier = new FeatureFlagSupplier(
            () => {
                return { version: 1, description: 'test', features: {} };
            },
            () => {},
        );
        const closeSpy = vi.spyOn(DynamicTargetedFeatureFlag.prototype, 'close');

        supplier.close();

        expect(closeSpy).toHaveBeenCalled();
    });

    it('should handle invalid config and fallback to default', () => {
        const supplier = new FeatureFlagSupplier(() => 'invalid', configSupplier);

        expect([...supplier.featureFlags.keys()]).toEqual(['Constants']);
        expect([...supplier.targetedFeatureFlags.keys()]).toEqual(['EnhancedDryRun']);

        supplier.close();
    });

    it('should handle undefined config', () => {
        const supplier = new FeatureFlagSupplier(() => undefined, configSupplier);

        expect([...supplier.featureFlags.keys()]).toEqual(['Constants']);
        expect([...supplier.targetedFeatureFlags.keys()]).toEqual(['EnhancedDryRun']);

        supplier.close();
    });

    it('throws if both suppliers fail', () => {
        expect(
            () =>
                new FeatureFlagSupplier(
                    () => undefined,
                    () => undefined,
                ),
        ).toThrow(
            '[\n' +
                '  {\n' +
                '    "expected": "object",\n' +
                '    "code": "invalid_type",\n' +
                '    "path": [],\n' +
                '    "message": "Invalid input: expected object, received undefined"\n' +
                '  }\n' +
                ']',
        );
    });
});
