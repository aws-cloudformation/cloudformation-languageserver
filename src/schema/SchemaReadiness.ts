import { SettingsConfigurable, ISettingsSubscriber, SettingsSubscription } from '../settings/ISettingsSubscriber';
import { DefaultSettings, ProfileSettings } from '../settings/Settings';
import { ReadinessContributor, ReadinessStatus } from '../utils/ReadinessContributor';
import { SchemaStore } from './SchemaStore';

export class SchemaReadiness implements ReadinessContributor, SettingsConfigurable {
    private settings: ProfileSettings = DefaultSettings.profile;
    private settingsSubscription?: SettingsSubscription;

    constructor(private readonly schemaStore: SchemaStore) {}

    isReady(): ReadinessStatus {
        return { ready: this.schemaStore.getPublicSchemaRegions().includes(this.settings.region) };
    }

    configure(settingsManager: ISettingsSubscriber): void {
        // Clean up existing subscription if present
        if (this.settingsSubscription) {
            this.settingsSubscription.unsubscribe();
        }

        this.settingsSubscription = settingsManager.subscribe('profile', (newSettings) => {
            this.settings = newSettings;
        });
    }
}
