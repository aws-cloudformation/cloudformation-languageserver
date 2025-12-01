import { LoggerFactory } from '../telemetry/LoggerFactory';
import { ScopedTelemetry } from '../telemetry/ScopedTelemetry';
import { Telemetry } from '../telemetry/TelemetryDecorator';
import { Closeable } from '../utils/Closeable';
import { toString } from '../utils/String';
import { CompoundFeatureFlag } from './CombinedFeatureFlags';
import { DynamicFeatureFlag, DynamicTargetedFeatureFlag } from './DynamicFeatureFlag';
import {
    buildLocalHost,
    buildRegional,
    buildStatic,
    FeatureFlagBuilderType,
    FeatureFlagConfigSchema,
    FeatureFlagConfigType,
    TargetedFeatureFlagBuilderType,
} from './FeatureFlagBuilder';
import { FeatureFlag, TargetedFeatureFlag } from './FeatureFlagI';

const log = LoggerFactory.getLogger('FeatureFlagSupplier');

export class FeatureFlagSupplier implements Closeable {
    @Telemetry()
    private readonly telemetry!: ScopedTelemetry;

    private readonly _featureFlags = new Map<FeatureFlagConfigKey, FeatureFlag | DynamicFeatureFlag>();
    private readonly _targetedFeatureFlags = new Map<
        TargetedFeatureFlagConfigKey,
        TargetedFeatureFlag<unknown> | DynamicTargetedFeatureFlag<unknown>
    >();

    constructor(configSupplier: () => unknown, defaultConfig: () => unknown) {
        for (const [key, builder] of Object.entries(FeatureBuilders)) {
            const ff = new DynamicFeatureFlag(
                key,
                () => featureConfigSupplier(key, configSupplier, defaultConfig, this.telemetry),
                builder,
            );
            this._featureFlags.set(key, ff);
        }

        for (const [key, builder] of Object.entries(TargetedFeatureBuilders)) {
            const ff = new DynamicTargetedFeatureFlag(
                key,
                () => featureConfigSupplier(key, configSupplier, defaultConfig, this.telemetry),
                builder,
            );
            this._targetedFeatureFlags.set(key, ff);
        }
    }

    get featureFlags(): ReadonlyMap<FeatureFlagConfigKey, FeatureFlag | DynamicFeatureFlag> {
        return this._featureFlags;
    }

    get targetedFeatureFlags(): ReadonlyMap<
        TargetedFeatureFlagConfigKey,
        TargetedFeatureFlag<unknown> | DynamicTargetedFeatureFlag<unknown>
    > {
        return this._targetedFeatureFlags;
    }

    getAll() {
        return [...this._featureFlags.values(), ...this._targetedFeatureFlags.values()];
    }

    close() {
        for (const ff of this.featureFlags.values()) {
            if (ff instanceof DynamicFeatureFlag) {
                ff.close();
            }
        }

        for (const ff of this.targetedFeatureFlags.values()) {
            if (ff instanceof DynamicTargetedFeatureFlag) {
                ff.close();
            }
        }
    }
}

function featureConfigSupplier(
    key: string,
    configSupplier: () => unknown,
    defaultConfig: () => unknown,
    telemetry: ScopedTelemetry,
): FeatureFlagConfigType | undefined {
    telemetry.count('used.config.default', 0);
    try {
        return FeatureFlagConfigSchema.parse(configSupplier()).features[key];
    } catch (err) {
        telemetry.count('used.config.default', 1);
        log.warn(err, `Failed to parse feature flag config: \n${toString(configSupplier())}. Using defaults instead`);
        return FeatureFlagConfigSchema.parse(defaultConfig()).features[key];
    }
}

const FeatureBuilders: Record<string, FeatureFlagBuilderType> = {
    Constants: buildStatic,
} as const;
const TargetedFeatureBuilders: Record<string, TargetedFeatureFlagBuilderType<unknown>> = {
    EnhancedDryRun: (name: string, config?: FeatureFlagConfigType) => {
        return new CompoundFeatureFlag(buildLocalHost(name, config), buildRegional(name, config));
    },
} as const;

export type FeatureFlagConfigKey = keyof typeof FeatureBuilders;
export type TargetedFeatureFlagConfigKey = keyof typeof TargetedFeatureBuilders;
