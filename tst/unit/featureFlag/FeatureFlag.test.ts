import { describe, it, expect } from 'vitest';
import {
    StaticFeatureFlag,
    FleetTargetedFeatureFlag,
    RegionAllowlistFeatureFlag,
} from '../../../src/featureFlag/FeatureFlag';
import { AwsRegion } from '../../../src/utils/Region';

describe('StaticFeatureFlag', () => {
    it('should return enabled state when true', () => {
        const flag = new StaticFeatureFlag('test-feature', true);
        expect(flag.isEnabled()).toBe(true);
    });

    it('should return enabled state when false', () => {
        const flag = new StaticFeatureFlag('test-feature', false);
        expect(flag.isEnabled()).toBe(false);
    });

    it('should describe itself correctly', () => {
        const flag = new StaticFeatureFlag('my-feature', true);
        expect(flag.describe()).toBe('StaticFeatureFlag(feature=my-feature, enabled=true)');
    });
});

describe('FleetTargetedFeatureFlag', () => {
    it('should enable for 100% percentage', () => {
        const flag = new FleetTargetedFeatureFlag('test-feature', 100);
        expect(flag.isEnabled('any-hostname')).toBe(true);
    });

    it('should disable for 0% percentage', () => {
        const flag = new FleetTargetedFeatureFlag('test-feature', 0);
        expect(flag.isEnabled('any-hostname')).toBe(false);
    });

    it('should consistently return same result for same hostname', () => {
        const flag = new FleetTargetedFeatureFlag('test-feature', 50);
        const hostname = 'test-host-123';
        const result1 = flag.isEnabled(hostname);
        const result2 = flag.isEnabled(hostname);
        expect(result1).toBe(result2);
    });

    it('should describe itself correctly', () => {
        const flag = new FleetTargetedFeatureFlag('my-feature', 75);
        expect(flag.describe()).toBe('FleetTargetedFeatureFlag(feature=my-feature, percentage=75)');
    });
});

describe('RegionAllowlistFeatureFlag', () => {
    it('should enable for allowlisted region', () => {
        const flag = new RegionAllowlistFeatureFlag('test-feature', [AwsRegion.US_EAST_1]);
        expect(flag.isEnabled('us-east-1')).toBe(true);
    });

    it('should disable for non-allowlisted region', () => {
        const flag = new RegionAllowlistFeatureFlag('test-feature', [AwsRegion.US_EAST_1]);
        expect(flag.isEnabled('us-west-2')).toBe(false);
    });

    it('should handle multiple allowlisted regions', () => {
        const flag = new RegionAllowlistFeatureFlag('test-feature', [AwsRegion.US_EAST_1, AwsRegion.EU_WEST_1]);
        expect(flag.isEnabled('us-east-1')).toBe(true);
        expect(flag.isEnabled('eu-west-1')).toBe(true);
        expect(flag.isEnabled('ap-south-1')).toBe(false);
    });

    it('should return false for invalid region', () => {
        const flag = new RegionAllowlistFeatureFlag('test-feature', [AwsRegion.US_EAST_1]);
        expect(flag.isEnabled('invalid-region')).toBe(false);
    });

    it('should describe itself correctly', () => {
        const flag = new RegionAllowlistFeatureFlag('my-feature', [AwsRegion.US_EAST_1, AwsRegion.EU_WEST_1]);
        const description = flag.describe();
        expect(description).toContain('RegionAllowlistFeatureFlag');
        expect(description).toContain('my-feature');
        expect(description).toContain('us-east-1');
        expect(description).toContain('eu-west-1');
    });
});
