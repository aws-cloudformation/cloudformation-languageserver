import { describe, expect, test, beforeEach, vi } from 'vitest';
import { InlineCompletionParams, InlineCompletionTriggerKind } from 'vscode-languageserver-protocol';
import { RelatedResourcesInlineCompletionProvider } from '../../../src/autocomplete/RelatedResourcesInlineCompletionProvider';
import { createTopLevelContext } from '../../utils/MockContext';
import {
    createMockDocumentManager,
    createMockRelationshipSchemaService,
    createMockSchemaRetriever,
} from '../../utils/MockServerComponents';

describe('RelatedResourcesInlineCompletionProvider', () => {
    const mockDocumentManager = createMockDocumentManager();
    const mockRelationshipSchemaService = createMockRelationshipSchemaService();
    const mockSchemaRetriever = createMockSchemaRetriever();
    let provider: RelatedResourcesInlineCompletionProvider;

    const mockParams: InlineCompletionParams = {
        textDocument: { uri: 'file:///test.yaml' },
        position: { line: 5, character: 0 },
        context: {
            triggerKind: InlineCompletionTriggerKind.Invoked,
        },
    };

    const mockContext = createTopLevelContext('Resources', {
        text: '',
        propertyPath: ['Resources'],
    });

    beforeEach(() => {
        mockDocumentManager.get.reset();
        provider = new RelatedResourcesInlineCompletionProvider(
            mockRelationshipSchemaService,
            mockDocumentManager,
            mockSchemaRetriever,
        );
        vi.restoreAllMocks();
    });

    describe('getInlineCompletion', () => {
        test('should return undefined when document is not found', () => {
            mockDocumentManager.get.returns(undefined);

            const result = provider.getInlineCompletion(mockContext, mockParams);

            expect(result).toBeUndefined();
            expect(mockDocumentManager.get.calledOnce).toBe(true);
            expect(mockDocumentManager.get.calledWith(mockParams.textDocument.uri)).toBe(true);
        });

        test('should return undefined when no existing resources are found', () => {
            const mockDocument = {
                getText: () => 'AWSTemplateFormatVersion: "2010-09-09"\nResources:\n',
            };
            mockDocumentManager.get.returns(mockDocument as any);

            // Mock the service to return empty array for no resources
            vi.spyOn(mockRelationshipSchemaService, 'extractResourceTypesFromTemplate').mockReturnValue([]);

            const result = provider.getInlineCompletion(mockContext, mockParams);

            expect(result).toBeUndefined();
        });

        test('should return undefined when no related resources are found', () => {
            const mockDocument = {
                getText: () => `
AWSTemplateFormatVersion: "2010-09-09"
Resources:
  MyBucket:
    Type: AWS::S3::Bucket
`,
            };
            mockDocumentManager.get.returns(mockDocument as any);

            // Mock the service to return existing resources but no related ones
            vi.spyOn(mockRelationshipSchemaService, 'extractResourceTypesFromTemplate').mockReturnValue([
                'AWS::S3::Bucket',
            ]);
            vi.spyOn(mockRelationshipSchemaService, 'getAllRelatedResourceTypes').mockReturnValue(new Set());

            const result = provider.getInlineCompletion(mockContext, mockParams);

            expect(result).toBeUndefined();
        });

        test('should return completion items when related resources exist', () => {
            const mockDocument = {
                getText: () => `
AWSTemplateFormatVersion: "2010-09-09"
Resources:
  MyBucket:
    Type: AWS::S3::Bucket
`,
                getLines: () => [
                    '',
                    'AWSTemplateFormatVersion: "2010-09-09"',
                    'Resources:',
                    '  MyBucket:',
                    '    Type: AWS::S3::Bucket',
                    '',
                ],
            };
            mockDocumentManager.get.returns(mockDocument as any);

            // Mock the service to return existing resources and related ones
            vi.spyOn(mockRelationshipSchemaService, 'extractResourceTypesFromTemplate').mockReturnValue([
                'AWS::S3::Bucket',
            ]);
            vi.spyOn(mockRelationshipSchemaService, 'getAllRelatedResourceTypes').mockReturnValue(
                new Set(['AWS::Lambda::Function', 'AWS::IAM::Role', 'AWS::CloudFront::Distribution']),
            );

            const result = provider.getInlineCompletion(mockContext, mockParams) as any[];

            expect(result).toBeDefined();
            expect(Array.isArray(result)).toBe(true);
            expect(result.length).toBeGreaterThan(0);
            expect(result.length).toBeLessThanOrEqual(5); // Should limit to top 5

            // Verify actual completion item data
            const expectedResourceTypes = ['AWS::Lambda::Function', 'AWS::IAM::Role', 'AWS::CloudFront::Distribution'];
            const actualFilterTexts = result.map((item) => item.filterText);

            // Verify that suggested resources are from the expected set
            for (const item of result) {
                expect(item.insertText).toBeDefined();
                expect(item.insertText).toContain('RelatedToS3BucketLogicalId:');
                expect(item.insertText).toContain('Type:');
                expect(item.range).toBeDefined();
                expect(item.range.start).toEqual(mockParams.position);
                expect(item.range.end).toEqual(mockParams.position);
                expect(item.filterText).toBeDefined();

                // Verify the resource type is one of the expected ones
                const resourceType = item.filterText;
                expect(expectedResourceTypes).toContain(resourceType);
            }

            // Verify no existing resources are suggested
            expect(actualFilterTexts).not.toContain('AWS::S3::Bucket');
        });

        test('should handle errors gracefully', () => {
            mockDocumentManager.get.throws(new Error('Document access error'));

            const result = provider.getInlineCompletion(mockContext, mockParams);

            expect(result).toBeUndefined();
        });
    });

    describe('getRelatedResourceTypes', () => {
        test('should filter out existing resource types from suggestions', () => {
            const existingTypes = ['AWS::S3::Bucket', 'AWS::Lambda::Function'];

            // Mock to return related types that include some existing ones
            vi.spyOn(mockRelationshipSchemaService, 'getAllRelatedResourceTypes')
                .mockReturnValueOnce(new Set(['AWS::IAM::Role', 'AWS::Lambda::Function'])) // For S3
                .mockReturnValueOnce(new Set(['AWS::IAM::Role', 'AWS::S3::Bucket'])); // For Lambda

            const result = (provider as any).getRelatedResourceTypes(existingTypes);

            expect(result).toBeDefined();
            expect(Array.isArray(result)).toBe(true);
            // Should only include AWS::IAM::Role (not the existing S3 and Lambda)
            expect(result).toEqual([{ type: 'AWS::IAM::Role', relatedTo: 'AWS::S3::Bucket' }]);
        });

        test('should rank suggestions by frequency', () => {
            const existingTypes = ['AWS::S3::Bucket', 'AWS::Lambda::Function', 'AWS::EC2::Instance'];

            // Mock to return overlapping related types
            vi.spyOn(mockRelationshipSchemaService, 'getAllRelatedResourceTypes')
                .mockReturnValueOnce(new Set(['AWS::IAM::Role', 'AWS::CloudFront::Distribution'])) // For S3
                .mockReturnValueOnce(new Set(['AWS::IAM::Role', 'AWS::API::Gateway'])) // For Lambda
                .mockReturnValueOnce(new Set(['AWS::IAM::Role', 'AWS::EC2::SecurityGroup'])); // For EC2

            const result = (provider as any).getRelatedResourceTypes(existingTypes);

            expect(result).toBeDefined();
            expect(Array.isArray(result)).toBe(true);
            // AWS::IAM::Role should be first (appears in all 3), others alphabetically
            expect(result[0].type).toBe('AWS::IAM::Role');
        });
    });

    describe('generateInlineCompletionItems', () => {
        test('should limit suggestions to top 5', () => {
            const manyResourceTypes = [
                { type: 'AWS::IAM::Role', relatedTo: 'AWS::S3::Bucket' },
                { type: 'AWS::CloudFront::Distribution', relatedTo: 'AWS::S3::Bucket' },
                { type: 'AWS::API::Gateway', relatedTo: 'AWS::Lambda::Function' },
                { type: 'AWS::EC2::SecurityGroup', relatedTo: 'AWS::EC2::Instance' },
                { type: 'AWS::RDS::DBInstance', relatedTo: 'AWS::EC2::Instance' },
                { type: 'AWS::DynamoDB::Table', relatedTo: 'AWS::Lambda::Function' },
                { type: 'AWS::SNS::Topic', relatedTo: 'AWS::Lambda::Function' },
                { type: 'AWS::SQS::Queue', relatedTo: 'AWS::Lambda::Function' },
            ];

            const result = (provider as any).generateInlineCompletionItems(manyResourceTypes, mockParams, mockContext);

            expect(result).toBeDefined();
            expect(Array.isArray(result)).toBe(true);
            expect(result.length).toBe(5); // Should limit to 5
        });

        test('should create proper completion items structure', () => {
            const resourceTypes = [
                { type: 'AWS::IAM::Role', relatedTo: 'AWS::S3::Bucket' },
                { type: 'AWS::CloudFront::Distribution', relatedTo: 'AWS::S3::Bucket' },
            ];

            const result = (provider as any).generateInlineCompletionItems(resourceTypes, mockParams, mockContext);

            expect(result).toBeDefined();
            expect(result.length).toBe(2);

            for (const item of result) {
                expect(item.insertText).toBeDefined();
                expect(item.insertText).toContain('RelatedToS3BucketLogicalId:');
                expect(item.range).toBeDefined();
                expect(item.range.start).toEqual(mockParams.position);
                expect(item.range.end).toEqual(mockParams.position);
                expect(item.filterText).toBeDefined();
            }
        });

        test('should handle empty resource types array', () => {
            const result = (provider as any).generateInlineCompletionItems([], mockParams, mockContext);

            expect(result).toBeDefined();
            expect(Array.isArray(result)).toBe(true);
            expect(result.length).toBe(0);
        });
    });

    describe('generatePropertySnippet', () => {
        test('should generate basic property snippet', () => {
            const resourceType = 'AWS::S3::Bucket';
            const relatedToType = 'AWS::Lambda::Function';

            const result = (provider as any).generatePropertySnippet(
                resourceType,
                relatedToType,
                mockParams,
                undefined,
            );

            expect(result).toBeDefined();
            expect(result).toContain('RelatedToLambdaFunctionLogicalId:');
            expect(result).toContain('Type: AWS::S3::Bucket');
        });

        test('should handle different resource types', () => {
            const testCases = [
                { resourceType: 'AWS::Lambda::Function', relatedTo: 'AWS::S3::Bucket' },
                { resourceType: 'AWS::IAM::Role', relatedTo: 'AWS::Lambda::Function' },
                { resourceType: 'AWS::EC2::Instance', relatedTo: 'AWS::IAM::Role' },
                { resourceType: 'AWS::RDS::DBInstance', relatedTo: 'AWS::EC2::Instance' },
            ];

            for (const { resourceType, relatedTo } of testCases) {
                const result = (provider as any).generatePropertySnippet(
                    resourceType,
                    relatedTo,
                    mockParams,
                    undefined,
                );
                const expectedLogicalId = `RelatedTo${relatedTo
                    .split('::')
                    .slice(1)
                    .join('')
                    .replaceAll(/[^a-zA-Z0-9]/g, '')}LogicalId`;
                expect(result).toContain(`${expectedLogicalId}:`);
                expect(result).toContain(`Type: ${resourceType}`);
            }
        });

        test('should include required properties when schema has required fields', () => {
            const resourceType = 'AWS::S3::Bucket';
            const relatedToType = 'AWS::Lambda::Function';

            // Mock schema with required properties
            const mockSchema = {
                required: ['BucketName', 'AccessControl'],
            };

            mockSchemaRetriever.getDefault.returns({
                schemas: new Map([[resourceType, mockSchema]]),
            } as any);

            const result = (provider as any).generatePropertySnippet(
                resourceType,
                relatedToType,
                mockParams,
                undefined,
            );

            expect(result).toContain('RelatedToLambdaFunctionLogicalId:');
            expect(result).toContain(`Type: ${resourceType}`);
            expect(result).toContain('Properties:');
            expect(result).toContain('BucketName: ');
            expect(result).toContain('AccessControl: ');
            expect(result).not.toContain('${1}');
            expect(result).not.toContain('${2}');
        });

        test('should generate properly indented YAML snippets with cursor context', () => {
            const resourceType = 'AWS::IAM::Role';
            const relatedToType = 'AWS::S3::Bucket';
            const mockSchema = {
                required: ['AssumeRolePolicyDocument'],
            };

            mockSchemaRetriever.getDefault.returns({
                schemas: new Map([[resourceType, mockSchema]]),
            } as any);

            // Mock document with a line that has existing indentation (simulating cursor after a resource)
            const mockDocument = {
                getText: () => `AWSTemplateFormatVersion: "2010-09-09"
Resources:
  MyBucket:
    Type: AWS::S3::Bucket
    Properties:
      BucketName: test
  `, // Line 5 (position.line) has 2 spaces indentation
                getLines: () => [
                    `AWSTemplateFormatVersion: "2010-09-09"`,
                    'Resources:',
                    '  MyBucket:',
                    '    Type: AWS::S3::Bucket',
                    '    Properties:',
                    '      BucketName: test',
                    '  ',
                ],
                documentType: 'YAML',
            };
            mockDocumentManager.get.returns(mockDocument as any);
            mockDocumentManager.getEditorSettingsForDocument.returns({ tabSize: 2, insertSpaces: true } as any);

            const result = (provider as any).generatePropertySnippet(
                resourceType,
                relatedToType,
                mockParams,
                mockDocument,
            );

            // Verify proper YAML structure with cursor context indentation
            expect(result).toContain('RelatedToS3BucketLogicalId:');
            expect(result).toContain('    Type: AWS::IAM::Role'); // 4 spaces (2 existing + 2 more)
            expect(result).toContain('    Properties:'); // 4 spaces (2 existing + 2 more)
            expect(result).toContain('      AssumeRolePolicyDocument: '); // 6 spaces (2 existing + 4 more)
        });

        test('should generate properly indented JSON snippets with cursor context', () => {
            const resourceType = 'AWS::IAM::Role';
            const relatedToType = 'AWS::S3::Bucket';
            const mockSchema = {
                required: ['AssumeRolePolicyDocument'],
            };

            mockSchemaRetriever.getDefault.returns({
                schemas: new Map([[resourceType, mockSchema]]),
            } as any);

            // Mock document with a line that has existing indentation
            const mockDocument = {
                getText: () => `{
  "AWSTemplateFormatVersion": "2010-09-09",
  "Resources": {
    "MyBucket": {
      "Type": "AWS::S3::Bucket"
    },
  `, // Line 5 (position.line) has 2 spaces indentation
                getLines: () => [
                    '{',
                    '  "AWSTemplateFormatVersion": "2010-09-09",',
                    '  "Resources": {',
                    '    "MyBucket": {',
                    '      "Type": "AWS::S3::Bucket"',
                    '    },',
                    '  ',
                ],
                documentType: 'JSON',
            };
            mockDocumentManager.get.returns(mockDocument as any);
            mockDocumentManager.getEditorSettingsForDocument.returns({ tabSize: 2, insertSpaces: true } as any);

            const result = (provider as any).generatePropertySnippet(
                resourceType,
                relatedToType,
                mockParams,
                mockDocument,
            );

            // Verify proper JSON structure with cursor context indentation
            expect(result).toContain('"RelatedToS3BucketLogicalId": {');
            expect(result).toContain('    "Type": "AWS::IAM::Role"'); // 4 spaces (2 existing + 2 more)
            expect(result).toContain('    "Properties": {'); // 4 spaces (2 existing + 2 more)
            expect(result).toContain('      "AssumeRolePolicyDocument": ""'); // 6 spaces (2 existing + 4 more)
        });
    });
});
