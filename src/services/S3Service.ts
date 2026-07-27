import { readFileSync } from 'fs'; // eslint-disable-line no-restricted-imports -- TODO: Needs to be fixed
import { fileURLToPath } from 'url';
import { ResourceNotFoundException } from '@aws-sdk/client-cloudcontrol';
import {
    S3Client,
    PutObjectCommand,
    GetObjectCommand,
    ListBucketsCommand,
    ListObjectsV2Command,
    CreateBucketCommand,
    BucketLocationConstraint,
    HeadObjectCommand,
    HeadBucketCommand,
} from '@aws-sdk/client-s3';
import { GetCallerIdentityCommand } from '@aws-sdk/client-sts';
import { LoggerFactory } from '../telemetry/LoggerFactory';
import { ScopedTelemetry } from '../telemetry/ScopedTelemetry';
import { Measure, Telemetry } from '../telemetry/TelemetryDecorator';
import { classifyAwsError } from '../utils/errors/AwsErrorMapper';
import { markIfClientError } from '../utils/errors/FaultSuppression';
import { AwsClient } from './AwsClient';

const log = LoggerFactory.getLogger('S3Service');

export class S3Service {
    @Telemetry()
    private readonly telemetry!: ScopedTelemetry;

    public constructor(private readonly awsClient: AwsClient) {}

    getRegion(): string {
        return this.awsClient.getRegion();
    }

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

    /**
     * List all bucket names in the account (across regions), paginating up to `maxBuckets`.
     * Used to populate a bucket picker.
     */
    @Measure({ name: 'listAllBucketNames' })
    async listAllBucketNames(maxBuckets = 1000): Promise<string[]> {
        const region = this.awsClient.getRegion();
        return await this.withClient(async (client) => {
            const names: string[] = [];
            let continuationToken: string | undefined;
            do {
                const response = await client.send(
                    new ListBucketsCommand({ BucketRegion: region, ContinuationToken: continuationToken }),
                );
                for (const bucket of response.Buckets ?? []) {
                    if (bucket.Name) {
                        names.push(bucket.Name);
                    }
                }
                continuationToken = response.ContinuationToken;
            } while (continuationToken && names.length < maxBuckets);
            return names;
        });
    }

    @Measure({ name: 'listObjects' })
    async listObjects(bucketName: string, prefix?: string, maxKeys = 1000): Promise<string[]> {
        return await this.withClient(async (client) => {
            const keys: string[] = [];
            let continuationToken: string | undefined;
            do {
                const response = await client.send(
                    new ListObjectsV2Command({
                        Bucket: bucketName,
                        Prefix: prefix,
                        ContinuationToken: continuationToken,
                    }),
                );
                for (const object of response.Contents ?? []) {
                    if (object.Key !== undefined) {
                        keys.push(object.Key);
                    }
                }
                continuationToken = response.IsTruncated ? response.NextContinuationToken : undefined;
            } while (continuationToken && keys.length < maxKeys);
            return keys.slice(0, maxKeys);
        });
    }

    /**
     * Create a bucket in the client's region. us-east-1 must NOT send a LocationConstraint
     * (it's the default and specifying it errors); every other region must.
     */
    @Measure({ name: 'createBucket' })
    async createBucket(bucketName: string): Promise<void> {
        const region = this.awsClient.getRegion();
        await this.withClient(async (client) => {
            await client.send(
                new CreateBucketCommand({
                    Bucket: bucketName,
                    ...(region && region !== 'us-east-1'
                        ? { CreateBucketConfiguration: { LocationConstraint: region as BucketLocationConstraint } }
                        : {}),
                }),
            );
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

    @Measure({ name: 'getObject' })
    async getObjectContent(bucketName: string, key: string): Promise<string> {
        return await this.withClient(async (client) => {
            const response = await client.send(
                new GetObjectCommand({
                    Bucket: bucketName,
                    Key: key,
                }),
            );
            return (await response.Body?.transformToString()) ?? '';
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
                    this.telemetry.count('verifyBucketAccessibleInRegion.inccessible', 1);
                    return `Bucket "${bucketName}" is in region ${response.BucketRegion}, not ${region}`;
                }

                this.telemetry.count('verifyBucketAccessibleInRegion.accessible', 1);
                return;
            } catch (error) {
                // 403 (cross-account or wrong owner) and 404 (doesn't exist) both mean the bucket
                // is not a valid resource for this caller. Translate to ResourceNotFoundException
                // so callers handle it like any other CCAPI not-found result. Other errors
                // (network, credentials, throttling, 5xx) propagate unchanged.
                const { httpStatus } = classifyAwsError(error);
                if (httpStatus === 403 || httpStatus === 404) {
                    this.telemetry.count('verifyBucketAccessibleInRegion.inccessible', 1);
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
