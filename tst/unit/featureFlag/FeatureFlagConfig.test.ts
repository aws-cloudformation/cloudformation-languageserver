import { describe, it, expect } from 'vitest';
import { FeatureFlagConfig } from '../../../src/featureFlag/FeatureFlagConfig';

describe('FeatureFlagConfig', () => {
    describe('constructor', () => {
        it('should create with default disabled flags when no config provided', () => {
            const config = new FeatureFlagConfig();
            expect(config.get('StaticFlag').isEnabled()).toBe(false);
            expect(config.getTargeted('EnhancedDryRun').isEnabled('us-east-1')).toBe(false);
        });

        it('should enable EnhancedDryRun with full config', () => {
            const config = new FeatureFlagConfig({
                version: 1,
                description: 'test',
                features: {
                    EnhancedDryRun: { enabled: true, fleetPercentage: 100, allowlistedRegions: ['us-east-1'] },
                },
            });
            expect(config.getTargeted('EnhancedDryRun').isEnabled('us-east-1')).toBe(true);
        });

        it('should disable EnhancedDryRun for non-allowlisted region', () => {
            const config = new FeatureFlagConfig({
                version: 1,
                description: 'test',
                features: {
                    EnhancedDryRun: { enabled: true, fleetPercentage: 100, allowlistedRegions: ['us-east-1'] },
                },
            });
            expect(config.getTargeted('EnhancedDryRun').isEnabled('us-west-2')).toBe(false);
        });

        it('should disable EnhancedDryRun when static disabled', () => {
            const config = new FeatureFlagConfig({
                version: 1,
                description: 'test',
                features: {
                    EnhancedDryRun: { enabled: false, fleetPercentage: 100, allowlistedRegions: ['us-east-1'] },
                },
            });
            expect(config.getTargeted('EnhancedDryRun').isEnabled('us-east-1')).toBe(false);
        });

        it('should disable EnhancedDryRun with 0% fleet', () => {
            const config = new FeatureFlagConfig({
                version: 1,
                description: 'test',
                features: {
                    EnhancedDryRun: { enabled: true, fleetPercentage: 0, allowlistedRegions: ['us-east-1'] },
                },
            });
            expect(config.getTargeted('EnhancedDryRun').isEnabled('us-east-1')).toBe(false);
        });

        it('should throw error for invalid config schema', () => {
            expect(() => new FeatureFlagConfig({ invalid: 'config' })).toThrow();
        });
    });

    describe('get', () => {
        it('should return feature flag by key', () => {
            const config = new FeatureFlagConfig();
            const flag = config.get('StaticFlag');
            expect(flag).toBeDefined();
            expect(flag.isEnabled).toBeDefined();
        });
    });

    describe('getTargeted', () => {
        it('should return targeted feature flag by key', () => {
            const config = new FeatureFlagConfig();
            const flag = config.getTargeted('EnhancedDryRun');
            expect(flag).toBeDefined();
            expect(flag.isEnabled).toBeDefined();
        });
    });

    describe('fromJsonString', () => {
        it('should parse valid JSON config', () => {
            const json = JSON.stringify({
                version: 1,
                description: 'test',
                features: {
                    EnhancedDryRun: { enabled: true, fleetPercentage: 100, allowlistedRegions: ['us-east-1'] },
                },
            });
            const config = FeatureFlagConfig.fromJsonString(json);
            expect(config.getTargeted('EnhancedDryRun').isEnabled('us-east-1')).toBe(true);
        });

        it('should create default config when no string provided', () => {
            const config = FeatureFlagConfig.fromJsonString();
            expect(config.get('StaticFlag').isEnabled()).toBe(false);
        });

        it('should create default config when undefined provided', () => {
            const config = FeatureFlagConfig.fromJsonString(undefined);
            expect(config.get('StaticFlag').isEnabled()).toBe(false);
        });

        it('should throw error for invalid JSON', () => {
            expect(() => FeatureFlagConfig.fromJsonString('invalid json')).toThrow();
        });
    });
});
