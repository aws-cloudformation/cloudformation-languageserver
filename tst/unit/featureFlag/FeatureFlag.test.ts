import { describe, it, expect } from 'vitest';
import { AndFeatureFlag, LocalHostTargetedFeatureFlag } from '../../../src/featureFlag/CombinedFeatureFlags';
import {
    StaticFeatureFlag,
    FleetTargetedFeatureFlag,
    RegionAllowlistFeatureFlag,
} from '../../../src/featureFlag/FeatureFlag';
import { buildLocalHost } from '../../../src/featureFlag/FeatureFlagBuilder';
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

describe('AndFeatureFlag', () => {
    it('should return true when all flags are enabled', () => {
        const flag = new AndFeatureFlag(new StaticFeatureFlag('a', true), new StaticFeatureFlag('b', true));
        expect(flag.isEnabled()).toBe(true);
    });

    it('should return false when any flag is disabled', () => {
        const flag = new AndFeatureFlag(new StaticFeatureFlag('a', true), new StaticFeatureFlag('b', false));
        expect(flag.isEnabled()).toBe(false);
    });

    it('should throw when constructed with no flags', () => {
        expect(() => new AndFeatureFlag()).toThrow('1 or more feature flags required');
    });

    it('should describe all child flags', () => {
        const flag = new AndFeatureFlag(new StaticFeatureFlag('a', true), new StaticFeatureFlag('b', false));
        expect(flag.describe()).toContain('a');
        expect(flag.describe()).toContain('b');
    });
});

describe('LocalHostTargetedFeatureFlag', () => {
    it('should be enabled at 100% fleet percentage', () => {
        const flag = new LocalHostTargetedFeatureFlag(new FleetTargetedFeatureFlag('test', 100));
        expect(flag.isEnabled()).toBe(true);
    });

    it('should be disabled at 0% fleet percentage', () => {
        const flag = new LocalHostTargetedFeatureFlag(new FleetTargetedFeatureFlag('test', 0));
        expect(flag.isEnabled()).toBe(false);
    });

    it('should return consistent results across calls', () => {
        const flag = new LocalHostTargetedFeatureFlag(new FleetTargetedFeatureFlag('test', 50));
        expect(flag.isEnabled()).toBe(flag.isEnabled());
    });

    it('should describe itself with fleet info', () => {
        const flag = new LocalHostTargetedFeatureFlag(new FleetTargetedFeatureFlag('test', 75));
        expect(flag.describe()).toContain('LocalHostTargetedFeatureFlag');
        expect(flag.describe()).toContain('75');
    });
});

describe('buildLocalHost', () => {
    it('should return enabled flag when enabled with 100% fleet', () => {
        const flag = buildLocalHost('FileDb', { enabled: true, fleetPercentage: 100 });
        expect(flag.isEnabled()).toBe(true);
    });

    it('should return disabled flag when enabled is false', () => {
        const flag = buildLocalHost('FileDb', { enabled: false, fleetPercentage: 100 });
        expect(flag.isEnabled()).toBe(false);
    });

    it('should return disabled flag when fleet percentage is 0', () => {
        const flag = buildLocalHost('FileDb', { enabled: true, fleetPercentage: 0 });
        expect(flag.isEnabled()).toBe(false);
    });

    it('should default to disabled with no config', () => {
        const flag = buildLocalHost('FileDb');
        expect(flag.isEnabled()).toBe(false);
    });
});
