import { arch, platform, release, version } from 'os';
import { FeatureFlag } from './FeatureFlagI';

type HardwareMatch = {
    arch?: string | string[];
    platform?: string | string[];
    release?: string | string[];
    version?: string | string[];
    nodeVersion?: string | string[];
    processArch?: string | string[];
    processPlatform?: string | string[];
};

export class HardwareFeatureFlag implements FeatureFlag {
    private readonly enabled: boolean;

    constructor(
        private readonly featureName: string,
        private readonly match: HardwareMatch,
        private readonly partial: boolean = false,
    ) {
        const checks = [
            this.matchProperty(arch(), this.match.arch),
            this.matchProperty(platform(), this.match.platform),
            this.matchProperty(release(), this.match.release),
            this.matchProperty(version(), this.match.version),
            this.matchProperty(process.version, this.match.nodeVersion),
            this.matchProperty(process.arch, this.match.processArch),
            this.matchProperty(process.platform, this.match.processPlatform),
        ];

        this.enabled = checks.every(Boolean);
    }

    private matchProperty(actual: string, expected?: string | string[]): boolean {
        if (expected === undefined) {
            return true;
        }

        const patterns = Array.isArray(expected) ? expected : [expected];

        return patterns.some((pattern) => {
            return this.partial ? actual.includes(pattern) : actual === pattern;
        });
    }

    isEnabled(): boolean {
        return this.enabled;
    }

    describe(): string {
        const matchStr = JSON.stringify(this.match);
        return `HardwareFeatureFlag(feature=${this.featureName}, match=${matchStr}, partial=${this.partial}, enabled=${this.enabled})`;
    }
}
