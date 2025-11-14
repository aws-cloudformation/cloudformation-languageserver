import { existsSync, statSync, copyFileSync, rmSync } from 'fs';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
    isS3Url,
    isLocalFile,
    RESOURCES_EXPORT_LIST,
    RESOURCE_EXPORTER_MAP,
} from '../../../src/artifactexporter/ResourceExporters';
import { S3Service } from '../../../src/services/S3Service';

vi.mock('../../../src/services/S3Service');
vi.mock('../../../src/artifactexporter/ArtifactExporter');
vi.mock('fs', () => ({
    existsSync: vi.fn(),
    mkdtempSync: vi.fn().mockReturnValue('/tmp/cfn-123'),
    copyFileSync: vi.fn(),
    rmSync: vi.fn(),
    createWriteStream: vi.fn().mockReturnValue({
        on: vi.fn((event, callback) => {
            if (event === 'close') callback();
        }),
    }),
    statSync: vi.fn(),
    readFileSync: vi.fn().mockReturnValue('template content'),
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
vi.mock('url', () => ({
    pathToFileURL: vi.fn().mockReturnValue({ href: 'file:///template.yaml' }),
}));
vi.mock('archiver', () => ({
    default: vi.fn().mockReturnValue({
        pipe: vi.fn(),
        directory: vi.fn(),
        finalize: vi.fn().mockResolvedValue(undefined),
        on: vi.fn(),
    }),
}));
vi.mock('js-yaml', async (importOriginal) => {
    const actual = await importOriginal<typeof import('js-yaml')>();
    return {
        ...actual,
        dump: vi.fn().mockReturnValue('exported template'),
    };
});
vi.mock('../../../src/document/DocumentUtils', () => ({
    detectDocumentType: vi.fn().mockReturnValue({ type: 'YAML' }),
}));

describe('ResourceExporters', () => {
    let mockS3Service: S3Service;

    beforeEach(() => {
        vi.clearAllMocks();
        mockS3Service = {
            putObject: vi.fn().mockResolvedValue({ VersionId: 'version123' }),
            putObjectContent: vi.fn().mockResolvedValue({}),
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

    describe('RESOURCES_EXPORT_LIST', () => {
        it('should test all resource exporters from RESOURCES_EXPORT_LIST', async () => {
            vi.mocked(existsSync).mockReturnValue(true);
            vi.mocked(statSync).mockReturnValue({ isFile: () => true, isDirectory: () => false } as any);

            for (const ResourceClass of RESOURCES_EXPORT_LIST) {
                const resource = new ResourceClass(mockS3Service, 'test-bucket', 'prefix/');
                const resourceDict = { [resource.propertyName]: 'local-path' };

                await resource.export(resourceDict, './test-file', 'test-bucket', 'prefix/');

                expect(resource.resourceType).toBeDefined();
                expect(resource.propertyName).toBeDefined();
            }
        });

        it('should handle null properties based on packageNullProperty flag', async () => {
            vi.mocked(existsSync).mockReturnValue(true);
            vi.mocked(statSync).mockReturnValue({ isFile: () => true, isDirectory: () => false } as any);

            for (const ResourceClass of RESOURCES_EXPORT_LIST) {
                const resource = new ResourceClass(mockS3Service, 'test-bucket', 'prefix/');
                const resourceDict = {};

                await resource.export(resourceDict, './test-file', 'test-bucket', 'prefix/');

                // Test passes if no error is thrown
                expect(resource.resourceType).toBeDefined();
            }
        });

        it('should test specific resource types', () => {
            const resourceTypes = RESOURCES_EXPORT_LIST.map((ResourceClass) => {
                const resource = new ResourceClass(mockS3Service, 'test-bucket', 'prefix/');
                return resource.resourceType;
            });

            expect(resourceTypes).toContain('AWS::Serverless::Function');
            expect(resourceTypes).toContain('AWS::Lambda::Function');
            expect(resourceTypes).toContain('AWS::CloudFormation::Stack');
            expect(resourceTypes).toContain('AWS::Serverless::LayerVersion');
            expect(resourceTypes).toContain('AWS::Lambda::LayerVersion');
        });
    });

    describe('RESOURCE_EXPORTER_MAP', () => {
        it('should contain all expected resource types', () => {
            expect(RESOURCE_EXPORTER_MAP.has('AWS::Lambda::Function')).toBe(true);
            expect(RESOURCE_EXPORTER_MAP.has('AWS::Serverless::Function')).toBe(true);
            expect(RESOURCE_EXPORTER_MAP.has('AWS::ApiGateway::RestApi')).toBe(true);
            expect(RESOURCE_EXPORTER_MAP.has('AWS::CloudFormation::Stack')).toBe(true);
        });

        it('should instantiate resources from map correctly', () => {
            for (const [resourceType, ResourceClass] of RESOURCE_EXPORTER_MAP) {
                const resource = new ResourceClass(mockS3Service);
                expect(resource.resourceType).toBe(resourceType);
                expect(resource.propertyName).toBeDefined();
            }
        });
    });

    describe('Edge cases', () => {
        it('should handle empty resource property dict', async () => {
            const ResourceClass = RESOURCES_EXPORT_LIST[0];
            const resource = new ResourceClass(mockS3Service, 'test-bucket', 'prefix/');

            await resource.export(null as any, './src/handler.js', 'test-bucket', 'prefix/');

            expect(mockS3Service.putObject).not.toHaveBeenCalled();
        });

        it('should handle archive files correctly', async () => {
            vi.mocked(existsSync).mockReturnValue(true);
            vi.mocked(statSync).mockReturnValue({ isFile: () => true, isDirectory: () => false } as any);

            const ResourceClass = RESOURCES_EXPORT_LIST[0];
            const resource = new ResourceClass(mockS3Service, 'test-bucket', 'prefix/');
            const resourceDict = { [resource.propertyName]: 'local-path' };

            await resource.export(resourceDict, './code.zip', 'test-bucket', 'prefix/');

            expect(mockS3Service.putObject).toHaveBeenCalled();
        });

        it('should handle non-archive files with forceZip', async () => {
            vi.mocked(existsSync).mockReturnValue(true);
            vi.mocked(statSync).mockReturnValue({ isFile: () => true, isDirectory: () => false } as any);
            vi.mocked(copyFileSync).mockImplementation(() => {});
            vi.mocked(rmSync).mockImplementation(() => {});

            // Find a resource with forceZip = true (like ServerlessFunctionResource)
            const ResourceClass = RESOURCES_EXPORT_LIST.find((R) => {
                const resource = new R(mockS3Service, 'test-bucket', 'prefix/');
                return resource.resourceType === 'AWS::Serverless::Function';
            })!;

            const resource = new ResourceClass(mockS3Service, 'test-bucket', 'prefix/');
            const resourceDict = { [resource.propertyName]: 'local-path' };

            // Test with non-archive file that should be zipped due to forceZip
            await resource.export(resourceDict, './handler.js', 'test-bucket', 'prefix/');

            expect(vi.mocked(copyFileSync)).toHaveBeenCalled();
            expect(mockS3Service.putObject).toHaveBeenCalled();
        });

        it('should handle directory zipping', async () => {
            vi.mocked(existsSync).mockReturnValue(true);
            vi.mocked(statSync).mockReturnValue({ isFile: () => false, isDirectory: () => true } as any);

            const ResourceClass = RESOURCES_EXPORT_LIST[0];
            const resource = new ResourceClass(mockS3Service, 'test-bucket', 'prefix/');
            const resourceDict = { [resource.propertyName]: 'local-path' };

            await resource.export(resourceDict, './src/folder', 'test-bucket', 'prefix/');

            expect(mockS3Service.putObject).toHaveBeenCalled();
        });
    });
});
