import { DateTime } from 'luxon';
import { SettingsConfigurable, ISettingsSubscriber, SettingsSubscription } from '../settings/ISettingsSubscriber';
import { DefaultSettings, ProfileSettings } from '../settings/Settings';
import { LoggerFactory } from '../telemetry/LoggerFactory';
import { TelemetryService } from '../telemetry/TelemetryService';
import { Closeable } from '../utils/Closeable';
import { AwsRegion, getRegion } from '../utils/Region';
import { CombinedSchemas } from './CombinedSchemas';
import { GetSchemaTaskManager } from './GetSchemaTaskManager';
import { RegionalSchemasType } from './RegionalSchemas';
import { SamSchemasType, SamStoreKey } from './SamSchemas';
import { SchemaStore } from './SchemaStore';

const StaleDaysThreshold = 7;

export class SchemaRetriever implements SettingsConfigurable, Closeable {
    readonly availableRegions: Set<AwsRegion> = new Set();
    private settingsSubscription?: SettingsSubscription;
    private settings: ProfileSettings = DefaultSettings.profile;
    private readonly log = LoggerFactory.getLogger(SchemaRetriever);
    private readonly telemetry = TelemetryService.instance.get('SchemaRetriever');

    constructor(
        private readonly schemaTaskManager: GetSchemaTaskManager,
        private readonly schemaStore: SchemaStore,
    ) {
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

    get(region: AwsRegion, profile: string): CombinedSchemas {
        const regionalSchemas = this.getRegionalSchemasFromStore(region);
        if (regionalSchemas) {
            this.availableRegions.add(region);
        } else {
            this.schemaTaskManager.addTask(region);
        }

        return this.schemaStore.getCombinedSchemas(region, profile);
    }

    updatePrivateSchemas() {
        this.schemaStore.invalidateCombinedSchemas();
        this.schemaTaskManager.runPrivateTask();
    }

    // Method to invalidate cache when any schemas are updated
    invalidateCache() {
        this.schemaStore.invalidateCombinedSchemas();
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
