import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ArtifactExporter } from '../../../src/artifactexporter/ArtifactExporter';
import { DocumentType } from '../../../src/document/Document';
import { S3Service } from '../../../src/services/S3Service';

vi.mock('../../../src/services/S3Service');

describe('ArtifactExporter', () => {
    let mockS3Service: S3Service;

    beforeEach(() => {
        vi.clearAllMocks();
        mockS3Service = {
            putObjectContent: vi.fn(),
            putObject: vi.fn(),
        } as any;
    });

    describe('ArtifactExporter', () => {
        it('should create template with valid parameters', () => {
            const template = new ArtifactExporter(
                mockS3Service,
                DocumentType.YAML,
                'file:///path/to/template.yaml',
                'Resources:\n  Bucket:\n    Type: AWS::S3::Bucket',
            );
            expect(template).toBeDefined();
        });

        it('should export template', async () => {
            const template = new ArtifactExporter(
                mockS3Service,
                DocumentType.YAML,
                'file:///path/to/template.yaml',
                'Resources:\n  Bucket:\n    Type: AWS::S3::Bucket',
            );
            const result = await template.export('test-bucket');
            expect(result).toBeDefined();
        });
    });
});
