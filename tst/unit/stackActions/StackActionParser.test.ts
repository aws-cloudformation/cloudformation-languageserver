import { Capability, OnStackFailure } from '@aws-sdk/client-cloudformation';
import { describe, it, expect } from 'vitest';
import { ZodError } from 'zod';
import {
    parseCreateValidationParams,
    parseTemplateUriParams,
    parseDescribeChangeSetParams,
    parseDescribeEventsParams,
} from '../../../src/stacks/actions/StackActionParser';

describe('StackActionParser', () => {
    describe('parseCreateValidationParams', () => {
        it('should parse valid stack action params', () => {
            const input = {
                id: 'test-id',
                uri: 'file:///test.yaml',
                stackName: 'test-stack',
                parameters: [
                    {
                        ParameterKey: 'Environment',
                        ParameterValue: 'dev',
                    },
                ],
                capabilities: [Capability.CAPABILITY_IAM],
            };

            const result = parseCreateValidationParams(input);

            expect(result).toEqual({
                id: 'test-id',
                uri: 'file:///test.yaml',
                stackName: 'test-stack',
                parameters: [
                    {
                        ParameterKey: 'Environment',
                        ParameterValue: 'dev',
                    },
                ],
                capabilities: [Capability.CAPABILITY_IAM],
            });
        });

        it('should parse minimal valid params', () => {
            const input = {
                id: 'test-id',
                uri: 'file:///test.yaml',
                stackName: 'test-stack',
            };

            const result = parseCreateValidationParams(input);

            expect(result).toEqual({
                id: 'test-id',
                uri: 'file:///test.yaml',
                stackName: 'test-stack',
            });
        });

        it('should throw ZodError for empty id', () => {
            const input = {
                id: '',
                uri: 'file:///test.yaml',
                stackName: 'test-stack',
            };

            expect(() => parseCreateValidationParams(input)).toThrow(ZodError);
        });

        it('should throw ZodError for missing id', () => {
            const input = {
                uri: 'file:///test.yaml',
                stackName: 'test-stack',
            };

            expect(() => parseCreateValidationParams(input)).toThrow(ZodError);
        });

        it('should throw ZodError for empty uri', () => {
            const input = {
                id: 'test-id',
                uri: '',
                stackName: 'test-stack',
            };

            expect(() => parseCreateValidationParams(input)).toThrow(ZodError);
        });

        it('should throw ZodError for empty stackName', () => {
            const input = {
                id: 'test-id',
                uri: 'file:///test.yaml',
                stackName: '',
            };

            expect(() => parseCreateValidationParams(input)).toThrow(ZodError);
        });

        it('should throw ZodError for stackName exceeding 128 characters', () => {
            const input = {
                id: 'test-id',
                uri: 'file:///test.yaml',
                stackName: 'a'.repeat(129),
            };

            expect(() => parseCreateValidationParams(input)).toThrow(ZodError);
        });

        it('should throw ZodError for invalid capability', () => {
            const input = {
                id: 'test-id',
                uri: 'file:///test.yaml',
                stackName: 'test-stack',
                capabilities: ['INVALID_CAPABILITY'],
            };

            expect(() => parseCreateValidationParams(input)).toThrow(ZodError);
        });

        it('should parse all valid capabilities', () => {
            const input = {
                id: 'test-id',
                uri: 'file:///test.yaml',
                stackName: 'test-stack',
                capabilities: [
                    Capability.CAPABILITY_IAM,
                    Capability.CAPABILITY_NAMED_IAM,
                    Capability.CAPABILITY_AUTO_EXPAND,
                ],
            };

            const result = parseCreateValidationParams(input);

            expect(result.capabilities).toEqual([
                Capability.CAPABILITY_IAM,
                Capability.CAPABILITY_NAMED_IAM,
                Capability.CAPABILITY_AUTO_EXPAND,
            ]);
        });

        it('should parse parameters with all optional fields', () => {
            const input = {
                id: 'test-id',
                uri: 'file:///test.yaml',
                stackName: 'test-stack',
                parameters: [
                    {
                        ParameterKey: 'Environment',
                        ParameterValue: 'dev',
                        UsePreviousValue: true,
                        ResolvedValue: 'development',
                    },
                ],
                tags: [
                    {
                        Key: 'Key',
                        Value: 'Value',
                    },
                ],
                onStackFailure: OnStackFailure.DO_NOTHING,
                includeNestedStacks: true,
                importExistingResources: false,
            };

            const result = parseCreateValidationParams(input);

            expect(result.parameters?.[0]).toEqual({
                ParameterKey: 'Environment',
                ParameterValue: 'dev',
                UsePreviousValue: true,
                ResolvedValue: 'development',
            });
            expect(result.tags?.[0]).toEqual({
                Key: 'Key',
                Value: 'Value',
            });
            expect(result.onStackFailure).toEqual(OnStackFailure.DO_NOTHING);
            expect(result.includeNestedStacks).toEqual(true);
            expect(result.importExistingResources).toEqual(false);
        });
    });

    describe('parseGetParametersParams', () => {
        it('should parse valid get parameters params', () => {
            const input = 'file:///test.yaml';

            const result = parseTemplateUriParams(input);

            expect(result).toEqual('file:///test.yaml');
        });

        it('should throw ZodError for empty uri', () => {
            const input = '';

            expect(() => parseTemplateUriParams(input)).toThrow(ZodError);
        });

        it('should throw ZodError for null input', () => {
            expect(() => parseTemplateUriParams(null)).toThrow(ZodError);
        });

        it('should throw ZodError for undefined input', () => {
            expect(() => parseTemplateUriParams(undefined)).toThrow(ZodError);
        });
    });

    describe('parseDescribeChangeSetParams', () => {
        it('should parse valid describe changeset params', () => {
            const input = {
                stackName: 'test-stack',
                changeSetName: 'test-changeset',
            };

            const result = parseDescribeChangeSetParams(input);

            expect(result).toEqual({
                stackName: 'test-stack',
                changeSetName: 'test-changeset',
            });
        });

        it('should throw ZodError for missing stackName', () => {
            const input = {
                changeSetName: 'test-changeset',
            };

            expect(() => parseDescribeChangeSetParams(input)).toThrow(ZodError);
        });

        it('should throw ZodError for missing changeSetName', () => {
            const input = {
                stackName: 'test-stack',
            };

            expect(() => parseDescribeChangeSetParams(input)).toThrow(ZodError);
        });

        it('should throw ZodError for stackName exceeding 128 characters', () => {
            const input = {
                stackName: 'a'.repeat(129),
                changeSetName: 'test-changeset',
            };

            expect(() => parseDescribeChangeSetParams(input)).toThrow(ZodError);
        });

        it('should throw ZodError for changeSetName exceeding 128 characters', () => {
            const input = {
                stackName: 'test-stack',
                changeSetName: 'a'.repeat(129),
            };

            expect(() => parseDescribeChangeSetParams(input)).toThrow(ZodError);
        });

        it('should throw ZodError for null input', () => {
            expect(() => parseDescribeChangeSetParams(null)).toThrow(ZodError);
        });

        it('should throw ZodError for undefined input', () => {
            expect(() => parseDescribeChangeSetParams(undefined)).toThrow(ZodError);
        });
    });

    describe('parseDescribeEventsParams', () => {
        it('should parse valid params with stackName', () => {
            const result = parseDescribeEventsParams({ stackName: 'test-stack' });
            expect(result.stackName).toBe('test-stack');
        });

        it('should parse valid params with changeSetName', () => {
            const result = parseDescribeEventsParams({ changeSetName: 'test-changeset' });
            expect(result.changeSetName).toBe('test-changeset');
        });

        it('should parse valid params with operationId', () => {
            const result = parseDescribeEventsParams({ operationId: 'op-123' });
            expect(result.operationId).toBe('op-123');
        });

        it('should parse all optional parameters', () => {
            const result = parseDescribeEventsParams({
                stackName: 'test-stack',
                changeSetName: 'test-changeset',
                operationId: 'op-123',
                failedEventsOnly: true,
                nextToken: 'token123',
            });

            expect(result.stackName).toBe('test-stack');
            expect(result.changeSetName).toBe('test-changeset');
            expect(result.operationId).toBe('op-123');
            expect(result.failedEventsOnly).toBe(true);
            expect(result.nextToken).toBe('token123');
        });

        it('should throw error when no identifier provided', () => {
            expect(() => parseDescribeEventsParams({})).toThrow();
        });

        it('should throw error when only optional params provided', () => {
            expect(() => parseDescribeEventsParams({ failedEventsOnly: true })).toThrow();
        });

        it('should throw error for invalid stackName', () => {
            expect(() => parseDescribeEventsParams({ stackName: '' })).toThrow();
            expect(() => parseDescribeEventsParams({ stackName: 123 as any })).toThrow();
        });

        it('should throw error for invalid types', () => {
            expect(() => parseDescribeEventsParams({ stackName: 'test', failedEventsOnly: 'true' as any })).toThrow();
        });

        it('should accept undefined optional parameters', () => {
            const result = parseDescribeEventsParams({
                stackName: 'test-stack',
                failedEventsOnly: undefined,
                nextToken: undefined,
            });

            expect(result.stackName).toBe('test-stack');
            expect(result.failedEventsOnly).toBeUndefined();
            expect(result.nextToken).toBeUndefined();
        });
    });
});
