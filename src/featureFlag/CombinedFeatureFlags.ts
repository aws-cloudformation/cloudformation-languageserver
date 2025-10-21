import { hostname } from 'os';
import { FleetTargetedFeatureFlag } from './FeatureFlag';
import { FeatureFlag, TargetedFeatureFlag } from './FeatureFlagI';

export class LocalHostTargetedFeatureFlag implements FeatureFlag {
    private readonly enabled: boolean;

    constructor(private readonly featureFlag: FleetTargetedFeatureFlag) {
        this.enabled = this.featureFlag.isEnabled(hostname());
    }

    isEnabled(): boolean {
        return this.enabled;
    }

    describe(): string {
        return `LocalHostTargetedFeatureFlag(enabled=${this.enabled}, fleet=${this.featureFlag.describe()})`;
    }
}

export class AndFeatureFlag implements FeatureFlag {
    private readonly featureFlags: FeatureFlag[];

    constructor(...featureFlags: FeatureFlag[]) {
        this.featureFlags = featureFlags;
        if (this.featureFlags.length === 0) {
            throw new Error('1 or more feature flags required');
        }
    }

    isEnabled(): boolean {
        return this.featureFlags.every((feature) => {
            return feature.isEnabled();
        });
    }

    describe(): string {
        return this.featureFlags
            .map((feature) => {
                return feature.describe();
            })
            .join(', ');
    }
}

export class CompoundFeatureFlag<T> implements TargetedFeatureFlag<T> {
    constructor(
        private readonly featureFlag: FeatureFlag,
        private readonly targetedFeatureFlag: TargetedFeatureFlag<T>,
    ) {}

    isEnabled(target: T): boolean {
        return this.featureFlag.isEnabled() && this.targetedFeatureFlag.isEnabled(target);
    }

    describe(): string {
        return [this.featureFlag, this.targetedFeatureFlag]
            .map((feature) => {
                return feature.describe();
            })
            .join(', ');
    }
}
