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
    private readonly allowlist: Set<string>;

    constructor(
        private readonly featureName: string,
        allowedRegions: string[],
    ) {
        this.allowlist = new Set(allowedRegions);
    }

    isEnabled(region: string): boolean {
        try {
            return this.allowlist.has(region);
        } catch {
            return false;
        }
    }

    describe(): string {
        return `RegionAllowlistFeatureFlag(feature=${this.featureName}, regions=[${[...this.allowlist].join(', ')}])`;
    }
}
