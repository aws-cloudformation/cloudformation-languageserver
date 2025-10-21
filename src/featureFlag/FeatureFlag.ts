import { AwsRegion, getRegion } from '../utils/Region';
import { FeatureFlag, TargetedFeatureFlag } from './FeatureFlagI';
import { PartialFleetSelector } from './PartialFleetSelector';

export class StaticFeatureFlag implements FeatureFlag {
    constructor(
        private readonly featureName: string,
        private readonly enabled: boolean,
    ) {}

    isEnabled(): boolean {
        return this.enabled;
    }

    describe(): string {
        return `StaticFeatureFlag(feature=${this.featureName}, enabled=${this.enabled})`;
    }
}

export class FleetTargetedFeatureFlag implements TargetedFeatureFlag<string> {
    private readonly selector: PartialFleetSelector;

    constructor(
        private readonly featureName: string,
        private readonly percentage: number,
    ) {
        this.selector = new PartialFleetSelector(featureName, percentage);
    }

    isEnabled(hostname: string): boolean {
        return this.selector.isSelected(hostname);
    }

    describe(): string {
        return `FleetTargetedFeatureFlag(feature=${this.featureName}, percentage=${this.percentage})`;
    }
}

export class RegionAllowlistFeatureFlag implements TargetedFeatureFlag<string> {
    private readonly allowlist: Set<AwsRegion>;

    constructor(
        private readonly featureName: string,
        allowedRegions: AwsRegion[],
    ) {
        this.allowlist = new Set(allowedRegions);
    }

    isEnabled(region: string): boolean {
        try {
            return this.allowlist.has(getRegion(region));
        } catch {
            return false;
        }
    }

    describe(): string {
        return `RegionAllowlistFeatureFlag(feature=${this.featureName}, regions=[${[...this.allowlist].join(', ')}])`;
    }
}
