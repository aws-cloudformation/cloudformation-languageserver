import { Closeable } from '../utils/Closeable';
import { FeatureFlagBuilderType, FeatureFlagConfigType, TargetedFeatureFlagBuilderType } from './FeatureFlagBuilder';
import { FeatureFlag, TargetedFeatureFlag } from './FeatureFlagI';

export class DynamicFeatureFlag implements FeatureFlag, Closeable {
    private flag: FeatureFlag;
    private readonly interval: NodeJS.Timeout;

    constructor(
        private readonly name: string,
        private readonly configSupplier: () => FeatureFlagConfigType | undefined,
        private readonly builder: FeatureFlagBuilderType,
        refreshMs: number = 60 * 1000,
    ) {
        this.flag = this.builder(this.name, this.configSupplier());
        this.interval = setInterval(() => {
            this.flag = this.builder(this.name, this.configSupplier());
        }, refreshMs);
    }

    isEnabled(): boolean {
        return this.flag.isEnabled();
    }

    describe(): string {
        return `DynamicFeatureFlag(${this.flag.describe()})`;
    }

    close() {
        clearInterval(this.interval);
    }
}

export class DynamicTargetedFeatureFlag<T> implements TargetedFeatureFlag<T>, Closeable {
    private flag: TargetedFeatureFlag<T>;
    private readonly interval: NodeJS.Timeout;

    constructor(
        private readonly name: string,
        private readonly configSupplier: () => FeatureFlagConfigType | undefined,
        private readonly builder: TargetedFeatureFlagBuilderType<T>,
        refreshMs: number = 60 * 1000,
    ) {
        this.flag = this.builder(this.name, this.configSupplier());
        this.interval = setInterval(() => {
            this.flag = this.builder(this.name, this.configSupplier());
        }, refreshMs);
    }

    isEnabled(target: T): boolean {
        return this.flag.isEnabled(target);
    }

    describe(): string {
        return `DynamicTargetedFeatureFlag(${this.flag.describe()})`;
    }

    close() {
        clearInterval(this.interval);
    }
}
