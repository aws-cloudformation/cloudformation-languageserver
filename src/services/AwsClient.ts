import { CloudControlClient } from '@aws-sdk/client-cloudcontrol';
import { CloudFormationClient } from '@aws-sdk/client-cloudformation';
import { AwsCredentialIdentity } from '@aws-sdk/types';
import { AwsCredentials } from '../auth/AwsCredentials';
import { Configurable, ServerComponents } from '../server/ServerComponents';
import { DefaultSettings, ISettingsSubscriber, SettingsSubscription } from '../settings/Settings';

export class AwsClient implements Configurable {
    constructor(
        private readonly credentialsProvider: AwsCredentials,
        private region: string = DefaultSettings.profile.region,
        private settingsSubscription?: SettingsSubscription,
    ) {}

    configure(settingsManager: ISettingsSubscriber): void {
        if (this.settingsSubscription) {
            this.settingsSubscription.unsubscribe();
        }

        this.settingsSubscription = settingsManager.subscribe('profile', (newProfile) => {
            this.region = newProfile.region;
        });
    }

    // By default, clients will retry on throttling exceptions 3 times
    public async getCloudFormationClient() {
        return new CloudFormationClient(await this.iamClientConfig());
    }

    public async getCloudControlClient() {
        return new CloudControlClient(await this.iamClientConfig());
    }

    private async iamClientConfig(): Promise<{ region: string; credentials: AwsCredentialIdentity }> {
        const data = await this.credentialsProvider.getIAM();
        return {
            region: this.region,
            credentials: data,
        };
    }

    static create(components: ServerComponents) {
        return new AwsClient(components.awsCredentials, DefaultSettings.profile.region);
    }
}
