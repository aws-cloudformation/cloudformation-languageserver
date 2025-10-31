import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
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
});
