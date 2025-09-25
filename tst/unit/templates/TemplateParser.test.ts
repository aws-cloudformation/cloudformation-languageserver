import { Capability } from '@aws-sdk/client-cloudformation';
import { describe, it, expect } from 'vitest';
import { ZodError } from 'zod';
import { parseTemplateActionParams, parseGetParametersParams } from '../../../src/templates/TemplateParser';

describe('TemplateParser', () => {
    describe('parseTemplateActionParams', () => {
        it('should parse valid template action params', () => {
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

            const result = parseTemplateActionParams(input);

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

            const result = parseTemplateActionParams(input);

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

            expect(() => parseTemplateActionParams(input)).toThrow(ZodError);
        });

        it('should throw ZodError for missing id', () => {
            const input = {
                uri: 'file:///test.yaml',
                stackName: 'test-stack',
            };

            expect(() => parseTemplateActionParams(input)).toThrow(ZodError);
        });

        it('should throw ZodError for empty uri', () => {
            const input = {
                id: 'test-id',
                uri: '',
                stackName: 'test-stack',
            };

            expect(() => parseTemplateActionParams(input)).toThrow(ZodError);
        });

        it('should throw ZodError for empty stackName', () => {
            const input = {
                id: 'test-id',
                uri: 'file:///test.yaml',
                stackName: '',
            };

            expect(() => parseTemplateActionParams(input)).toThrow(ZodError);
        });

        it('should throw ZodError for stackName exceeding 128 characters', () => {
            const input = {
                id: 'test-id',
                uri: 'file:///test.yaml',
                stackName: 'a'.repeat(129),
            };

            expect(() => parseTemplateActionParams(input)).toThrow(ZodError);
        });

        it('should throw ZodError for invalid capability', () => {
            const input = {
                id: 'test-id',
                uri: 'file:///test.yaml',
                stackName: 'test-stack',
                capabilities: ['INVALID_CAPABILITY'],
            };

            expect(() => parseTemplateActionParams(input)).toThrow(ZodError);
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

            const result = parseTemplateActionParams(input);

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

            const result = parseTemplateActionParams(input);

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

            const result = parseGetParametersParams(input);

            expect(result).toEqual({
                uri: 'file:///test.yaml',
            });
        });

        it('should throw ZodError for empty uri', () => {
            const input = {
                uri: '',
            };

            expect(() => parseGetParametersParams(input)).toThrow(ZodError);
        });

        it('should throw ZodError for missing uri', () => {
            const input = {};

            expect(() => parseGetParametersParams(input)).toThrow(ZodError);
        });

        it('should throw ZodError for null input', () => {
            expect(() => parseGetParametersParams(null)).toThrow(ZodError);
        });

        it('should throw ZodError for undefined input', () => {
            expect(() => parseGetParametersParams(undefined)).toThrow(ZodError);
        });
    });
});
