export interface Describable {
    describe(): string;
}

export interface FeatureFlag extends Describable {
    isEnabled(): boolean;
}

export interface TargetedFeatureFlag<T> extends Describable {
    isEnabled(target: T): boolean;
}
