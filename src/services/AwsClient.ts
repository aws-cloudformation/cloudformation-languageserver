import { CloudControlClient } from '@aws-sdk/client-cloudcontrol';
import { CloudFormationClient } from '@aws-sdk/client-cloudformation';
import { ControlCatalogClient } from '@aws-sdk/client-controlcatalog';
import { IAMClient } from '@aws-sdk/client-iam';
import { S3Client } from '@aws-sdk/client-s3';
import { STSClient } from '@aws-sdk/client-sts';
import { AwsCredentials } from '../auth/AwsCredentials';
import { IamCredentials } from '../auth/AwsLspAuthTypes';
import { ExtensionId, ExtensionVersion } from '../utils/ExtensionConfig';

type IamClientConfig = {
    region: string;
    credentials: IamCredentials;
    customUserAgent: string;
};

export class AwsClient {
    constructor(
        private readonly credentialsProvider: AwsCredentials,
        private readonly cloudformationEndpoint?: string,
    ) {}

    public getCloudFormationClient() {
        return new CloudFormationClient({
            ...this.iamClientConfig(),
            endpoint: this.cloudformationEndpoint,
        });
    }

    public getCloudControlClient() {
        return new CloudControlClient(this.iamClientConfig());
    }

    public getS3Client() {
        return new S3Client(this.iamClientConfig());
    }

    public getStsClient() {
        return new STSClient(this.iamClientConfig());
    }

    public getIamClient() {
        return new IAMClient(this.iamClientConfig());
    }

    public getControlCatalogClient() {
        return new ControlCatalogClient(this.iamClientConfig());
    }

    public getRegion(): string {
        return this.credentialsProvider.getIAM().region;
    }

    private iamClientConfig(): IamClientConfig {
        const credential = this.credentialsProvider.getIAM();
        return {
            region: credential.region,
            credentials: credential,
            customUserAgent: `${ExtensionId}/${ExtensionVersion}`,
        };
    }
}
