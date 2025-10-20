import { z } from 'zod';
import { AwsRegion } from '../utils/Region';
import { AndFeatureFlag, LocalHostTargetedFeatureFlag } from './CombinedFeatureFlags';
import { FleetTargetedFeatureFlag, StaticFeatureFlag } from './FeatureFlag';
import { Describable, FeatureFlag, TargetedFeatureFlag } from './FeatureFlagI';

export class FeatureFlagConfig implements Describable {
    private readonly EnhancedDryRun: FeatureFlag;
    private readonly AnotherFeature: FeatureFlag;

    private readonly describables: Describable[];

    constructor(config?: unknown) {
        let features: Record<string, FeatureFlagType>;

        if (config) {
            const parsed = FeatureFlagConfigSchema.parse(config);
            features = parsed.features;
        } else {
            features = {};
        }

        this.EnhancedDryRun = buildStatic('EnhancedDryRun', features);
        this.AnotherFeature = buildLocalHost('AnotherFeature', features);

        this.describables = [this.EnhancedDryRun, this.AnotherFeature];
    }

    get(key: FeatureFlagConfigKey): FeatureFlag {
        return this[key];
    }

    getTargeted<T>(key: FeatureFlagConfigKey): TargetedFeatureFlag<T> {
        return this[key];
    }

    describe(): string {
        return this.describables
            .map((featureFlag) => {
                return featureFlag.describe();
            })
            .join('\n');
    }

    static fromJsonString(str?: string) {
        if (str) {
            return new FeatureFlagConfig(JSON.parse(str));
        }

        return new FeatureFlagConfig();
    }
}

export type FeatureFlagConfigKey = 'EnhancedDryRun' | 'AnotherFeature';

const FeatureFlagSchema = z.object({
    enabled: z.boolean(),
    fleetPercentage: z.number().optional(),
    allowlistedRegions: z.array(z.enum(Object.values(AwsRegion))).optional(),
});

const FeatureFlagConfigSchema = z.object({
    version: z.number(),
    description: z.string(),
    features: z.record(z.string(), FeatureFlagSchema),
});
type FeatureFlagType = z.infer<typeof FeatureFlagSchema>;

function buildStatic(name: string, features: Record<string, FeatureFlagType>) {
    let enabled = false;

    if (features[name] !== undefined) {
        enabled = features[name].enabled;
    }

    return new StaticFeatureFlag(name, enabled);
}

function buildLocalHost(name: string, features: Record<string, FeatureFlagType>) {
    let pct = 0;

    if (features[name]?.fleetPercentage !== undefined) {
        pct = features[name].fleetPercentage;
    }

    return new AndFeatureFlag(
        buildStatic(name, features),
        new LocalHostTargetedFeatureFlag(new FleetTargetedFeatureFlag(name, pct)),
    );
}
