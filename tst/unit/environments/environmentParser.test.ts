import { OnStackFailure } from '@aws-sdk/client-cloudformation';
import { describe, it, expect } from 'vitest';
import { ZodError } from 'zod';
import { DocumentType } from '../../../src/document/Document';
import { parseEnvironmentFileParams, parseDeploymentConfig } from '../../../src/environments/environmentParser';

describe('environmentParser', () => {
    describe('parseEnvironmentFileParams', () => {
        it('should parse valid environment file params', () => {
            const input = {
                documents: [
                    {
                        type: DocumentType.YAML,
                        content: 'test content',
                        fileName: 'test.yaml',
                    },
                ],
            };

            const result = parseEnvironmentFileParams(input);

            expect(result).toEqual({
                documents: [
                    {
                        type: DocumentType.YAML,
                        content: 'test content',
                        fileName: 'test.yaml',
                    },
                ],
            });
        });

        it('should throw ZodError for missing documents', () => {
            const input = {};

            expect(() => parseEnvironmentFileParams(input)).toThrow(ZodError);
        });

        it('should handle empty documents array', () => {
            const input = {
                documents: [],
            };

            const result = parseEnvironmentFileParams(input);
            expect(result.documents).toEqual([]);
        });

        it('should throw ZodError for invalid document type', () => {
            const input = {
                documents: [
                    {
                        type: 'INVALID',
                        content: 'test content',
                        fileName: 'test.yaml',
                    },
                ],
            };

            expect(() => parseEnvironmentFileParams(input)).toThrow(ZodError);
        });

        it('should throw ZodError for missing document properties', () => {
            const input = {
                documents: [
                    {
                        type: DocumentType.YAML,
                        content: 'test content',
                        // missing fileName
                    },
                ],
            };

            expect(() => parseEnvironmentFileParams(input)).toThrow(ZodError);
        });
    });

    describe('parseDeploymentConfig', () => {
        it('should parse valid deployment config with all properties', () => {
            const input = {
                'template-file-path': 'test.yaml',
                parameters: { BucketName: 'test-bucket' },
                tags: { Environment: 'test' },
                'on-stack-failure': OnStackFailure.DO_NOTHING,
                'include-nested-stacks': true,
                'import-existing-resources': false,
            };

            const result = parseDeploymentConfig(input);

            expect(result).toEqual({
                templateFilePath: 'test.yaml',
                parameters: { BucketName: 'test-bucket' },
                tags: { Environment: 'test' },
                onStackFailure: OnStackFailure.DO_NOTHING,
                includeNestedStacks: true,
                importExistingResources: false,
            });
        });

        it('should parse deployment config with only template-file-path', () => {
            const input = {
                'template-file-path': 'test.yaml',
            };

            const result = parseDeploymentConfig(input);

            expect(result).toEqual({
                templateFilePath: 'test.yaml',
                parameters: undefined,
                tags: undefined,
                onStackFailure: undefined,
                includeNestedStacks: undefined,
                importExistingResources: undefined,
            });
        });

        it('should parse deployment config with only parameters', () => {
            const input = {
                parameters: { BucketName: 'test-bucket' },
            };

            const result = parseDeploymentConfig(input);

            expect(result).toEqual({
                templateFilePath: undefined,
                parameters: { BucketName: 'test-bucket' },
                tags: undefined,
                onStackFailure: undefined,
                includeNestedStacks: undefined,
                importExistingResources: undefined,
            });
        });

        it('should throw ZodError for empty object', () => {
            const input = {};

            expect(() => parseDeploymentConfig(input)).toThrow(ZodError);
            expect(() => parseDeploymentConfig(input)).toThrow('At least one property must be provided');
        });

        it('should throw ZodError for invalid on-stack-failure value', () => {
            const input = {
                'template-file-path': 'test.yaml',
                'on-stack-failure': 'INVALID_VALUE',
            };

            expect(() => parseDeploymentConfig(input)).toThrow(ZodError);
        });

        it('should throw ZodError for invalid boolean values', () => {
            const input = {
                'template-file-path': 'test.yaml',
                'include-nested-stacks': 'not-a-boolean',
            };

            expect(() => parseDeploymentConfig(input)).toThrow(ZodError);
        });

        it('should throw ZodError for invalid parameters type', () => {
            const input = {
                'template-file-path': 'test.yaml',
                parameters: 'not-an-object',
            };

            expect(() => parseDeploymentConfig(input)).toThrow(ZodError);
        });

        it('should throw ZodError for null input', () => {
            expect(() => parseDeploymentConfig(null)).toThrow(ZodError);
        });

        it('should throw ZodError for undefined input', () => {
            expect(() => parseDeploymentConfig(undefined)).toThrow(ZodError);
        });
    });
});
