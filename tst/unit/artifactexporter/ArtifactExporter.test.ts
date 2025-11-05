import { readFileSync } from 'fs';
import { load } from 'js-yaml';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ArtifactExporter } from '../../../src/artifactexporter/ArtifactExporter';
import { Document, DocumentType } from '../../../src/document/Document';
import { S3Service } from '../../../src/services/S3Service';

vi.mock('../../../src/services/S3Service');
vi.mock('fs', () => ({
    readFileSync: vi.fn(),
}));
vi.mock('js-yaml', () => ({
    load: vi.fn(),
    Type: vi.fn(),
    DEFAULT_SCHEMA: {
        extend: vi.fn().mockReturnValue({}),
    },
}));

describe('ArtifactExporter', () => {
    let mockS3Service: S3Service;
    let mockDocument: Document;

    beforeEach(() => {
        vi.clearAllMocks();
        mockS3Service = {
            putObjectContent: vi.fn(),
            putObject: vi.fn(),
        } as any;
        mockDocument = {
            getParsedDocumentContent: vi.fn().mockReturnValue({ Resources: {} }),
            documentType: DocumentType.YAML,
        } as any;
    });

    describe('Template', () => {
        it('should create template with document', () => {
            const template = new ArtifactExporter(mockS3Service, 'test-bucket', 'prefix/', mockDocument);
            expect(template).toBeDefined();
        });

        it('should create template with absolute path', () => {
            vi.mocked(readFileSync).mockReturnValue('Resources:\n  Bucket:\n    Type: AWS::S3::Bucket');
            vi.mocked(load).mockReturnValue({ Resources: { Bucket: { Type: 'AWS::S3::Bucket' } } });

            const template = new ArtifactExporter(
                mockS3Service,
                'test-bucket',
                'prefix/',
                undefined,
                '/path/to/template.yaml',
            );
            expect(template).toBeDefined();
            expect(readFileSync).toHaveBeenCalledWith('/path/to/template.yaml', 'utf8');
        });

        it('should throw error when neither document nor path provided', () => {
            expect(() => {
                new ArtifactExporter(mockS3Service, 'test-bucket', 'prefix/');
            }).toThrow('Either document or absolutePath must be provided');
        });

        it('should export template', async () => {
            const template = new ArtifactExporter(mockS3Service, 'test-bucket', 'prefix/', mockDocument);
            const result = await template.export();
            expect(result).toEqual({ Resources: {} });
        });
    });
});
