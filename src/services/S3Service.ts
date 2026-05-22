import { readFileSync } from 'fs'; // eslint-disable-line no-restricted-imports -- TODO: Needs to be fixed
import { fileURLToPath } from 'url';
import { ResourceNotFoundException } from '@aws-sdk/client-cloudcontrol';
import {
    S3Client,
    PutObjectCommand,
    ListBucketsCommand,
    HeadObjectCommand,
    HeadBucketCommand,
} from '@aws-sdk/client-s3';
import { GetCallerIdentityCommand } from '@aws-sdk/client-sts';
import { LoggerFactory } from '../telemetry/LoggerFactory';
import { Measure } from '../telemetry/TelemetryDecorator';
import { classifyAwsError } from '../utils/AwsErrorMapper';
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
        const expectedOwner = await this.getCallerAccountId();

        return await this.withClient(async (client) => {
            try {
                // HeadBucket with ExpectedBucketOwner is a strict ownership check: S3 returns 403
                // when the bucket's owner doesn't match the caller's account, even for buckets the
                // caller has cross-account read access to (e.g. publicly readable buckets owned by
                // other accounts). It also returns BucketRegion in the response, so a single call
                // covers both ownership and region verification. The `s3:ListBucket` permission it
                // requires is already part of the AWS::S3::Bucket read handler permission set.
                const response = await client.send(
                    new HeadBucketCommand({
                        Bucket: bucketName,
                        ExpectedBucketOwner: expectedOwner,
                    }),
                );

                if (response.BucketRegion !== region) {
                    return `Bucket "${bucketName}" is in region ${response.BucketRegion}, not ${region}`;
                }

                return;
            } catch (error) {
                // 403 (cross-account or wrong owner) and 404 (doesn't exist) both mean the bucket
                // is not a valid resource for this caller. Translate to ResourceNotFoundException
                // so callers handle it like any other CCAPI not-found result. Other errors
                // (network, credentials, throttling, 5xx) propagate unchanged.
                const { httpStatus } = classifyAwsError(error);
                if (httpStatus === 403 || httpStatus === 404) {
                    throw new ResourceNotFoundException({
                        message: `Resource of type 'AWS::S3::Bucket' with identifier '${bucketName}' was not found`,
                        $metadata: { httpStatusCode: httpStatus },
                    });
                }
                throw error;
            }
        });
    }

    private async getCallerAccountId(): Promise<string> {
        const sts = this.awsClient.getStsClient();
        try {
            const identity = await sts.send(new GetCallerIdentityCommand({}));
            if (!identity.Account) {
                throw new Error('STS GetCallerIdentity did not return an account ID');
            }
            return identity.Account;
        } catch (error) {
            log.error(error, 'Failed to resolve caller account ID via STS');
            markIfClientError(error);
            throw error;
        }
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
