import { describe, it, expect, vi, beforeEach } from 'vitest';
import { CancellationToken, ResponseError } from 'vscode-languageserver';
import { uploadFileToS3Handler } from '../../../src/handlers/S3Handler';
import { UploadFileParams } from '../../../src/s3/S3RequestType';
import { createMockComponents, MockedServerComponents } from '../../utils/MockServerComponents';

// Mock the parser
vi.mock('../../../src/s3/S3RequestParser', () => ({
    parseUploadFileParams: vi.fn((input) => input),
}));

describe('S3Handler', () => {
    let mockComponents: MockedServerComponents;
    let mockToken: CancellationToken;

    beforeEach(() => {
        mockComponents = createMockComponents();
        mockToken = {} as CancellationToken;
    });

    describe('uploadFileToS3Handler', () => {
        it('should successfully upload file', async () => {
            const params: UploadFileParams = {
                localFilePath: '/path/to/file.txt',
                s3Url: 's3://test-bucket/test-key.txt',
            };

            mockComponents.s3Service.putObject.resolves(undefined);

            const handler = uploadFileToS3Handler(mockComponents);
            await handler(params, mockToken);

            expect(
                mockComponents.s3Service.putObject.calledWith('/path/to/file.txt', 's3://test-bucket/test-key.txt'),
            ).toBe(true);
        });

        it('should handle S3 service errors', async () => {
            const params: UploadFileParams = {
                localFilePath: '/path/to/file.txt',
                s3Url: 's3://test-bucket/test-key.txt',
            };

            const error = new Error('S3 upload failed');
            mockComponents.s3Service.putObject.rejects(error);

            const handler = uploadFileToS3Handler(mockComponents);

            await expect(handler(params, mockToken)).rejects.toThrow(ResponseError);
            await expect(handler(params, mockToken)).rejects.toThrow('Failed to upload file to S3');
        });

        it('should handle validation errors', async () => {
            const invalidParams = {
                localFilePath: '',
                s3Url: 's3://test-bucket/test-key.txt',
            };

            const { parseUploadFileParams } = await import('../../../src/s3/S3RequestParser');
            vi.mocked(parseUploadFileParams).mockImplementation(() => {
                throw new TypeError('Invalid parameters');
            });

            const handler = uploadFileToS3Handler(mockComponents);

            await expect(handler(invalidParams, mockToken)).rejects.toThrow(ResponseError);
        });
    });
});
