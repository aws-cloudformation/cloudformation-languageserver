import { z } from 'zod';
import { AwsRegion } from '../utils/Region';
import { AndFeatureFlag, CompoundFeatureFlag, LocalHostTargetedFeatureFlag } from './CombinedFeatureFlags';
import { FleetTargetedFeatureFlag, RegionAllowlistFeatureFlag, StaticFeatureFlag } from './FeatureFlag';
import { FeatureFlag, TargetedFeatureFlag } from './FeatureFlagI';

const FeatureFlagSchema = z.object({
    enabled: z.boolean(),
    fleetPercentage: z.number().optional(),
    allowlistedRegions: z.array(z.enum(Object.values(AwsRegion))).optional(),
});

export const FeatureFlagConfigSchema = z.object({
    version: z.number(),
    description: z.string(),
    features: z.record(z.string(), FeatureFlagSchema),
});
export type FeatureFlagConfigType = z.infer<typeof FeatureFlagSchema>;

export type FeatureFlagBuilderType = (name: string, config?: FeatureFlagConfigType) => FeatureFlag;
export type TargetedFeatureFlagBuilderType<T> = (
    name: string,
    config?: FeatureFlagConfigType,
) => TargetedFeatureFlag<T>;

export function buildStatic(name: string, config?: FeatureFlagConfigType) {
    let enabled = false;

    if (config?.enabled !== undefined) {
        enabled = config.enabled;
    }

    return new StaticFeatureFlag(name, enabled);
}

export function buildLocalHost(name: string, config?: FeatureFlagConfigType) {
    let pct = 0;

    if (config?.fleetPercentage !== undefined) {
        pct = config.fleetPercentage;
    }

    return new AndFeatureFlag(
        buildStatic(name, config),
        new LocalHostTargetedFeatureFlag(new FleetTargetedFeatureFlag(name, pct)),
    );
}

export function buildRegional(name: string, config?: FeatureFlagConfigType) {
    let allowlist: AwsRegion[] = [];

    if (config?.allowlistedRegions !== undefined) {
        allowlist = config.allowlistedRegions;
    }

    return new CompoundFeatureFlag(buildStatic(name, config), new RegionAllowlistFeatureFlag(name, allowlist));
}
