import { describe, expect, test } from 'vitest';
import { CompletionParams } from 'vscode-languageserver';
import { EntityFieldCompletionProvider } from '../../../src/autocomplete/EntityFieldCompletionProvider';
import { Output, Parameter } from '../../../src/context/semantic/Entity';
import { createForEachResourceContext, createOutputContext, createParameterContext } from '../../utils/MockContext';

describe('EntityFieldCompletionProvider', () => {
    const parameterFieldCompletionProvider = new EntityFieldCompletionProvider<Parameter>();
    const outputFieldCompletionProvider = new EntityFieldCompletionProvider<Output>();
    const mockParams: CompletionParams = {
        textDocument: { uri: 'file:///test.yaml' },
        position: { line: 0, character: 0 },
    };

    describe('Parameter', () => {
        test('should suggest Default, Description, ConstraintDescription with e as partial string', () => {
            const mockContext = createParameterContext('MyParameter', {
                text: 'e',
                data: { Type: 'String' },
                propertyPath: ['Parameters', 'MyParameter', 'e'],
            });
            const result = parameterFieldCompletionProvider.getCompletions(mockContext, mockParams);
            expect(result).toBeDefined();
            expect(result?.length).equal(9);
            expect(result?.at(0)?.label).equal('Default');
            expect(result?.at(-1)?.label).equal('MinValue');
        });

        test('should be robust against typos and suggest Type when partial string is yp', () => {
            const mockContext = createParameterContext('MyParameter', {
                text: 'yp',
                data: { Type: undefined },
                propertyPath: ['Parameters', 'MyParameter', 'yp'],
            });
            const result = parameterFieldCompletionProvider.getCompletions(mockContext, mockParams);
            expect(result).toBeDefined();
            expect(result?.length).equal(1);
            expect(result?.at(0)?.label).equal('Type');
        });

        test('should not suggest fields already defined', () => {
            const mockContext = createParameterContext('MyParameter', {
                text: 'e',
                data: {
                    Type: 'string',
                    Description: 'some description',
                },
                propertyPath: ['Parameters', 'MyParameter', 'e'],
            });
            const result = parameterFieldCompletionProvider.getCompletions(mockContext, mockParams);
            expect(result).toBeDefined();
            expect(result?.length).equal(8);
            const resultLabels = result?.map((f) => f.label);
            expect(resultLabels).not.toContain('Type');
            expect(resultLabels).not.toContain('Description');
        });

        test('should suggest all available fields starting with Type (required) when nothing typed yet', () => {
            const mockContext = createParameterContext('MyParameter', {
                text: '',
                data: { Type: undefined },
                propertyPath: ['Parameters', 'MyParameter', ''],
            });
            const result = parameterFieldCompletionProvider.getCompletions(mockContext, mockParams);
            expect(result).toBeDefined();
            // All Parameter fields should be suggested when none are defined
            const expectedFields = [
                'Type',
                'Default',
                'AllowedPattern',
                'AllowedValues',
                'ConstraintDescription',
                'Description',
                'MaxLength',
                'MaxValue',
                'MinLength',
                'MinValue',
                'NoEcho',
            ];
            expect(result?.length).equal(expectedFields.length);

            expect(result?.at(0)?.label).equal('Type');

            const resultLabels = result?.map((item) => item.label).sort();
            expect(resultLabels).toEqual(expectedFields.sort());
        });

        test('should suggest only remaining fields when some are already defined', () => {
            const mockContext = createParameterContext('MyParameter', {
                text: '',
                data: {
                    Type: 'String',
                    Description: 'some description',
                    Default: 'default value',
                },
                propertyPath: ['Parameters', 'MyParameter', ''],
            });
            const result = parameterFieldCompletionProvider.getCompletions(mockContext, mockParams);
            expect(result).toBeDefined();

            const expectedFields = [
                'AllowedPattern',
                'AllowedValues',
                'ConstraintDescription',
                'MaxLength',
                'MaxValue',
                'MinLength',
                'MinValue',
                'NoEcho',
            ];
            expect(result?.length).equal(expectedFields.length);

            const resultLabels = result?.map((item) => item.label).sort();
            expect(resultLabels).toEqual(expectedFields.sort());
        });
    });

    describe('Output', () => {
        test('should suggest export and description with e as partial string', () => {
            const mockContext = createOutputContext('MyOutput', {
                text: 'e',
                propertyPath: ['Outputs', 'MyOutput', 'e'],
            });
            const result = outputFieldCompletionProvider.getCompletions(mockContext, mockParams);
            expect(result).toBeDefined();
            expect(result?.length).equal(2);
            expect(result?.at(0)?.label).equal('Export');
            expect(result?.at(1)?.label).equal('Description');
        });

        test('should be robust against typos and suggest Export when partial string is xpo', () => {
            const mockContext = createOutputContext('MyOutput', {
                text: 'xpo',
                propertyPath: ['Outputs', 'MyOutput', 'xpo'],
            });
            const result = outputFieldCompletionProvider.getCompletions(mockContext, mockParams);
            expect(result).toBeDefined();
            expect(result?.length).equal(1);
            expect(result?.at(0)?.label).equal('Export');
        });

        test('should not suggest fields already defined', () => {
            const mockContext = createOutputContext('MyOutput', {
                text: 'e',
                data: {
                    Description: 'some description',
                },
                propertyPath: ['Outputs', 'MyOutput', 'e'],
            });
            const result = outputFieldCompletionProvider.getCompletions(mockContext, mockParams);
            expect(result).toBeDefined();
            expect(result?.length).equal(1);
            expect(result?.at(0)?.label).equal('Export');
        });
    });

    describe('Fn::ForEach Resource', () => {
        const resourceFieldCompletionProvider = new EntityFieldCompletionProvider();

        test('should suggest resource fields for ForEach resource', () => {
            const mockContext = createForEachResourceContext('Fn::ForEach::Buckets', 'S3Bucket${BucketName}', {
                text: '',
                propertyPath: ['Resources', 'Fn::ForEach::Buckets', 2, 'S3Bucket${BucketName}', ''],
                data: {
                    Type: 'AWS::S3::Bucket',
                },
            });

            const result = resourceFieldCompletionProvider.getCompletions(mockContext, mockParams);
            expect(result).toBeDefined();
            expect(result.length).toBeGreaterThan(0);

            const resultLabels = result?.map((item) => item.label);
            expect(resultLabels).toContain('Properties');
            expect(resultLabels).toContain('DependsOn');
            expect(resultLabels).toContain('Metadata');
        });

        test('should filter resource fields with partial text for ForEach resource', () => {
            const mockContext = createForEachResourceContext('Fn::ForEach::Instances', 'Instance${Name}', {
                text: 'Prop',
                propertyPath: ['Resources', 'Fn::ForEach::Instances', 2, 'Instance${Name}', 'Prop'],
                data: {
                    Type: 'AWS::EC2::Instance',
                },
            });

            const result = resourceFieldCompletionProvider.getCompletions(mockContext, mockParams);
            expect(result).toBeDefined();
            expect(result.length).toBeGreaterThan(0);

            const propertiesItem = result?.find((item) => item.label === 'Properties');
            expect(propertiesItem).toBeDefined();
        });

        test('should not suggest already defined fields for ForEach resource', () => {
            const mockContext = createForEachResourceContext('Fn::ForEach::Buckets', 'S3Bucket${BucketName}', {
                text: '',
                propertyPath: ['Resources', 'Fn::ForEach::Buckets', 2, 'S3Bucket${BucketName}', ''],
                data: {
                    Type: 'AWS::S3::Bucket',
                    Properties: {},
                    DependsOn: 'SomeResource',
                },
            });

            const result = resourceFieldCompletionProvider.getCompletions(mockContext, mockParams);
            expect(result).toBeDefined();

            const resultLabels = result?.map((item) => item.label);
            expect(resultLabels).not.toContain('Type');
            expect(resultLabels).not.toContain('Properties');
            expect(resultLabels).not.toContain('DependsOn');
        });

        test('should suggest all fields when ForEach resource has no fields defined', () => {
            const mockContext = createForEachResourceContext('Fn::ForEach::Buckets', 'S3Bucket${BucketName}', {
                text: '',
                propertyPath: ['Resources', 'Fn::ForEach::Buckets', 2, 'S3Bucket${BucketName}', ''],
                data: {},
            });

            const result = resourceFieldCompletionProvider.getCompletions(mockContext, mockParams);
            expect(result).toBeDefined();
            expect(result.length).toBeGreaterThan(0);

            const resultLabels = result?.map((item) => item.label);
            expect(resultLabels).toContain('Type');
            expect(resultLabels).toContain('Properties');
        });

        test('should return empty when ForEach resource has no resource property', () => {
            const mockContext = createForEachResourceContext('Fn::ForEach::Buckets', 'S3Bucket${BucketName}', {
                text: '',
                propertyPath: ['Resources', 'Fn::ForEach::Buckets', 2, 'S3Bucket${BucketName}', ''],
                data: undefined,
            });

            const result = resourceFieldCompletionProvider.getCompletions(mockContext, mockParams);
            expect(result).toBeDefined();
            expect(result.length).toBe(0);
        });
    });
});
