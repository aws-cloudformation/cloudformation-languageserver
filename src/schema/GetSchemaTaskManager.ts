import { DescribeTypeOutput } from '@aws-sdk/client-cloudformation';
import { SettingsConfigurable, ISettingsSubscriber, SettingsSubscription } from '../settings/ISettingsSubscriber';
import { DefaultSettings } from '../settings/Settings';
import { LoggerFactory } from '../telemetry/LoggerFactory';
import { Closeable } from '../utils/Closeable';
import { AwsRegion } from '../utils/Region';
import { GetSamSchemaTask } from './GetSamSchemaTask';
import { GetPrivateSchemasTask, GetPublicSchemaTask } from './GetSchemaTask';
import { SchemaFileType } from './RegionalSchemas';
import { SamSchema } from './SamSchemaTransformer';
import { SchemaStore } from './SchemaStore';

const TenSeconds = 10 * 1000;
const OneHour = 60 * 60 * 1000;

export class GetSchemaTaskManager implements SettingsConfigurable, Closeable {
    private readonly tasks: GetPublicSchemaTask[] = [];
    private readonly privateTask: GetPrivateSchemasTask;
    private readonly samTask: GetSamSchemaTask;
    private settingsSubscription?: SettingsSubscription;
    private readonly log = LoggerFactory.getLogger(GetSchemaTaskManager);

    private isRunning: boolean = false;

    private readonly timeout: NodeJS.Timeout;
    private readonly interval: NodeJS.Timeout;

    constructor(
        private readonly schemas: SchemaStore,
        private readonly getPublicSchemas: (region: AwsRegion) => Promise<SchemaFileType[]>,
        getPrivateResources: () => Promise<DescribeTypeOutput[]>,
        getSamSchemas: () => Promise<SamSchema>,
        private profile: string = DefaultSettings.profile.profile,
        private readonly onSchemaUpdate: (region?: string, profile?: string) => void,
    ) {
        this.privateTask = new GetPrivateSchemasTask(getPrivateResources, () => this.profile);
        this.samTask = new GetSamSchemaTask(getSamSchemas);

        this.timeout = setTimeout(() => {
            // Wait before trying to call CFN APIs so that credentials have time to update
            this.runPrivateTask();
        }, TenSeconds);

        this.interval = setInterval(() => {
            // Keep private schemas up to date with credential changes if profile has not already ben loaded
            this.runPrivateTask();
        }, OneHour);
    }

    configure(settingsManager: ISettingsSubscriber): void {
        // Clean up existing subscription if present
        if (this.settingsSubscription) {
            this.settingsSubscription.unsubscribe();
        }

        // Set initial settings
        this.profile = settingsManager.getCurrentSettings().profile.profile;

        // Subscribe to profile settings changes
        this.settingsSubscription = settingsManager.subscribe('profile', (newProfileSettings) => {
            this.onSettingsChanged(newProfileSettings.profile);
        });
    }

    private onSettingsChanged(newProfile: string): void {
        this.profile = newProfile;
    }

    addTask(region: AwsRegion, regionFirstCreatedMs?: number) {
        if (!this.currentRegionalTasks().has(region)) {
            this.tasks.push(new GetPublicSchemaTask(region, this.getPublicSchemas, regionFirstCreatedMs));
        }
        this.startProcessing();
    }

    runPrivateTask() {
        this.privateTask
            .run(this.schemas.privateSchemas, this.log)
            .then(() => {
                this.onSchemaUpdate(undefined, this.profile);
            })
            .catch(() => {});
    }

    runSamTask() {
        this.samTask
            .run(this.schemas.samSchemas, this.log)
            .then(() => {
                this.onSchemaUpdate(); // No params = SAM update
            })
            .catch(() => {});
    }

    public currentRegionalTasks() {
        return new Set(this.tasks.map((task) => task.region));
    }

    private startProcessing() {
        if (!this.isRunning && this.tasks.length > 0) {
            this.isRunning = true;
            this.run();
        }
    }

    private run() {
        const task = this.tasks.shift();
        if (task) {
            task.run(this.schemas.publicSchemas, this.log)
                .then(() => {
                    this.onSchemaUpdate(task.region);
                })
                .catch(() => {
                    this.tasks.push(task);
                })
                .finally(() => {
                    this.isRunning = false;
                    this.startProcessing();
                });
        }
    }

    public close() {
        // Unsubscribe from settings changes
        if (this.settingsSubscription) {
            this.settingsSubscription.unsubscribe();
            this.settingsSubscription = undefined;
        }

        clearTimeout(this.timeout);
        clearInterval(this.interval);
    }
}
