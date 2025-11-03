import { OnStackFailure } from '@aws-sdk/client-cloudformation';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { DocumentType } from '../../../src/document/Document';
import { parseDeploymentConfig, parseEnvironmentFileParams } from '../../../src/environments/EnvironmentParser';
import {
    ParseEnvironmentFilesParams,
    DocumentInfo,
    ParseEnvironmentFilesResult,
} from '../../../src/environments/EnvironmentRequestType';
import { parseEnvironmentFilesHandler } from '../../../src/handlers/EnvironmentHandler';

// Mock the parsers
vi.mock('../../../src/environments/EnvironmentParser', () => ({
    parseEnvironmentFileParams: vi.fn((input) => input),
    parseDeploymentConfig: vi.fn(),
}));

vi.mock('../../../src/utils/ZodErrorWrapper', () => ({
    parseWithPrettyError: vi.fn((parser, input) => parser(input)),
}));

describe('EnvironmentHandler', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    describe('parseEnvironmentFilesHandler', () => {
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

            const params: ParseEnvironmentFilesParams = {
                documents: mockDocuments,
            };

            vi.mocked(parseDeploymentConfig).mockReturnValue({
                templateFilePath: 'test.yaml',
                parameters: { BucketName: 'test-bucket' },
            });

            const handler = parseEnvironmentFilesHandler();
            const result = handler(params, {} as any) as ParseEnvironmentFilesResult;

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

            const params: ParseEnvironmentFilesParams = {
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

            const handler = parseEnvironmentFilesHandler();
            const result = handler(params, {} as any) as ParseEnvironmentFilesResult;

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

            const params: ParseEnvironmentFilesParams = {
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

            const handler = parseEnvironmentFilesHandler();
            const result = handler(params, {} as any) as ParseEnvironmentFilesResult;

            expect(result.parsedFiles).toHaveLength(2);
            expect(result.parsedFiles[0].fileName).toBe('env1.yaml');
            expect(result.parsedFiles[1].fileName).toBe('env2.json');
        });

        it('should handle parser validation errors', () => {
            const params: ParseEnvironmentFilesParams = {
                documents: [],
            };

            vi.mocked(parseEnvironmentFileParams).mockImplementation(() => {
                throw new Error('Invalid parameters');
            });

            const handler = parseEnvironmentFilesHandler();

            expect(() => handler(params, {} as any)).toThrow();
        });
    });
});
