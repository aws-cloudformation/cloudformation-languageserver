import { readFileSync } from 'fs'; // eslint-disable-line no-restricted-syntax -- Needs to be fixed
import { fileURLToPath } from 'url';
import { S3Client, PutObjectCommand, ListBucketsCommand, HeadObjectCommand } from '@aws-sdk/client-s3';
import { Measure } from '../telemetry/TelemetryDecorator';
import { AwsClient } from './AwsClient';

export class S3Service {
    public constructor(private readonly awsClient: AwsClient) {}

    protected async withClient<T>(request: (client: S3Client) => Promise<T>): Promise<T> {
        const client = this.awsClient.getS3Client();
        return await request(client);
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

    async putObject(localFilePath: string, s3Url: string) {
        const url = new URL(s3Url);
        const bucket = url.hostname;
        const key = url.pathname.slice(1);

        const filePath = localFilePath.startsWith('file://') ? fileURLToPath(localFilePath) : localFilePath;

        const body = readFileSync(filePath);

        return await this.putObjectContent(body, bucket, key);
    }
}
