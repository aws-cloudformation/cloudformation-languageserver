import { CloudControlClient } from '@aws-sdk/client-cloudcontrol';
import { CloudFormationClient } from '@aws-sdk/client-cloudformation';
import { AwsCredentials } from '../auth/AwsCredentials';
import { IamCredentials } from '../auth/AwsLspAuthTypes';
import { ExtensionId, ExtensionVersion } from '../utils/ExtensionConfig';

type IamClientConfig = {
    region: string;
    credentials: IamCredentials;
    customUserAgent: string;
};

export class AwsClient {
    constructor(private readonly credentialsProvider: AwsCredentials) {}

    // By default, clients will retry on throttling exceptions 3 times
    public getCloudFormationClient() {
        return new CloudFormationClient(this.iamClientConfig());
    }

    public getCloudControlClient() {
        return new CloudControlClient(this.iamClientConfig());
    }

    private iamClientConfig(): IamClientConfig {
        const credential = this.credentialsProvider.getIAM();
        return {
            region: credential.region,
            credentials: this.credentialsProvider.getIAM(),
            customUserAgent: `${ExtensionId}/${ExtensionVersion}`,
        };
    }
}
