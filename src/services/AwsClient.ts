import { CloudControlClient } from '@aws-sdk/client-cloudcontrol';
import { CloudFormationClient } from '@aws-sdk/client-cloudformation';
import { STSClient, GetCallerIdentityCommand, STSServiceException } from '@aws-sdk/client-sts';
import { AwsCredentials } from '../auth/AwsCredentials';
import { IamCredentials } from '../auth/AwsLspAuthTypes';
import { LspCommunication } from '../protocol/LspCommunication';
import { ExtensionId, ExtensionVersion } from '../utils/ExtensionConfig';

type IamClientConfig = {
    region: string;
    credentials: IamCredentials;
    customUserAgent: string;
};

export class AwsClient {
    constructor(
        private readonly credentialsProvider: AwsCredentials,
        private readonly communication?: LspCommunication,
    ) {}

    public getCloudFormationClient() {
        return new CloudFormationClient(this.iamClientConfig());
    }

    public getCloudControlClient() {
        return new CloudControlClient(this.iamClientConfig());
    }

    public async validateCredentials(): Promise<boolean> {
        try {
            const sts = new STSClient(this.iamClientConfig());
            await sts.send(new GetCallerIdentityCommand({}));
            return true;
        } catch (error: unknown) {
            if (error instanceof STSServiceException && error.$metadata?.httpStatusCode === 403) {
                // Valid credentials but insufficient permissions - not an auth error
                return true;
            }
            void this.communication?.sendAuthErrorNotification();
            return false;
        }
    }

    private iamClientConfig(): IamClientConfig {
        try {
            const credential = this.credentialsProvider.getIAM();
            return {
                region: credential.region,
                credentials: credential,
                customUserAgent: `${ExtensionId}/${ExtensionVersion}`,
            };
        } catch {
            void this.communication?.sendAuthErrorNotification();
            throw new Error('AWS credentials not configured. Authentication required for online features.');
        }
    }
}
