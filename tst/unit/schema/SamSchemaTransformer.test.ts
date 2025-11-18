import { describe, expect, test } from 'vitest';
import { SamSchemaTransformer } from '../../../src/schema/SamSchemaTransformer';

describe('SamSchemaTransformer', () => {
    test('should transform SAM schema to CloudFormation format', () => {
        const mockSamSchema = {
            properties: {
                Resources: {
                    additionalProperties: {
                        anyOf: [{ $ref: '#/definitions/aws_serverless_functionResource' }],
                    },
                },
            },
            definitions: {
                aws_serverless_functionResource: {
                    properties: {
                        Type: { enum: ['AWS::Serverless::Function'] },
                        Properties: { $ref: '#/definitions/FunctionProperties' },
                    },
                    title: 'SAM Function',
                },
                FunctionProperties: {
                    properties: {
                        Runtime: { type: 'string' },
                        Handler: { type: 'string' },
                    },
                    required: ['Runtime', 'Handler'],
                },
            },
        };

        const result = SamSchemaTransformer.transformSamSchema(mockSamSchema);

        expect(result.size).toBe(1);
        expect(result.has('AWS::Serverless::Function')).toBe(true);

        const functionSchema = result.get('AWS::Serverless::Function')!;
        expect(functionSchema.typeName).toBe('AWS::Serverless::Function');
        expect(functionSchema.description).toContain('Creates a Lambda function');
        expect(functionSchema.documentationUrl).toContain('sam-resource-function.html');
    });

    test('should include all definitions to preserve $refs', () => {
        const mockSamSchema = {
            properties: {
                Resources: {
                    additionalProperties: {
                        anyOf: [{ $ref: '#/definitions/aws_serverless_functionResource' }],
                    },
                },
            },
            definitions: {
                aws_serverless_functionResource: {
                    properties: {
                        Type: { enum: ['AWS::Serverless::Function'] },
                        Properties: { $ref: '#/definitions/FunctionProperties' },
                    },
                },
                FunctionProperties: {
                    properties: {
                        Runtime: { type: 'string' },
                        CodeUri: { $ref: '#/definitions/CodeUriType' },
                    },
                },
                CodeUriType: {
                    type: 'string',
                },
                SomeOtherDefinition: {
                    type: 'object',
                },
            },
        };

        const result = SamSchemaTransformer.transformSamSchema(mockSamSchema);
        const functionSchema = result.get('AWS::Serverless::Function')!;

        // Verify only referenced definitions are included (full reference chain)
        expect(functionSchema.definitions).toBeDefined();

        const expectedDefinitions = {
            aws_serverless_functionResource: {
                properties: {
                    Type: { enum: ['AWS::Serverless::Function'] },
                    Properties: { $ref: '#/definitions/FunctionProperties' },
                },
            },
            FunctionProperties: {
                properties: {
                    Runtime: { type: 'string' },
                    CodeUri: { $ref: '#/definitions/CodeUriType' },
                },
            },
            CodeUriType: {
                type: 'string',
            },
        };

        expect(functionSchema.definitions).toEqual(expectedDefinitions);

        // This ensures $refs like { $ref: '#/definitions/CodeUriType' } will work
        expect(functionSchema.definitions!.CodeUriType).toEqual({ type: 'string' });
        // SomeOtherDefinition should not be included as it's not referenced
        expect(functionSchema.definitions!.SomeOtherDefinition).toBeUndefined();
    });

    test('should handle deep nested references and convert additionalProperties', () => {
        const mockSamSchema = {
            properties: {
                Resources: {
                    additionalProperties: {
                        anyOf: [{ $ref: '#/definitions/aws_serverless_functionResource' }],
                    },
                },
            },
            definitions: {
                aws_serverless_functionResource: {
                    properties: {
                        Type: { enum: ['AWS::Serverless::Function'] },
                        Properties: { $ref: '#/definitions/FunctionProperties' },
                    },
                },
                FunctionProperties: {
                    properties: {
                        Events: {
                            additionalProperties: { $ref: '#/definitions/EventDefinition' },
                            type: 'object',
                        },
                    },
                },
                EventDefinition: {
                    properties: {
                        Properties: { $ref: '#/definitions/EventProperties' },
                    },
                },
                EventProperties: {
                    properties: {
                        Auth: { $ref: '#/definitions/ApiAuth' },
                    },
                },
                ApiAuth: {
                    properties: {
                        ApiKeyRequired: { type: 'boolean' },
                    },
                },
                UnusedDefinition: { type: 'string' },
            },
        };

        const result = SamSchemaTransformer.transformSamSchema(mockSamSchema);
        const functionSchema = result.get('AWS::Serverless::Function')!;

        // Should include all definitions in the nested chain
        expect(functionSchema.definitions!.aws_serverless_functionResource).toBeDefined();
        expect(functionSchema.definitions!.FunctionProperties).toBeDefined();
        expect(functionSchema.definitions!.EventDefinition).toBeDefined();
        expect(functionSchema.definitions!.EventProperties).toBeDefined();
        expect(functionSchema.definitions!.ApiAuth).toBeDefined();

        // Should exclude unused definition
        expect(functionSchema.definitions!.UnusedDefinition).toBeUndefined();

        // Should convert additionalProperties to patternProperties
        const eventsProperty = functionSchema.properties.Events as any;
        expect(eventsProperty.additionalProperties).toBe(false);
        expect(eventsProperty.patternProperties).toBeDefined();
        expect(eventsProperty.patternProperties['.*']).toEqual({ $ref: '#/definitions/EventDefinition' });
    });
});
