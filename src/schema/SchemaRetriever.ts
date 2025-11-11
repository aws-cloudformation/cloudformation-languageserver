import { DescribeTypeOutput } from '@aws-sdk/client-cloudformation';
import { DateTime } from 'luxon';
import { SettingsConfigurable, ISettingsSubscriber, SettingsSubscription } from '../settings/ISettingsSubscriber';
import { DefaultSettings, ProfileSettings } from '../settings/Settings';
import { LoggerFactory } from '../telemetry/LoggerFactory';
import { ScopedTelemetry } from '../telemetry/ScopedTelemetry';
import { Telemetry, Measure } from '../telemetry/TelemetryDecorator';
import { Closeable } from '../utils/Closeable';
import { AwsRegion, getRegion } from '../utils/Region';
import { CombinedSchemas } from './CombinedSchemas';
import { GetSchemaTaskManager } from './GetSchemaTaskManager';
import { PrivateSchemasType } from './PrivateSchemas';
import { RegionalSchemasType, SchemaFileType } from './RegionalSchemas';
import { SamSchemasType, SamStoreKey } from './SamSchemas';
import { SchemaStore } from './SchemaStore';

const StaleDaysThreshold = 7;

export class SchemaRetriever implements SettingsConfigurable, Closeable {
    readonly availableRegions: Set<AwsRegion> = new Set();
    private settingsSubscription?: SettingsSubscription;
    private settings: ProfileSettings = DefaultSettings.profile;
    private readonly log = LoggerFactory.getLogger(SchemaRetriever);
    private readonly schemaTaskManager: GetSchemaTaskManager;

    @Telemetry()
    private readonly telemetry!: ScopedTelemetry;

    constructor(
        private readonly schemaStore: SchemaStore,
        private readonly getPublicSchemas: (region: AwsRegion) => Promise<SchemaFileType[]>,
        private readonly getPrivateResources: () => Promise<DescribeTypeOutput[]>,
    ) {
        this.schemaTaskManager = new GetSchemaTaskManager(
            this.schemaStore,
            this.getPublicSchemas,
            this.getPrivateResources,
            this.settings.profile,
            (region, profile) => this.rebuildAffectedCombinedSchemas(region, profile),
        );

        this.telemetry.registerGaugeProvider('schema.public.maxAge', () => this.getPublicSchemaMaxAge(), {
            unit: 'ms',
        });

        this.telemetry.registerGaugeProvider('schema.sam.maxAge', () => this.getSamSchemaAge(), { unit: 'ms' });
    }

    configure(settingsManager: ISettingsSubscriber): void {
        // Clean up existing subscription if present
        if (this.settingsSubscription) {
            this.settingsSubscription.unsubscribe();
        }

        // Set initial settings
        const newSettings = settingsManager.getCurrentSettings().profile;
        this.onSettingsChanged(newSettings);

        // Initialize schemas with current region
        this.getRegionalSchemasIfMissing([this.settings.region]);
        this.getRegionalSchemasIfStale();
        this.getSamSchemasIfMissingOrStale();

        // Subscribe to profile settings changes
        this.settingsSubscription = settingsManager.subscribe('profile', (newProfileSettings) => {
            this.onSettingsChanged(newProfileSettings);
        });
    }

    private onSettingsChanged(newSettings: ProfileSettings): void {
        const regionChanged = this.settings.region !== newSettings.region;
        const profileChanged = this.settings.profile !== newSettings.profile;

        if (regionChanged || profileChanged) {
            // Update private schemas when profile changes
            if (profileChanged) {
                this.updatePrivateSchemas();
            }

            // Ensure we have schemas for the new region
            if (regionChanged) {
                this.getRegionalSchemasIfMissing([newSettings.region]);
            }
        }
        this.settings = newSettings;
    }

    close(): void {
        if (this.settingsSubscription) {
            this.settingsSubscription.unsubscribe();
            this.settingsSubscription = undefined;
        }
    }

    getDefault(): CombinedSchemas {
        return this.get(this.settings.region, this.settings.profile);
    }

