import { CloudControlClient } from '@aws-sdk/client-cloudcontrol';
import { CloudFormationClient } from '@aws-sdk/client-cloudformation';
import { S3Client } from '@aws-sdk/client-s3';
import { AwsCredentials } from '../auth/AwsCredentials';
import { IamCredentials } from '../auth/AwsLspAuthTypes';
import { ExtensionId, ExtensionVersion } from '../utils/ExtensionConfig';

type IamClientConfig = {
    region: string;
    credentials: IamCredentials;
    customUserAgent: string;
    endpoint?: string;
};

export class AwsClient {
    constructor(
        private readonly credentialsProvider: AwsCredentials,
        private readonly cloudformationEndpoint?: string,
    ) {}

    // By default, clients will retry on throttling exceptions 3 times
    public getCloudFormationClient() {
        return new CloudFormationClient(this.iamClientConfig());
    }

    public getCloudControlClient() {
        return new CloudControlClient(this.iamClientConfig());
    }

    public getS3Client() {
        return new S3Client(this.iamClientConfig());
    }

    private iamClientConfig(): IamClientConfig {
        try {
            const credential = this.credentialsProvider.getIAM();
            return {
                region: credential.region,
                credentials: credential,
                customUserAgent: `${ExtensionId}/${ExtensionVersion}`,
                endpoint: this.cloudformationEndpoint,
            };
        } catch {
            throw new Error('AWS credentials not configured. Authentication required for online features.');
        }
    }
}
