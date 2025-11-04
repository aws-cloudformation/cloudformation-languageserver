import { existsSync, statSync } from 'fs';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
    isS3Url,
    isLocalFile,
    ServerlessFunctionResource,
    LambdaFunctionResource,
} from '../../../src/artifactexporter/ResourceExporters';
import { S3Service } from '../../../src/services/S3Service';

vi.mock('../../../src/services/S3Service');
vi.mock('fs', () => ({
    existsSync: vi.fn(),
    mkdtempSync: vi.fn().mockReturnValue('/tmp/cfn-123'),
    copyFileSync: vi.fn(),
    rmSync: vi.fn(),
    createWriteStream: vi.fn(),
    statSync: vi.fn(),
    openSync: vi.fn().mockReturnValue(1),
    readSync: vi.fn().mockReturnValue(8),
    closeSync: vi.fn(),
}));
vi.mock('os', () => ({
    tmpdir: vi.fn().mockReturnValue('/tmp'),
}));
vi.mock('path', () => {
    const mockPath = {
        join: vi.fn().mockImplementation((...args) => args.join('/')),
        basename: vi.fn().mockImplementation((path) => path.split('/').pop()),
        extname: vi.fn().mockImplementation((path) => {
            const parts = path.split('.');
            return parts.length > 1 ? '.' + parts[parts.length - 1] : '';
        }),
    };
    return {
        default: mockPath,
        ...mockPath,
    };
});
vi.mock('archiver', () => ({
    default: vi.fn(),
}));

describe('ResourceExporters', () => {
    let mockS3Service: S3Service;

    beforeEach(() => {
        vi.clearAllMocks();
        mockS3Service = {
            putObject: vi.fn().mockResolvedValue({ VersionId: 'version123' }),
        } as any;
    });

    describe('isS3Url', () => {
        it('should return true for valid S3 URLs', () => {
            expect(isS3Url('s3://bucket/key')).toBe(true);
            expect(isS3Url('s3://my-bucket/folder/file.txt')).toBe(true);
        });

        it('should return false for invalid S3 URLs', () => {
            expect(isS3Url('http://example.com')).toBe(false);
            expect(isS3Url('s3://bucket')).toBe(false);
            expect(isS3Url('bucket/key')).toBe(false);
            expect(isS3Url('')).toBe(false);
        });
    });

    describe('isLocalFile', () => {
        it('should return true for existing files', () => {
            vi.mocked(existsSync).mockReturnValue(true);
            vi.mocked(statSync).mockReturnValue({ isFile: () => true } as any);

            expect(isLocalFile('/path/to/file.txt')).toBe(true);
        });

        it('should return false for non-existing files', () => {
            vi.mocked(existsSync).mockReturnValue(false);

            expect(isLocalFile('/path/to/missing.txt')).toBe(false);
        });

        it('should return false for directories', () => {
            vi.mocked(existsSync).mockReturnValue(true);
            vi.mocked(statSync).mockReturnValue({ isFile: () => false } as any);

            expect(isLocalFile('/path/to/directory')).toBe(false);
        });
    });

    describe('ServerlessFunctionResource', () => {
        it('should export function code to S3', async () => {
            vi.mocked(existsSync).mockReturnValue(true);
            vi.mocked(statSync).mockReturnValue({ isFile: () => true, isDirectory: () => false } as any);

            const resource = new ServerlessFunctionResource(mockS3Service, 'test-bucket', 'prefix/');
            const resourceDict = { CodeUri: 'local-path' };

            await resource.export(resourceDict, './src/handler.js');

            expect(mockS3Service.putObject).toHaveBeenCalled();
            expect(resourceDict.CodeUri).toMatch(/^s3:\/\/test-bucket\//);
        });

        it('should have correct resource type and property', () => {
            const resource = new ServerlessFunctionResource(mockS3Service, 'test-bucket');
            expect(resource.resourceType).toBe('AWS::Serverless::Function');
            expect(resource.propertyName).toBe('CodeUri');
        });
    });

    describe('LambdaFunctionResource', () => {
        it('should export function code with S3 record format', async () => {
            vi.mocked(existsSync).mockReturnValue(true);
            vi.mocked(statSync).mockReturnValue({ isFile: () => true, isDirectory: () => false } as any);

            const resource = new LambdaFunctionResource(mockS3Service, 'test-bucket', 'prefix/');
            const resourceDict = { Code: 'local-path' };

            await resource.export(resourceDict, './src/handler.js');

            expect(mockS3Service.putObject).toHaveBeenCalled();
            expect(resourceDict.Code).toEqual({
                S3Bucket: 'test-bucket',
                S3Key: expect.stringMatching(/^prefix\/artifact\/cfn-\d+-\d+$/),
                S3ObjectVersion: 'version123',
            });
        });

        it('should have correct resource type and property', () => {
            const resource = new LambdaFunctionResource(mockS3Service, 'test-bucket');
            expect(resource.resourceType).toBe('AWS::Lambda::Function');
            expect(resource.propertyName).toBe('Code');
        });
    });
});
