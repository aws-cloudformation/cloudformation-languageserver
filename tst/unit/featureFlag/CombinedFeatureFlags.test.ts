import * as os from 'os';
import { describe, it, expect, vi } from 'vitest';
import { LocalHostTargetedFeatureFlag, AndFeatureFlag } from '../../../src/featureFlag/CombinedFeatureFlags';
import { FleetTargetedFeatureFlag, StaticFeatureFlag } from '../../../src/featureFlag/FeatureFlag';

vi.mock('os', () => ({
    hostname: vi.fn(),
}));

describe('LocalHostTargetedFeatureFlag', () => {
    it('should enable when fleet flag enables current hostname', () => {
        vi.mocked(os.hostname).mockReturnValue('test-host');
        const fleetFlag = new FleetTargetedFeatureFlag('test-feature', 100);
        const flag = new LocalHostTargetedFeatureFlag(fleetFlag);
        expect(flag.isEnabled()).toBe(true);
    });

    it('should disable when fleet flag disables current hostname', () => {
        vi.mocked(os.hostname).mockReturnValue('test-host');
        const fleetFlag = new FleetTargetedFeatureFlag('test-feature', 0);
        const flag = new LocalHostTargetedFeatureFlag(fleetFlag);
        expect(flag.isEnabled()).toBe(false);
    });

    it('should cache enabled state at construction', () => {
        vi.clearAllMocks();
        vi.mocked(os.hostname).mockReturnValue('test-host');
        const fleetFlag = new FleetTargetedFeatureFlag('test-feature', 100);
        const flag = new LocalHostTargetedFeatureFlag(fleetFlag);
        const callCount = vi.mocked(os.hostname).mock.calls.length;
        expect(flag.isEnabled()).toBe(true);
        expect(flag.isEnabled()).toBe(true);
        expect(vi.mocked(os.hostname).mock.calls.length).toBe(callCount);
    });

    it('should describe itself correctly', () => {
        vi.mocked(os.hostname).mockReturnValue('test-host');
        const fleetFlag = new FleetTargetedFeatureFlag('test-feature', 50);
        const flag = new LocalHostTargetedFeatureFlag(fleetFlag);
        const description = flag.describe();
        expect(description).toContain('LocalHostTargetedFeatureFlag');
        expect(description).toContain('fleet=');
        expect(description).toContain('FleetTargetedFeatureFlag');
    });
});

describe('AndFeatureFlag', () => {
    it('should enable when all flags are enabled', () => {
        const flag1 = new StaticFeatureFlag('feature1', true);
        const flag2 = new StaticFeatureFlag('feature2', true);
        const andFlag = new AndFeatureFlag(flag1, flag2);
        expect(andFlag.isEnabled()).toBe(true);
    });

    it('should disable when any flag is disabled', () => {
        const flag1 = new StaticFeatureFlag('feature1', true);
        const flag2 = new StaticFeatureFlag('feature2', false);
        const andFlag = new AndFeatureFlag(flag1, flag2);
        expect(andFlag.isEnabled()).toBe(false);
    });

    it('should disable when all flags are disabled', () => {
        const flag1 = new StaticFeatureFlag('feature1', false);
        const flag2 = new StaticFeatureFlag('feature2', false);
        const andFlag = new AndFeatureFlag(flag1, flag2);
        expect(andFlag.isEnabled()).toBe(false);
    });

    it('should work with single flag', () => {
        const flag = new StaticFeatureFlag('feature', true);
        const andFlag = new AndFeatureFlag(flag);
        expect(andFlag.isEnabled()).toBe(true);
    });

    it('should work with multiple flags', () => {
        const flag1 = new StaticFeatureFlag('feature1', true);
        const flag2 = new StaticFeatureFlag('feature2', true);
        const flag3 = new StaticFeatureFlag('feature3', true);
        const andFlag = new AndFeatureFlag(flag1, flag2, flag3);
        expect(andFlag.isEnabled()).toBe(true);
    });

    it('should throw error when no flags provided', () => {
        expect(() => new AndFeatureFlag()).toThrow('1 or more feature flags required');
    });

    it('should describe all flags', () => {
        const flag1 = new StaticFeatureFlag('feature1', true);
        const flag2 = new StaticFeatureFlag('feature2', false);
        const andFlag = new AndFeatureFlag(flag1, flag2);
        const description = andFlag.describe();
        expect(description).toContain('feature1');
        expect(description).toContain('feature2');
    });
});
