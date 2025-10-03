import { Capability } from '@aws-sdk/client-cloudformation';
import { describe, it, expect } from 'vitest';
import { ZodError } from 'zod';
import { parseStackActionParams, parseTemplateMetadataParams } from '../../../src/stackActions/StackActionParser';

describe('StackActionParser', () => {
    describe('parseStackActionParams', () => {
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

            const result = parseStackActionParams(input);

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

            const result = parseStackActionParams(input);

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

            expect(() => parseStackActionParams(input)).toThrow(ZodError);
        });

        it('should throw ZodError for missing id', () => {
            const input = {
                uri: 'file:///test.yaml',
                stackName: 'test-stack',
            };

            expect(() => parseStackActionParams(input)).toThrow(ZodError);
        });

        it('should throw ZodError for empty uri', () => {
            const input = {
                id: 'test-id',
                uri: '',
                stackName: 'test-stack',
            };

            expect(() => parseStackActionParams(input)).toThrow(ZodError);
        });

        it('should throw ZodError for empty stackName', () => {
            const input = {
                id: 'test-id',
                uri: 'file:///test.yaml',
                stackName: '',
            };

            expect(() => parseStackActionParams(input)).toThrow(ZodError);
        });

        it('should throw ZodError for stackName exceeding 128 characters', () => {
            const input = {
                id: 'test-id',
                uri: 'file:///test.yaml',
                stackName: 'a'.repeat(129),
            };

            expect(() => parseStackActionParams(input)).toThrow(ZodError);
        });

        it('should throw ZodError for invalid capability', () => {
            const input = {
                id: 'test-id',
                uri: 'file:///test.yaml',
                stackName: 'test-stack',
                capabilities: ['INVALID_CAPABILITY'],
            };

            expect(() => parseStackActionParams(input)).toThrow(ZodError);
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

            const result = parseStackActionParams(input);

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
            };

            const result = parseStackActionParams(input);

            expect(result.parameters?.[0]).toEqual({
                ParameterKey: 'Environment',
                ParameterValue: 'dev',
                UsePreviousValue: true,
                ResolvedValue: 'development',
            });
        });
    });

    describe('parseGetParametersParams', () => {
        it('should parse valid get parameters params', () => {
            const input = {
                uri: 'file:///test.yaml',
            };

            const result = parseTemplateMetadataParams(input);

            expect(result).toEqual({
                uri: 'file:///test.yaml',
            });
        });

        it('should throw ZodError for empty uri', () => {
            const input = {
                uri: '',
            };

            expect(() => parseTemplateMetadataParams(input)).toThrow(ZodError);
        });

        it('should throw ZodError for missing uri', () => {
            const input = {};

            expect(() => parseTemplateMetadataParams(input)).toThrow(ZodError);
        });

        it('should throw ZodError for null input', () => {
            expect(() => parseTemplateMetadataParams(null)).toThrow(ZodError);
        });

        it('should throw ZodError for undefined input', () => {
            expect(() => parseTemplateMetadataParams(undefined)).toThrow(ZodError);
        });
    });
});
