import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { AwsClient } from './AwsClient';

export class S3Service {
    public constructor(private readonly awsClient: AwsClient) {}

    protected async withClient<T>(request: (client: S3Client) => Promise<T>): Promise<T> {
        const client = this.awsClient.getS3Client();
        return await request(client);
    }

    async putObject(localFilePath: string, s3Url: string): Promise<void> {
        return await this.withClient(async (client) => {
            const url = new URL(s3Url);
            const bucket = url.hostname;
            const key = url.pathname.slice(1);

            // Convert file URI to local path if needed
            const filePath = localFilePath.startsWith('file://') ? fileURLToPath(localFilePath) : localFilePath;

            const body = readFileSync(filePath);

            await client.send(
                new PutObjectCommand({
                    Bucket: bucket,
                    Key: key,
                    Body: body,
                }),
            );
        });
    }
}
