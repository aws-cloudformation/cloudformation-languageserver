import { CompoundFeatureFlag } from './CombinedFeatureFlags';
import { StaticFeatureFlag } from './FeatureFlag';
import { buildLocalHost, buildRegional, FeatureFlagConfigSchema, FeatureFlagConfigType } from './FeatureFlagBuilder';
import { Describable, FeatureFlag, TargetedFeatureFlag } from './FeatureFlagI';

export class FeatureFlagConfig implements Describable {
    private readonly StaticFlag = new StaticFeatureFlag('TestFlag', false); // Here to generate types
    private readonly EnhancedDryRun: TargetedFeatureFlag<string>;

    private readonly describables: Describable[];

    constructor(config?: unknown) {
        let features: Record<string, FeatureFlagConfigType>;

        if (config) {
            const parsed = FeatureFlagConfigSchema.parse(config);
            features = parsed.features;
        } else {
            features = {};
        }

        this.EnhancedDryRun = new CompoundFeatureFlag(
            buildLocalHost('EnhancedDryRun', features['EnhancedDryRun']),
            buildRegional('EnhancedDryRun', features['EnhancedDryRun']),
        );

        this.describables = [this.EnhancedDryRun];
    }

    get(key: FeatureFlagConfigKey): FeatureFlag {
        return this[key];
    }

    getTargeted(key: TargetedFeatureFlagConfigKey): TargetedFeatureFlag<unknown> {
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

export type TargetedFeatureFlagConfigKey = 'EnhancedDryRun';
export type FeatureFlagConfigKey = 'StaticFlag';
