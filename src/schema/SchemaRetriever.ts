import { DescribeTypeOutput } from '@aws-sdk/client-cloudformation';
import { DateTime } from 'luxon';
import { SettingsConfigurable, ISettingsSubscriber, SettingsSubscription } from '../settings/ISettingsSubscriber';
import { DefaultSettings, ProfileSettings } from '../settings/Settings';
import { LoggerFactory } from '../telemetry/LoggerFactory';
import { ScopedTelemetry } from '../telemetry/ScopedTelemetry';
import { Telemetry, Measure } from '../telemetry/TelemetryDecorator';
import { Closeable } from '../utils/Closeable';
import { AwsRegion } from '../utils/Region';
import { CombinedSchemas } from './CombinedSchemas';
import { GetSchemaTaskManager } from './GetSchemaTaskManager';
import { SchemaFileType } from './RegionalSchemas';
import { CloudFormationResourceSchema } from './SamSchemaTransformer';
import { SchemaStore } from './SchemaStore';

const StaleDaysThreshold = 7;

export class SchemaRetriever implements SettingsConfigurable, Closeable {
    private settingsSubscription?: SettingsSubscription;
    private settings: ProfileSettings = DefaultSettings.profile;
    private readonly log = LoggerFactory.getLogger(SchemaRetriever);

    @Telemetry()
    private readonly telemetry!: ScopedTelemetry;

    constructor(
        private readonly schemaStore: SchemaStore,
        getPublicSchemas: (region: AwsRegion) => Promise<SchemaFileType[]>,
        getPrivateResources: () => Promise<DescribeTypeOutput[]>,
        getSamSchemas: () => Promise<Map<string, CloudFormationResourceSchema>>,
        private readonly schemaTaskManager: GetSchemaTaskManager = new GetSchemaTaskManager(
            schemaStore,
            getPublicSchemas,
            getPrivateResources,
            getSamSchemas,
        ),
    ) {
        this.telemetry.registerGaugeProvider('public.age.max', () => this.schemaStore.getPublicSchemasMaxAge(), {
            unit: 'ms',
        });

        this.telemetry.registerGaugeProvider('sam.age.max', () => this.schemaStore.getSamSchemaAge(), {
            unit: 'ms',
        });

        this.getRegionalSchemasIfMissing([this.settings.region]);
    }

    initialize() {
        this.getRegionalSchemasIfStale();
        this.getSamSchemasIfMissingOrStale();
        this.schemaTaskManager.runPrivateTask();
    }

    configure(settingsManager: ISettingsSubscriber): void {
        // Clean up existing subscription if present
        if (this.settingsSubscription) {
            this.settingsSubscription.unsubscribe();
        }

        // Subscribe to profile settings changes
        this.settingsSubscription = settingsManager.subscribe('profile', (newProfileSettings) => {
            this.getRegionalSchemasIfMissing([newProfileSettings.region]);
            this.schemaTaskManager.runPrivateTask();
            this.settings = newProfileSettings;
        });
    }

    getDefault(): CombinedSchemas {
        return this.get(this.settings.region, this.settings.profile);
    }

    @Measure({ name: 'getSchemas' })
    get(region: AwsRegion, profile: string): CombinedSchemas {
        return this.schemaStore.get(region, profile);
    }

    private getRegionalSchemasIfMissing(regions: ReadonlyArray<AwsRegion>) {
        for (const region of regions) {
            const existingValue = this.schemaStore.getPublicSchemas(region);

            if (existingValue === undefined) {
                this.telemetry.count('schema.public.missing', 1);
                this.schemaTaskManager.addTask(region);
            } else {
                this.telemetry.count('schema.public.cached', 1);
            }
        }
    }

    private getRegionalSchemasIfStale() {
        for (const key of this.schemaStore.getPublicSchemaRegions()) {
            const storedSchema = this.schemaStore.getPublicSchemas(key);

            if (storedSchema === undefined) {
                this.telemetry.count('schema.public.stale.fault', 1);
                this.log.error(`Something went wrong, cannot find existing region ${key}`);
                return;
            }

            const now = DateTime.now();
            const lastModified = DateTime.fromMillis(storedSchema.lastModifiedMs);
            const isStale = now.diff(lastModified, 'days').days >= StaleDaysThreshold;

            if (isStale) {
                this.telemetry.count('schema.public.stale', 1);
                this.schemaTaskManager.addTask(key, storedSchema.firstCreatedMs);
            }
        }
    }

    private getSamSchemasIfMissingOrStale() {
        const existingValue = this.schemaStore.getSamSchemas();

        if (existingValue === undefined) {
            this.telemetry.count('schema.sam.missing', 1);
            this.schemaTaskManager.runSamTask();
            return;
        }

        this.telemetry.count('schema.sam.cached', 1);
        const now = DateTime.now();
        const lastModified = DateTime.fromMillis(existingValue.lastModifiedMs);
        const isStale = now.diff(lastModified, 'days').days >= StaleDaysThreshold;

        if (isStale) {
            this.telemetry.count('schema.sam.stale', 1);
            this.schemaTaskManager.runSamTask(existingValue.firstCreatedMs);
        }
    }

    close(): void {
        this.settingsSubscription?.unsubscribe();
        this.settingsSubscription = undefined;
    }
}
