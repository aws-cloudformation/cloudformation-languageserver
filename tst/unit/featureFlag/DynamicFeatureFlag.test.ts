import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { DynamicFeatureFlag, DynamicTargetedFeatureFlag } from '../../../src/featureFlag/DynamicFeatureFlag';
import { FeatureFlag, TargetedFeatureFlag } from '../../../src/featureFlag/FeatureFlagI';

describe('DynamicFeatureFlag', () => {
    beforeEach(() => {
        vi.useFakeTimers();
    });

    afterEach(() => {
        vi.restoreAllMocks();
    });

    it('should initialize with builder result', () => {
        const mockFlag: FeatureFlag = { isEnabled: () => true, describe: () => 'mock' };
        const builder = vi.fn(() => mockFlag);
        const configSupplier = vi.fn(() => ({ enabled: true }));

        const flag = new DynamicFeatureFlag('test', configSupplier, builder);

        expect(builder).toHaveBeenCalledWith('test', { enabled: true });
        expect(flag.isEnabled()).toBe(true);
        flag.close();
    });

    it('should refresh flag on interval', () => {
        const mockFlag1: FeatureFlag = { isEnabled: () => false, describe: () => 'mock1' };
        const mockFlag2: FeatureFlag = { isEnabled: () => true, describe: () => 'mock2' };
        const builder = vi.fn().mockReturnValueOnce(mockFlag1).mockReturnValueOnce(mockFlag2);
        const configSupplier = vi.fn(() => ({ enabled: true }));

        const flag = new DynamicFeatureFlag('test', configSupplier, builder, 1000);

        expect(flag.isEnabled()).toBe(false);

        vi.advanceTimersByTime(1000);

        expect(builder).toHaveBeenCalledTimes(2);
        expect(flag.isEnabled()).toBe(true);
        flag.close();
    });

    it('should clear interval on close', () => {
        const mockFlag: FeatureFlag = { isEnabled: () => true, describe: () => 'mock' };
        const builder = vi.fn(() => mockFlag);
        const configSupplier = vi.fn(() => undefined);

        const flag = new DynamicFeatureFlag('test', configSupplier, builder);
        flag.close();

        vi.advanceTimersByTime(60000);

        expect(builder).toHaveBeenCalledTimes(1);
    });
});

describe('DynamicTargetedFeatureFlag', () => {
    beforeEach(() => {
        vi.useFakeTimers();
    });

    afterEach(() => {
        vi.restoreAllMocks();
    });

    it('should initialize with builder result', () => {
        const mockFlag: TargetedFeatureFlag<string> = { isEnabled: () => true, describe: () => 'mock' };
        const builder = vi.fn(() => mockFlag);
        const configSupplier = vi.fn(() => ({ enabled: true }));

        const flag = new DynamicTargetedFeatureFlag('test', configSupplier, builder);

        expect(builder).toHaveBeenCalledWith('test', { enabled: true });
        expect(flag.isEnabled('target')).toBe(true);
        flag.close();
    });

    it('should refresh flag on interval', () => {
        const mockFlag1: TargetedFeatureFlag<string> = { isEnabled: () => false, describe: () => 'mock1' };
        const mockFlag2: TargetedFeatureFlag<string> = { isEnabled: () => true, describe: () => 'mock2' };
        const builder = vi.fn().mockReturnValueOnce(mockFlag1).mockReturnValueOnce(mockFlag2);
        const configSupplier = vi.fn(() => ({ enabled: true }));

        const flag = new DynamicTargetedFeatureFlag('test', configSupplier, builder, 1000);

        expect(flag.isEnabled('target')).toBe(false);

        vi.advanceTimersByTime(1000);

        expect(builder).toHaveBeenCalledTimes(2);
        expect(flag.isEnabled('target')).toBe(true);
        flag.close();
    });

    it('should clear interval on close', () => {
        const mockFlag: TargetedFeatureFlag<string> = { isEnabled: () => true, describe: () => 'mock' };
        const builder = vi.fn(() => mockFlag);
        const configSupplier = vi.fn(() => undefined);

        const flag = new DynamicTargetedFeatureFlag('test', configSupplier, builder);
        flag.close();

        vi.advanceTimersByTime(60000);

        expect(builder).toHaveBeenCalledTimes(1);
    });
});
