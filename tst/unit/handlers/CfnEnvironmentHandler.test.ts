import { OnStackFailure } from '@aws-sdk/client-cloudformation';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
    parseDeploymentConfig,
    parseCfnEnvironmentFileParams,
} from '../../../src/cfnEnvironments/CfnEnvironmentParser';
import {
    ParseCfnEnvironmentFilesParams,
    DocumentInfo,
    ParseCfnEnvironmentFilesResult,
} from '../../../src/cfnEnvironments/CfnEnvironmentRequestType';
import { DocumentType } from '../../../src/document/Document';
import { parseCfnEnvironmentFilesHandler } from '../../../src/handlers/CfnEnvironmentHandler';

// Mock the parsers
vi.mock('../../../src/cfnEnvironments/CfnEnvironmentParser', () => ({
    parseCfnEnvironmentFileParams: vi.fn((input) => input),
    parseDeploymentConfig: vi.fn(),
}));

vi.mock('../../../src/utils/ZodErrorWrapper', () => ({
    parseWithPrettyError: vi.fn((parser, input) => parser(input)),
}));

describe('CfnEnvironmentHandler', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    describe('parseCfnEnvironmentFilesHandler', () => {
        it('should successfully parse environment files', () => {
            const mockDocuments: DocumentInfo[] = [
                {
                    type: DocumentType.YAML,
                    content: `template-file-path: test.yaml
parameters:
  BucketName: test-bucket`,
                    fileName: 'env.yaml',
                },
            ];

            const params: ParseCfnEnvironmentFilesParams = {
                documents: mockDocuments,
            };

            vi.mocked(parseDeploymentConfig).mockReturnValue({
                templateFilePath: 'test.yaml',
                parameters: { BucketName: 'test-bucket' },
            });

            const handler = parseCfnEnvironmentFilesHandler();
            const result = handler(params, {} as any) as ParseCfnEnvironmentFilesResult;

            expect(result).toBeDefined();
            expect(result.parsedFiles).toHaveLength(1);
            expect(result.parsedFiles[0].fileName).toBe('env.yaml');
            expect(result.parsedFiles[0].deploymentConfig.templateFilePath).toBe('test.yaml');
        });

        it('should handle malformed deployment files', () => {
            const mockDocuments: DocumentInfo[] = [
                {
                    type: DocumentType.YAML,
                    content: 'invalid content',
                    fileName: 'invalid.yaml',
                },
                {
                    type: DocumentType.YAML,
                    content: `template-file-path: valid.yaml
parameters:
  BucketName: test-bucket`,
                    fileName: 'valid.yaml',
                },
            ];

            const params: ParseCfnEnvironmentFilesParams = {
                documents: mockDocuments,
            };

            vi.mocked(parseDeploymentConfig)
                .mockImplementationOnce(() => {
                    throw new Error('Invalid deployment file');
                })
                .mockReturnValueOnce({
                    templateFilePath: 'valid.yaml',
                    parameters: { BucketName: 'test-bucket' },
                });

            const handler = parseCfnEnvironmentFilesHandler();
            const result = handler(params, {} as any) as ParseCfnEnvironmentFilesResult;

            expect(result.parsedFiles).toHaveLength(1);
            expect(result.parsedFiles[0].fileName).toBe('valid.yaml');
        });

        it('should handle multiple documents', () => {
            const mockDocuments: DocumentInfo[] = [
                {
                    type: DocumentType.YAML,
                    content: `template-file-path: test1.yaml
parameters:
  BucketName: test-bucket-1`,
                    fileName: 'env1.yaml',
                },
                {
                    type: DocumentType.JSON,
                    content: JSON.stringify({
                        'template-file-path': 'test2.yaml',
                        'on-stack-failure': OnStackFailure.DO_NOTHING,
                    }),
                    fileName: 'env2.json',
                },
            ];

            const params: ParseCfnEnvironmentFilesParams = {
                documents: mockDocuments,
            };

            vi.mocked(parseDeploymentConfig)
                .mockReturnValueOnce({
                    templateFilePath: 'test1.yaml',
                    parameters: { BucketName: 'test-bucket-1' },
                })
                .mockReturnValueOnce({
                    templateFilePath: 'test2.yaml',
                    onStackFailure: OnStackFailure.DO_NOTHING,
                });

            const handler = parseCfnEnvironmentFilesHandler();
            const result = handler(params, {} as any) as ParseCfnEnvironmentFilesResult;

            expect(result.parsedFiles).toHaveLength(2);
            expect(result.parsedFiles[0].fileName).toBe('env1.yaml');
            expect(result.parsedFiles[1].fileName).toBe('env2.json');
        });

        it('should handle parser validation errors', () => {
            const params: ParseCfnEnvironmentFilesParams = {
                documents: [],
            };

            vi.mocked(parseCfnEnvironmentFileParams).mockImplementation(() => {
                throw new Error('Invalid parameters');
            });

            const handler = parseCfnEnvironmentFilesHandler();

            expect(() => handler(params, {} as any)).toThrow();
        });
    });
});
