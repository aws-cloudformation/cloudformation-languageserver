import { describe, it, expect } from 'vitest';
import { FeatureFlagConfig } from '../../../src/featureFlag/FeatureFlagConfig';

describe('FeatureFlagConfig', () => {
    describe('constructor', () => {
        it('should create with default disabled flags when no config provided', () => {
            const config = new FeatureFlagConfig();
            expect(config.get('EnhancedDryRun').isEnabled()).toBe(false);
            expect(config.get('AnotherFeature').isEnabled()).toBe(false);
        });

        it('should enable static feature from config', () => {
            const config = new FeatureFlagConfig({
                version: 1,
                description: 'test',
                features: {
                    EnhancedDryRun: { enabled: true },
                },
            });
            expect(config.get('EnhancedDryRun').isEnabled()).toBe(true);
        });

        it('should enable localhost targeted feature with 100% fleet', () => {
            const config = new FeatureFlagConfig({
                version: 1,
                description: 'test',
                features: {
                    AnotherFeature: { enabled: true, fleetPercentage: 100 },
                },
            });
            expect(config.get('AnotherFeature').isEnabled()).toBe(true);
        });

        it('should disable localhost targeted feature when static disabled', () => {
            const config = new FeatureFlagConfig({
                version: 1,
                description: 'test',
                features: {
                    AnotherFeature: { enabled: false, fleetPercentage: 100 },
                },
            });
            expect(config.get('AnotherFeature').isEnabled()).toBe(false);
        });

        it('should disable localhost targeted feature with 0% fleet', () => {
            const config = new FeatureFlagConfig({
                version: 1,
                description: 'test',
                features: {
                    AnotherFeature: { enabled: true, fleetPercentage: 0 },
                },
            });
            expect(config.get('AnotherFeature').isEnabled()).toBe(false);
        });

        it('should throw error for invalid config schema', () => {
            expect(() => new FeatureFlagConfig({ invalid: 'config' })).toThrow();
        });
    });

    describe('get', () => {
        it('should return feature flag by key', () => {
            const config = new FeatureFlagConfig();
            const flag = config.get('EnhancedDryRun');
            expect(flag).toBeDefined();
            expect(flag.isEnabled).toBeDefined();
        });
    });

    describe('getTargeted', () => {
        it('should return targeted feature flag by key', () => {
            const config = new FeatureFlagConfig();
            const flag = config.getTargeted('AnotherFeature');
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
                    EnhancedDryRun: { enabled: true },
                },
            });
            const config = FeatureFlagConfig.fromJsonString(json);
            expect(config.get('EnhancedDryRun').isEnabled()).toBe(true);
        });

        it('should create default config when no string provided', () => {
            const config = FeatureFlagConfig.fromJsonString();
            expect(config.get('EnhancedDryRun').isEnabled()).toBe(false);
        });

        it('should create default config when undefined provided', () => {
            const config = FeatureFlagConfig.fromJsonString(undefined);
            expect(config.get('EnhancedDryRun').isEnabled()).toBe(false);
        });

        it('should throw error for invalid JSON', () => {
            expect(() => FeatureFlagConfig.fromJsonString('invalid json')).toThrow();
        });
    });
});
