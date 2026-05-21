import { S3Client, PutObjectCommand, GetBucketEncryptionCommand, HeadBucketCommand } from '@aws-sdk/client-s3';
import { mockClient } from 'aws-sdk-client-mock';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { AwsClient } from '../../../src/services/AwsClient';
import { S3Service } from '../../../src/services/S3Service';

const s3Mock = mockClient(S3Client);
const mockGetS3Client = vi.fn();

const mockAwsClient = {
    getS3Client: mockGetS3Client,
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
        mockGetS3Client.mockReturnValue(new S3Client({}));
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
            s3Mock.on(GetBucketEncryptionCommand).resolves({});
            s3Mock.on(HeadBucketCommand).resolves({ BucketRegion: 'us-east-1' });

            const result = await service.verifyBucketAccessibleInRegion('my-bucket', 'us-east-1');

            expect(result).toBeUndefined();
            expect(s3Mock.commandCalls(GetBucketEncryptionCommand)[0].args[0].input).toEqual({
                Bucket: 'my-bucket',
            });
            expect(s3Mock.commandCalls(HeadBucketCommand)[0].args[0].input).toEqual({
                Bucket: 'my-bucket',
            });
        });

        it('should return error string when bucket is in a different region', async () => {
            s3Mock.on(GetBucketEncryptionCommand).resolves({});
            s3Mock.on(HeadBucketCommand).resolves({ BucketRegion: 'eu-west-1' });

            const result = await service.verifyBucketAccessibleInRegion('my-bucket', 'us-east-1');

            expect(result).toContain('in region eu-west-1');
            expect(result).toContain('not us-east-1');
        });

        it('should propagate access-denied errors from GetBucketEncryption without claiming ownership', async () => {
            const error = new Error('Access Denied');
            error.name = 'AccessDenied';
            (error as { $metadata?: { httpStatusCode?: number } }).$metadata = { httpStatusCode: 403 };
            s3Mock.on(GetBucketEncryptionCommand).rejects(error);

            await expect(service.verifyBucketAccessibleInRegion('not-my-bucket', 'us-east-1')).rejects.toThrow(
                'Access Denied',
            );
            expect(s3Mock.commandCalls(HeadBucketCommand)).toHaveLength(0);
        });

        it('should propagate NoSuchBucket errors from GetBucketEncryption', async () => {
            const error = new Error('The specified bucket does not exist');
            error.name = 'NoSuchBucket';
            (error as { $metadata?: { httpStatusCode?: number } }).$metadata = { httpStatusCode: 404 };
            s3Mock.on(GetBucketEncryptionCommand).rejects(error);

            await expect(service.verifyBucketAccessibleInRegion('missing-bucket', 'us-east-1')).rejects.toThrow(
                'The specified bucket does not exist',
            );
            expect(s3Mock.commandCalls(HeadBucketCommand)).toHaveLength(0);
        });

        it('should propagate network errors instead of claiming ownership failure', async () => {
            const error = new Error('getaddrinfo ENOTFOUND s3.us-east-1.amazonaws.com');
            error.name = 'NetworkingError';
            s3Mock.on(GetBucketEncryptionCommand).rejects(error);

            await expect(service.verifyBucketAccessibleInRegion('my-bucket', 'us-east-1')).rejects.toThrow(
                'getaddrinfo ENOTFOUND',
            );
        });

        it('should propagate server errors from GetBucketEncryption', async () => {
            const error = new Error('Internal Server Error');
            error.name = 'InternalError';
            (error as { $metadata?: { httpStatusCode?: number } }).$metadata = { httpStatusCode: 500 };
            s3Mock.on(GetBucketEncryptionCommand).rejects(error);

            await expect(service.verifyBucketAccessibleInRegion('my-bucket', 'us-east-1')).rejects.toThrow(
                'Internal Server Error',
            );
        });

        it('should propagate HeadBucket failures after a successful encryption check', async () => {
            s3Mock.on(GetBucketEncryptionCommand).resolves({});
            const error = new Error('Not Found');
            error.name = 'NotFound';
            (error as { $metadata?: { httpStatusCode?: number } }).$metadata = { httpStatusCode: 404 };
            s3Mock.on(HeadBucketCommand).rejects(error);

            await expect(service.verifyBucketAccessibleInRegion('my-bucket', 'us-east-1')).rejects.toThrow('Not Found');
        });
    });
});
