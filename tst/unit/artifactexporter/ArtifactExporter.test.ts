import { join } from 'path';
import { pathToFileURL } from 'url';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ArtifactExporter } from '../../../src/artifactexporter/ArtifactExporter';
import { DocumentType } from '../../../src/document/Document';
import { S3Service } from '../../../src/services/S3Service';

vi.mock('../../../src/services/S3Service');

const FIXTURES_DIR = join(__dirname, '..', '..', 'resources', 'templates', 'artifact');

describe('ArtifactExporter', () => {
    let mockS3Service: S3Service;
    const templatePath = pathToFileURL(join(FIXTURES_DIR, 'template.yaml')).href;

    const BASIC_TEMPLATE = 'Resources:\n  Bucket:\n    Type: AWS::S3::Bucket';

    const LAMBDA_TEMPLATE = `
Resources:
  MyFunction:
    Type: AWS::Lambda::Function
    Properties:
      Code: ./code
      Runtime: nodejs18.x
      Handler: index.handler
      FunctionName: MyTestFunction
      Timeout: 30
      MemorySize: 256
`;

    const SERVERLESS_TEMPLATE = `
Resources:
  MyFunction:
    Type: AWS::Serverless::Function
    Properties:
      CodeUri: ./code
      Runtime: python3.9
      Handler: app.lambda_handler
      Description: Test serverless function
      Timeout: 60
      MemorySize: 512
`;

    const S3_URL_TEMPLATE = `
Resources:
  MyFunction:
    Type: AWS::Lambda::Function
    Properties:
      Code: s3://existing-bucket/code.zip
      Runtime: nodejs18.x
      Handler: index.handler
      FunctionName: ExistingFunction
      Timeout: 45
`;

    beforeEach(() => {
        vi.clearAllMocks();
        mockS3Service = {
            putObjectContent: vi.fn(),
            putObject: vi.fn().mockResolvedValue({ VersionId: 'v123' }),
        } as any;
    });

    describe('getTemplateArtifacts', () => {
        it('should identify Lambda function artifacts', () => {
            const exporter = new ArtifactExporter(mockS3Service, DocumentType.YAML, templatePath, LAMBDA_TEMPLATE);

            const artifacts = exporter.getTemplateArtifacts();
            expect(artifacts).toEqual([
                {
                    resourceType: 'AWS::Lambda::Function',
                    filePath: './code',
                },
            ]);
        });

        it('should identify Serverless function artifacts', () => {
            const exporter = new ArtifactExporter(mockS3Service, DocumentType.YAML, templatePath, SERVERLESS_TEMPLATE);

            const artifacts = exporter.getTemplateArtifacts();
            expect(artifacts).toEqual([
                {
                    resourceType: 'AWS::Serverless::Function',
                    filePath: './code',
                },
            ]);
        });
    });

    describe('export', () => {
        it('should create template with valid parameters', () => {
            const template = new ArtifactExporter(
                mockS3Service,
                DocumentType.YAML,
                pathToFileURL(join(FIXTURES_DIR, 'path/to/template.yaml')).href,
                BASIC_TEMPLATE,
            );
            expect(template).toBeDefined();
        });

        it('should export template', async () => {
            const template = new ArtifactExporter(
                mockS3Service,
                DocumentType.YAML,
                pathToFileURL(join(FIXTURES_DIR, 'path/to/template.yaml')).href,
                BASIC_TEMPLATE,
            );
            const result = await template.export('test-bucket');
            expect(result).toBeDefined();
        });

        it('should update Lambda function Code to S3 reference', async () => {
            const exporter = new ArtifactExporter(mockS3Service, DocumentType.YAML, templatePath, LAMBDA_TEMPLATE);

            const result = await exporter.export('test-bucket');

            expect(mockS3Service.putObject).toHaveBeenCalledWith(
                expect.stringMatching(/\.zip$/),
                expect.stringMatching(/^s3:\/\/test-bucket\/artifact\/.*\.zip$/),
            );

            const resources = (result as any).Resources;
            expect(resources.MyFunction.Properties.Code).toEqual({
                S3Bucket: 'test-bucket',
                S3Key: expect.stringMatching(/^artifact\/.*\.zip$/),
                S3ObjectVersion: 'v123',
            });
            expect(resources.MyFunction.Properties.Runtime).toBe('nodejs18.x');
            expect(resources.MyFunction.Properties.Handler).toBe('index.handler');
            expect(resources.MyFunction.Properties.FunctionName).toBe('MyTestFunction');
            expect(resources.MyFunction.Properties.Timeout).toBe(30);
            expect(resources.MyFunction.Properties.MemorySize).toBe(256);
        });

        it('should update Serverless function CodeUri to S3 URL', async () => {
            const exporter = new ArtifactExporter(mockS3Service, DocumentType.YAML, templatePath, SERVERLESS_TEMPLATE);

            const result = await exporter.export('my-bucket');

            expect(mockS3Service.putObject).toHaveBeenCalledWith(
                expect.stringMatching(/\.zip$/),
                expect.stringMatching(/^s3:\/\/my-bucket\/artifact\/.*\.zip$/),
            );

            const resources = (result as any).Resources;
            expect(resources.MyFunction.Properties.CodeUri).toMatch(/^s3:\/\/my-bucket\/artifact\/.*\.zip$/);
            expect(resources.MyFunction.Properties.Runtime).toBe('python3.9');
            expect(resources.MyFunction.Properties.Handler).toBe('app.lambda_handler');
            expect(resources.MyFunction.Properties.Description).toBe('Test serverless function');
            expect(resources.MyFunction.Properties.Timeout).toBe(60);
            expect(resources.MyFunction.Properties.MemorySize).toBe(512);
        });

        it('should not modify existing S3 URLs', async () => {
            const exporter = new ArtifactExporter(mockS3Service, DocumentType.YAML, templatePath, S3_URL_TEMPLATE);

            const result = await exporter.export('test-bucket');

            const resources = (result as any).Resources;
            expect(resources.MyFunction.Properties.Code).toBe('s3://existing-bucket/code.zip');
            expect(resources.MyFunction.Properties.Runtime).toBe('nodejs18.x');
            expect(resources.MyFunction.Properties.Handler).toBe('index.handler');
            expect(resources.MyFunction.Properties.FunctionName).toBe('ExistingFunction');
            expect(resources.MyFunction.Properties.Timeout).toBe(45);
            expect(mockS3Service.putObject).not.toHaveBeenCalled();
        });
    });
});
