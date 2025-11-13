import { existsSync, statSync, mkdtempSync, copyFileSync } from 'fs';
import { tmpdir } from 'os';
import { join, basename, extname } from 'path';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ArtifactExporter } from '../../../src/artifactexporter/ArtifactExporter';
import { DocumentType } from '../../../src/document/Document';
import { S3Service } from '../../../src/services/S3Service';

vi.mock('../../../src/services/S3Service');
vi.mock('fs');
vi.mock('os');
vi.mock('path');
vi.mock('archiver');

describe('ArtifactExporter', () => {
    let mockS3Service: S3Service;

    const BASIC_TEMPLATE = 'Resources:\n  Bucket:\n    Type: AWS::S3::Bucket';

    const LAMBDA_TEMPLATE = `
Resources:
  MyFunction:
    Type: AWS::Lambda::Function
    Properties:
      Code: ./src/lambda
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

        vi.mocked(existsSync).mockReturnValue(true);
        vi.mocked(statSync).mockReturnValue({
            isFile: () => true,
            isDirectory: () => false,
        } as any);
        vi.mocked(tmpdir).mockReturnValue('/tmp');
        vi.mocked(join).mockImplementation((...args) => args.join('/'));
        vi.mocked(basename).mockImplementation((path) => path?.split('/').pop() ?? '');
        vi.mocked(extname).mockImplementation((path) => {
            if (!path) return '';
            const parts = path.split('.');
            return parts.length > 1 ? '.' + parts[parts.length - 1] : '';
        });
        vi.mocked(mkdtempSync).mockReturnValue('/tmp/cfn-123');
        vi.mocked(copyFileSync).mockImplementation(() => {});
    });

    describe('getTemplateArtifacts', () => {
        it('should identify Lambda function artifacts', () => {
            const exporter = new ArtifactExporter(
                mockS3Service,
                DocumentType.YAML,
                'file:///template.yaml',
                LAMBDA_TEMPLATE,
            );

            const artifacts = exporter.getTemplateArtifacts();
            expect(artifacts).toEqual([
                {
                    resourceType: 'AWS::Lambda::Function',
                    filePath: './src/lambda',
                },
            ]);
        });

        it('should identify Serverless function artifacts', () => {
            const exporter = new ArtifactExporter(
                mockS3Service,
                DocumentType.YAML,
                'file:///template.yaml',
                SERVERLESS_TEMPLATE,
            );

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
                'file:///path/to/template.yaml',
                BASIC_TEMPLATE,
            );
            expect(template).toBeDefined();
        });

        it('should export template', async () => {
            const template = new ArtifactExporter(
                mockS3Service,
                DocumentType.YAML,
                'file:///path/to/template.yaml',
                BASIC_TEMPLATE,
            );
            const result = await template.export('test-bucket');
            expect(result).toBeDefined();
        });

        it('should update Lambda function Code to S3 reference', async () => {
            const exporter = new ArtifactExporter(
                mockS3Service,
                DocumentType.YAML,
                'file:///template.yaml',
                LAMBDA_TEMPLATE,
            );

            const result = await exporter.export('test-bucket');

            const resources = (result as any).Resources;
            expect(resources.MyFunction.Properties.Code).toEqual({
                S3Bucket: 'test-bucket',
                S3Key: expect.stringMatching(/^artifact\/cfn-123-\d+$/),
                S3ObjectVersion: 'v123',
            });
            expect(resources.MyFunction.Properties.Runtime).toBe('nodejs18.x');
            expect(resources.MyFunction.Properties.Handler).toBe('index.handler');
            expect(resources.MyFunction.Properties.FunctionName).toBe('MyTestFunction');
            expect(resources.MyFunction.Properties.Timeout).toBe(30);
            expect(resources.MyFunction.Properties.MemorySize).toBe(256);
        });

        it('should update Serverless function CodeUri to S3 URL', async () => {
            const exporter = new ArtifactExporter(
                mockS3Service,
                DocumentType.YAML,
                'file:///template.yaml',
                SERVERLESS_TEMPLATE,
            );

            const result = await exporter.export('my-bucket');

            const resources = (result as any).Resources;
            expect(resources.MyFunction.Properties.CodeUri).toMatch(/^s3:\/\/my-bucket\/artifact\/cfn-123-\d+$/);
            expect(resources.MyFunction.Properties.Runtime).toBe('python3.9');
            expect(resources.MyFunction.Properties.Handler).toBe('app.lambda_handler');
            expect(resources.MyFunction.Properties.Description).toBe('Test serverless function');
            expect(resources.MyFunction.Properties.Timeout).toBe(60);
            expect(resources.MyFunction.Properties.MemorySize).toBe(512);
        });

        it('should not modify existing S3 URLs', async () => {
            const exporter = new ArtifactExporter(
                mockS3Service,
                DocumentType.YAML,
                'file:///template.yaml',
                S3_URL_TEMPLATE,
            );

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
