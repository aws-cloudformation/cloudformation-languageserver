import { readFileSync } from 'fs'; // eslint-disable-line no-restricted-imports -- TODO: Needs to be fixed
import { fileURLToPath } from 'url';
import {
    S3Client,
    PutObjectCommand,
    ListBucketsCommand,
    HeadObjectCommand,
    HeadBucketCommand,
    GetBucketEncryptionCommand,
} from '@aws-sdk/client-s3';
import { LoggerFactory } from '../telemetry/LoggerFactory';
import { Measure } from '../telemetry/TelemetryDecorator';
import { isClientError } from '../utils/AwsErrorMapper';
import { markIfClientError } from '../utils/FaultSuppression';
import { AwsClient } from './AwsClient';

const log = LoggerFactory.getLogger('S3Service');

export class S3Service {
    public constructor(private readonly awsClient: AwsClient) {}

    protected async withClient<T>(request: (client: S3Client) => Promise<T>): Promise<T> {
        try {
            const client = this.awsClient.getS3Client();
            return await request(client);
        } catch (error) {
            log.error(error, 'S3 API call failed');
            markIfClientError(error);
            throw error;
        }
    }

    @Measure({ name: 'listBuckets' })
    async listBuckets(region: string, continuationToken?: string): Promise<{ buckets: string[]; nextToken?: string }> {
        return await this.withClient(async (client) => {
            const response = await client.send(
                new ListBucketsCommand({
                    BucketRegion: region,
                    ContinuationToken: continuationToken,
                }),
            );
            return {
                buckets:
                    response.Buckets?.map((b) => b.Name).filter((name): name is string => name !== undefined) ?? [],
                nextToken: response.ContinuationToken,
            };
        });
    }

    @Measure({ name: 'putObject' })
    async putObjectContent(content: string | Buffer, bucketName: string, key: string) {
        return await this.withClient(async (client) => {
            return await client.send(
                new PutObjectCommand({
                    Bucket: bucketName,
                    Key: key,
                    Body: content,
                }),
            );
        });
    }

    @Measure({ name: 'headObject' })
    async getHeadObject(bucketName: string, key: string) {
        return await this.withClient(async (client) => {
            return await client.send(
                new HeadObjectCommand({
                    Bucket: bucketName,
                    Key: key,
                }),
            );
        });
    }

    @Measure({ name: 'verifyBucketAccessibleInRegion' })
    async verifyBucketAccessibleInRegion(bucketName: string, region: string): Promise<string | undefined> {
        const client = this.awsClient.getS3Client();

        try {
            await client.send(new GetBucketEncryptionCommand({ Bucket: bucketName }));
        } catch (error) {
            if (isClientError(error)) {
                return `Bucket "${bucketName}" is not owned by the current account`;
            }
            throw error;
        }

        try {
            const response = await client.send(new HeadBucketCommand({ Bucket: bucketName }));
            if (response.BucketRegion !== region) {
                return `Bucket "${bucketName}" is in region ${response.BucketRegion}, not ${region}`;
            }
        } catch (error) {
            if (isClientError(error)) {
                return `Bucket "${bucketName}" is not accessible`;
            }
            throw error;
        }

        return undefined;
    }

    async putObject(localFilePath: string, s3Url: string) {
        const url = new URL(s3Url);
        const bucket = url.hostname;
        const key = url.pathname.slice(1);

        const filePath = localFilePath.startsWith('file://') ? fileURLToPath(localFilePath) : localFilePath;

        const body = readFileSync(filePath);

        return await this.putObjectContent(body, bucket, key);
    }
}