    @Measure({ name: 'getSchemas' })
    get(region: AwsRegion, profile: string): CombinedSchemas {
        // Check if combined schemas are already cached first
        const cacheKey = `${region}:${profile}`;
        const cachedCombined = this.schemaStore.combinedSchemas.get<CombinedSchemas>(cacheKey);

        if (cachedCombined) {
            return cachedCombined;
        }

        // Only do expensive regional check if no cached combined schemas
        const regionalSchemas = this.getRegionalSchemasFromStore(region);
        if (regionalSchemas) {
            this.availableRegions.add(region);
        } else {
            this.schemaTaskManager.addTask(region);
        }

        // Create and cache combined schemas
        const privateSchemas = this.schemaStore.privateSchemas.get<PrivateSchemasType>(profile);
        const samSchemas = this.schemaStore.samSchemas.get<SamSchemasType>(SamStoreKey);
        const combinedSchemas = CombinedSchemas.from(regionalSchemas, privateSchemas, samSchemas);

        void this.schemaStore.combinedSchemas.put(cacheKey, combinedSchemas);
        return combinedSchemas;
    }

    updatePrivateSchemas() {
        this.schemaStore.invalidateCombinedSchemas();
        this.schemaTaskManager.runPrivateTask();
    }

    // Method to invalidate cache when any schemas are updated
    invalidateCache() {
        this.schemaStore.invalidateCombinedSchemas();
    }

    // Proactively rebuild combined schemas to avoid lazy loading delays
    @Measure({ name: 'rebuildCurrentSchemas' })
    rebuildForCurrentSettings() {
        this.schemaStore.invalidateCombinedSchemas();
        this.get(this.settings.region, this.settings.profile);
    }

    // Surgically rebuild affected combined schemas
    @Measure({ name: 'rebuildAffectedSchemas' })
    rebuildAffectedCombinedSchemas(updatedRegion?: string, updatedProfile?: string) {
        if (!updatedRegion && !updatedProfile) {
            // SAM update - affects all schemas
            this.schemaStore.invalidateCombinedSchemas();
            this.rebuildForCurrentSettings();
            return;
        }

        const keys = this.schemaStore.combinedSchemas.keys(1000);
        for (const key of keys) {
            const [region, profile] = key.split(':');
            if ((updatedRegion && region === updatedRegion) || (updatedProfile && profile === updatedProfile)) {
                // Invalidate and rebuild this specific combined schema
                void this.schemaStore.combinedSchemas.remove(key);
                this.get(region as AwsRegion, profile);
            }
        }
    }

    private getRegionalSchemasFromStore(region: AwsRegion) {
        return this.schemaStore.publicSchemas.get<RegionalSchemasType>(region);
    }

    private getRegionalSchemasIfMissing(preloadedRegions: ReadonlyArray<AwsRegion>) {
        for (const region of preloadedRegions) {
            const existingValue = this.getRegionalSchemasFromStore(region);

            if (existingValue === undefined) {
                this.schemaTaskManager.addTask(region);
            }
        }
    }

    private getRegionalSchemasIfStale() {
        for (const key of this.schemaStore.publicSchemas.keys(50)) {
            const region = getRegion(key);
            const existingValue = this.getRegionalSchemasFromStore(region);

            if (existingValue === undefined) {
                this.log.error(`Something went wrong, cannot find existing region ${region}`);
                return;
            }

            const now = DateTime.now();
            const lastModified = DateTime.fromMillis(existingValue.lastModifiedMs);
            const isStale = now.diff(lastModified, 'days').days >= StaleDaysThreshold;

            if (isStale) {
                this.schemaTaskManager.addTask(region);
            }
        }
    }

    private getSamSchemasIfMissingOrStale() {
        const existingValue = this.schemaStore.samSchemas.get<SamSchemasType>(SamStoreKey);

        if (existingValue === undefined) {
            this.schemaTaskManager.runSamTask();
            return;
        }

        const now = DateTime.now();
        const lastModified = DateTime.fromMillis(existingValue.lastModifiedMs);
        const isStale = now.diff(lastModified, 'days').days >= StaleDaysThreshold;

        if (isStale) {
            this.schemaTaskManager.runSamTask();
        }
    }

    private getPublicSchemaMaxAge(): number {
        let maxAge = 0;
        for (const key of this.schemaStore.publicSchemas.keys(50)) {
            const region = getRegion(key);
            const existingValue = this.getRegionalSchemasFromStore(region);
            if (existingValue) {
                const age = DateTime.now().diff(DateTime.fromMillis(existingValue.lastModifiedMs)).milliseconds;
                maxAge = Math.max(maxAge, age);
            }
        }
        return maxAge;
    }

    private getSamSchemaAge(): number {
        const existingValue = this.schemaStore.samSchemas.get<SamSchemasType>(SamStoreKey);
        if (!existingValue) {
            return 0;
        }
        return DateTime.now().diff(DateTime.fromMillis(existingValue.lastModifiedMs)).milliseconds;
    }
}
