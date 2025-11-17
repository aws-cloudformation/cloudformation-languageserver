import { readFileSync } from 'fs';
import { resolve } from 'path';
import { load } from 'js-yaml';
import { describe, it, expect } from 'vitest';
import { ArtifactExporter } from '../../../src/artifactexporter/ArtifactExporter';
import { DocumentType } from '../../../src/document/Document';
import { createMockComponents } from '../../utils/MockServerComponents';

describe('Upload Artifact to S3', () => {
    describe('YAML template', () => {
        it('should identify template artifacts', () => {
            const mockComponents = createMockComponents();
            const mockS3Service = mockComponents.s3Service;

            const templatePath = resolve(__dirname, '../../resources/templates/template_with_folder_artifact.yaml');
            const templateContent = readFileSync(templatePath, 'utf8');
            const exporter = new ArtifactExporter(mockS3Service, DocumentType.YAML, templatePath, templateContent);
            const artifacts = exporter.getTemplateArtifacts();

            expect(artifacts).toHaveLength(1);
            expect(artifacts[0].resourceType).toBe('AWS::Serverless::Function');
            expect(artifacts[0].filePath).toBe('./artifact/code');
        });

        it('should zip and upload folder artifact to S3', async () => {
            const mockComponents = createMockComponents();
            const mockS3Service = mockComponents.s3Service;
            mockS3Service.putObject.resolves({ VersionId: 'v1', $metadata: {} });

            const templatePath = resolve(__dirname, '../../resources/templates/template_with_folder_artifact.yaml');
            const originalContent = readFileSync(templatePath, 'utf8');
            const originalTemplate = load(originalContent) as any;

            const exporter = new ArtifactExporter(mockS3Service, DocumentType.YAML, templatePath, originalContent);
            const exportedTemplate = (await exporter.export('test-bucket', 'test-prefix')) as any;

            expect(mockS3Service.putObject.called).toBe(true);
            const [filePath, s3Url] = mockS3Service.putObject.getCall(0).args;
            expect(filePath).toMatch(/\.zip$/);
            expect(s3Url).toMatch(/^s3:\/\/test-bucket\/test-prefix\/artifact\//);

            expect(exportedTemplate.Resources.MyFunction.Properties.CodeUri).toMatch(
                /^s3:\/\/test-bucket\/test-prefix\/artifact\//,
            );

            delete originalTemplate.Resources.MyFunction.Properties.CodeUri;
            delete exportedTemplate.Resources.MyFunction.Properties.CodeUri;

            expect(JSON.stringify(exportedTemplate)).toBe(JSON.stringify(originalTemplate));
        });

        it('should upload file artifact to S3', async () => {
            const mockComponents = createMockComponents();
            const mockS3Service = mockComponents.s3Service;
            mockS3Service.putObject.resolves({ VersionId: 'v1', $metadata: {} });

            const templatePath = resolve(__dirname, '../../resources/templates/template_with_file_artifact.yaml');
            const originalContent = readFileSync(templatePath, 'utf8');
            const originalTemplate = load(originalContent) as any;

            const exporter = new ArtifactExporter(mockS3Service, DocumentType.YAML, templatePath, originalContent);
            const exportedTemplate = (await exporter.export('test-bucket', 'test-prefix')) as any;

            expect(exportedTemplate.Resources.MyApi.Properties.DefinitionUri).toMatch(
                /^s3:\/\/test-bucket\/test-prefix\/artifact\//,
            );

            delete originalTemplate.Resources.MyApi.Properties.DefinitionUri;
            delete exportedTemplate.Resources.MyApi.Properties.DefinitionUri;

            expect(JSON.stringify(exportedTemplate)).toBe(JSON.stringify(originalTemplate));
        });

        it('should do nothing when no artifacts exist', async () => {
            const mockComponents = createMockComponents();
            const mockS3Service = mockComponents.s3Service;

            const templatePath = resolve(__dirname, '../../resources/templates/simple.yaml');
            const templateContent = readFileSync(templatePath, 'utf8');
            const originalTemplate = load(templateContent) as any;

            const exporter = new ArtifactExporter(mockS3Service, DocumentType.YAML, templatePath, templateContent);
            const exportedTemplate = (await exporter.export('test-bucket', 'test-prefix')) as any;

            expect(mockS3Service.putObject.called).toBe(false);

            expect(JSON.stringify(exportedTemplate)).toBe(JSON.stringify(originalTemplate));
        });

        it('should handle S3 upload failures', async () => {
            const mockComponents = createMockComponents();
            const mockS3Service = mockComponents.s3Service;
            mockS3Service.putObject.rejects(new Error('S3 upload failed'));

            const templatePath = resolve(__dirname, '../../resources/templates/template_with_folder_artifact.yaml');
            const templateContent = readFileSync(templatePath, 'utf8');

            const exporter = new ArtifactExporter(mockS3Service, DocumentType.YAML, templatePath, templateContent);

            await expect(exporter.export('test-bucket', 'test-prefix')).rejects.toThrow('S3 upload failed');
        });

        it('should throw exception for broken templates', () => {
            const mockComponents = createMockComponents();
            const mockS3Service = mockComponents.s3Service;

            const templatePath = resolve(__dirname, '../../resources/templates/broken.yaml');
            const templateContent = readFileSync(templatePath, 'utf8');

            expect(() => {
                new ArtifactExporter(mockS3Service, DocumentType.YAML, templatePath, templateContent);
            }).toThrow();
        });
    });

    describe('JSON template', () => {
        it('should identify template artifacts', () => {
            const mockComponents = createMockComponents();
            const mockS3Service = mockComponents.s3Service;

            const templatePath = resolve(__dirname, '../../resources/templates/template_with_folder_artifact.json');
            const templateContent = readFileSync(templatePath, 'utf8');
            const exporter = new ArtifactExporter(mockS3Service, DocumentType.JSON, templatePath, templateContent);
            const artifacts = exporter.getTemplateArtifacts();

            expect(artifacts).toHaveLength(1);
            expect(artifacts[0].resourceType).toBe('AWS::Serverless::Function');
            expect(artifacts[0].filePath).toBe('./artifact/code');
        });

        it('should zip and upload folder artifact to S3', async () => {
            const mockComponents = createMockComponents();
            const mockS3Service = mockComponents.s3Service;
            mockS3Service.putObject.resolves({ VersionId: 'v1', $metadata: {} });

            const templatePath = resolve(__dirname, '../../resources/templates/template_with_folder_artifact.json');
            const originalContent = readFileSync(templatePath, 'utf8');
            const originalTemplate = JSON.parse(originalContent);

            const exporter = new ArtifactExporter(mockS3Service, DocumentType.JSON, templatePath, originalContent);
            const exportedTemplate = (await exporter.export('test-bucket', 'test-prefix')) as any;

            expect(mockS3Service.putObject.called).toBe(true);
            const [filePath, s3Url] = mockS3Service.putObject.getCall(0).args;
            expect(filePath).toMatch(/\.zip$/);
            expect(s3Url).toMatch(/^s3:\/\/test-bucket\/test-prefix\/artifact\//);

            expect(exportedTemplate.Resources.MyFunction.Properties.CodeUri).toMatch(
                /^s3:\/\/test-bucket\/test-prefix\/artifact\//,
            );

            delete originalTemplate.Resources.MyFunction.Properties.CodeUri;
            delete exportedTemplate.Resources.MyFunction.Properties.CodeUri;

            expect(JSON.stringify(exportedTemplate)).toBe(JSON.stringify(originalTemplate));
        });

        it('should upload file artifact to S3', async () => {
            const mockComponents = createMockComponents();
            const mockS3Service = mockComponents.s3Service;
            mockS3Service.putObject.resolves({ VersionId: 'v1', $metadata: {} });

            const templatePath = resolve(__dirname, '../../resources/templates/template_with_file_artifact.json');
            const originalContent = readFileSync(templatePath, 'utf8');
            const originalTemplate = JSON.parse(originalContent);

            const exporter = new ArtifactExporter(mockS3Service, DocumentType.JSON, templatePath, originalContent);
            const exportedTemplate = (await exporter.export('test-bucket', 'test-prefix')) as any;

            expect(exportedTemplate.Resources.MyApi.Properties.DefinitionUri).toMatch(
                /^s3:\/\/test-bucket\/test-prefix\/artifact\//,
            );

            delete originalTemplate.Resources.MyApi.Properties.DefinitionUri;
            delete exportedTemplate.Resources.MyApi.Properties.DefinitionUri;

            expect(JSON.stringify(exportedTemplate)).toBe(JSON.stringify(originalTemplate));
        });

        it('should do nothing when no artifacts exist', async () => {
            const mockComponents = createMockComponents();
            const mockS3Service = mockComponents.s3Service;

            const templatePath = resolve(__dirname, '../../resources/templates/simple.json');
            const templateContent = readFileSync(templatePath, 'utf8');
            const originalTemplate = JSON.parse(templateContent);

            const exporter = new ArtifactExporter(mockS3Service, DocumentType.JSON, templatePath, templateContent);
            const exportedTemplate = (await exporter.export('test-bucket', 'test-prefix')) as any;

            expect(mockS3Service.putObject.called).toBe(false);

            expect(JSON.stringify(exportedTemplate)).toBe(JSON.stringify(originalTemplate));
        });

        it('should handle S3 upload failures', async () => {
            const mockComponents = createMockComponents();
            const mockS3Service = mockComponents.s3Service;
            mockS3Service.putObject.rejects(new Error('S3 upload failed'));

            const templatePath = resolve(__dirname, '../../resources/templates/template_with_folder_artifact.json');
            const templateContent = readFileSync(templatePath, 'utf8');

            const exporter = new ArtifactExporter(mockS3Service, DocumentType.JSON, templatePath, templateContent);

            await expect(exporter.export('test-bucket', 'test-prefix')).rejects.toThrow('S3 upload failed');
        });

        it('should throw exception for broken templates', () => {
            const mockComponents = createMockComponents();
            const mockS3Service = mockComponents.s3Service;

            const templatePath = resolve(__dirname, '../../resources/templates/broken.json');
            const templateContent = readFileSync(templatePath, 'utf8');

            expect(() => {
                new ArtifactExporter(mockS3Service, DocumentType.JSON, templatePath, templateContent);
            }).toThrow();
        });
    });
});
