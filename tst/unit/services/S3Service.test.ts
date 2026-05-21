import { ResourceNotFoundException } from '@aws-sdk/client-cloudcontrol';
import { S3Client, PutObjectCommand, HeadBucketCommand } from '@aws-sdk/client-s3';
import { STSClient, GetCallerIdentityCommand } from '@aws-sdk/client-sts';
import { mockClient } from 'aws-sdk-client-mock';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { AwsClient } from '../../../src/services/AwsClient';
import { S3Service } from '../../../src/services/S3Service';

const s3Mock = mockClient(S3Client);
const stsMock = mockClient(STSClient);
const mockGetS3Client = vi.fn();
const mockGetStsClient = vi.fn();

const mockAwsClient = {
    getS3Client: mockGetS3Client,
    getStsClient: mockGetStsClient,
} as unknown as AwsClient;

// Mock fs module
vi.mock('fs', () => ({
    readFileSync: vi.fn(),
}));

describe('S3Service', () => {
    let service: S3Service;

    beforeEach(() => {
        vi.clearAllMocks();
        s3Mock.reset();
        stsMock.reset();
        mockGetS3Client.mockReturnValue(new S3Client({}));
        mockGetStsClient.mockReturnValue(new STSClient({}));
        stsMock.on(GetCallerIdentityCommand).resolves({ Account: '123456789012' });
        service = new S3Service(mockAwsClient);
    });

    afterEach(() => {
        vi.clearAllMocks();
    });

    describe('putObject', () => {
        it('should successfully upload file to S3', async () => {
            const localFilePath = '/path/to/file.txt';
            const s3Uri = 's3://test-bucket/test-key.txt';
            const fileContent = Buffer.from('test content');

            const { readFileSync } = await import('fs');
            vi.mocked(readFileSync).mockReturnValue(fileContent);

            s3Mock.on(PutObjectCommand).resolves({});

            await service.putObject(localFilePath, s3Uri);

            expect(s3Mock.commandCalls(PutObjectCommand)).toHaveLength(1);
            expect(s3Mock.commandCalls(PutObjectCommand)[0].args[0].input).toEqual({
                Bucket: 'test-bucket',
                Key: 'test-key.txt',
                Body: fileContent,
            });
        });

        it('should parse S3 URI with nested path', async () => {
            const localFilePath = '/path/to/file.txt';
            const s3Uri = 's3://test-bucket/folder/subfolder/test-key.txt';
            const fileContent = Buffer.from('test content');

            const { readFileSync } = await import('fs');
            vi.mocked(readFileSync).mockReturnValue(fileContent);

            s3Mock.on(PutObjectCommand).resolves({});

            await service.putObject(localFilePath, s3Uri);

            expect(s3Mock.commandCalls(PutObjectCommand)[0].args[0].input).toEqual({
                Bucket: 'test-bucket',
                Key: 'folder/subfolder/test-key.txt',
                Body: fileContent,
            });
        });
    });

    describe('putObjectContent', () => {
        it('should successfully upload string content to S3', async () => {
            const content = 'test content';
            const bucketName = 'test-bucket';
            const key = 'test-key.txt';
            const mockResult = { VersionId: 'version123' };

            s3Mock.on(PutObjectCommand).resolves(mockResult);

            const result = await service.putObjectContent(content, bucketName, key);

            expect(result).toEqual(mockResult);
            expect(s3Mock.commandCalls(PutObjectCommand)).toHaveLength(1);
            expect(s3Mock.commandCalls(PutObjectCommand)[0].args[0].input).toEqual({
                Bucket: bucketName,
                Key: key,
                Body: content,
            });
        });

        it('should successfully upload Buffer content to S3', async () => {
            const content = Buffer.from('test content');
            const bucketName = 'test-bucket';
            const key = 'test-key.txt';
            const mockResult = { VersionId: 'version456' };

            s3Mock.on(PutObjectCommand).resolves(mockResult);

            const result = await service.putObjectContent(content, bucketName, key);

            expect(result).toEqual(mockResult);
            expect(s3Mock.commandCalls(PutObjectCommand)).toHaveLength(1);
            expect(s3Mock.commandCalls(PutObjectCommand)[0].args[0].input).toEqual({
                Bucket: bucketName,
                Key: key,
                Body: content,
            });
        });
    });

    describe('verifyBucketAccessibleInRegion', () => {
        it('should return undefined when bucket is owned and in the correct region', async () => {
            s3Mock.on(HeadBucketCommand).resolves({ BucketRegion: 'us-east-1' });

            const result = await service.verifyBucketAccessibleInRegion('my-bucket', 'us-east-1');

            expect(result).toBeUndefined();
            expect(s3Mock.commandCalls(HeadBucketCommand)[0].args[0].input).toEqual({
                Bucket: 'my-bucket',
                ExpectedBucketOwner: '123456789012',
            });
        });

        it('should pass the caller account from STS as ExpectedBucketOwner', async () => {
            stsMock.on(GetCallerIdentityCommand).resolves({ Account: '987654321098' });
            s3Mock.on(HeadBucketCommand).resolves({ BucketRegion: 'us-east-1' });

            await service.verifyBucketAccessibleInRegion('my-bucket', 'us-east-1');

            expect(s3Mock.commandCalls(HeadBucketCommand)[0].args[0].input).toEqual({
                Bucket: 'my-bucket',
                ExpectedBucketOwner: '987654321098',
            });
        });

        it('should return error string when owned bucket is in a different region', async () => {
            s3Mock.on(HeadBucketCommand).resolves({ BucketRegion: 'eu-west-1' });

            const result = await service.verifyBucketAccessibleInRegion('my-bucket', 'us-east-1');

            expect(result).toContain('in region eu-west-1');
            expect(result).toContain('not us-east-1');
        });

        it('should throw ResourceNotFoundException when bucket is owned by another account (403)', async () => {
            const error = new Error('Forbidden');
            error.name = 'Forbidden';
            (error as { $metadata?: { httpStatusCode?: number } }).$metadata = { httpStatusCode: 403 };
            s3Mock.on(HeadBucketCommand).rejects(error);

            await expect(service.verifyBucketAccessibleInRegion('not-my-bucket', 'us-east-1')).rejects.toBeInstanceOf(
                ResourceNotFoundException,
            );
        });

        it('should throw ResourceNotFoundException when bucket does not exist (404)', async () => {
            const error = new Error('Not Found');
            error.name = 'NotFound';
            (error as { $metadata?: { httpStatusCode?: number } }).$metadata = { httpStatusCode: 404 };
            s3Mock.on(HeadBucketCommand).rejects(error);

            await expect(service.verifyBucketAccessibleInRegion('missing-bucket', 'us-east-1')).rejects.toBeInstanceOf(
                ResourceNotFoundException,
            );
        });

        it('should propagate network errors instead of treating them as ownership failures', async () => {
            const error = new Error('getaddrinfo ENOTFOUND s3.us-east-1.amazonaws.com');
            error.name = 'NetworkingError';
            s3Mock.on(HeadBucketCommand).rejects(error);

            await expect(service.verifyBucketAccessibleInRegion('my-bucket', 'us-east-1')).rejects.toThrow(
                'getaddrinfo ENOTFOUND',
            );
        });

        it('should propagate credential errors instead of treating them as ownership failures', async () => {
            const error = new Error('The security token included in the request is expired');
            error.name = 'ExpiredToken';
            (error as { $metadata?: { httpStatusCode?: number } }).$metadata = { httpStatusCode: 401 };
            s3Mock.on(HeadBucketCommand).rejects(error);

            await expect(service.verifyBucketAccessibleInRegion('my-bucket', 'us-east-1')).rejects.toThrow(
                'security token',
            );
        });

        it('should propagate 5xx server errors', async () => {
            const error = new Error('Internal Server Error');
            error.name = 'InternalError';
            (error as { $metadata?: { httpStatusCode?: number } }).$metadata = { httpStatusCode: 500 };
            s3Mock.on(HeadBucketCommand).rejects(error);

            await expect(service.verifyBucketAccessibleInRegion('my-bucket', 'us-east-1')).rejects.toThrow(
                'Internal Server Error',
            );
        });

        it('should propagate STS errors when caller identity cannot be resolved', async () => {
            stsMock.on(GetCallerIdentityCommand).rejects(new Error('STS unavailable'));

            await expect(service.verifyBucketAccessibleInRegion('my-bucket', 'us-east-1')).rejects.toThrow(
                'STS unavailable',
            );
            expect(s3Mock.commandCalls(HeadBucketCommand)).toHaveLength(0);
        });

        it('should throw when STS returns no account ID', async () => {
            stsMock.on(GetCallerIdentityCommand).resolves({});

            await expect(service.verifyBucketAccessibleInRegion('my-bucket', 'us-east-1')).rejects.toThrow(
                'did not return an account ID',
            );
            expect(s3Mock.commandCalls(HeadBucketCommand)).toHaveLength(0);
        });
    });
});
