import { describe, expect, test, beforeEach, vi } from 'vitest';
import { InlineCompletionParams, InlineCompletionTriggerKind } from 'vscode-languageserver-protocol';
import { RelatedResourcesInlineCompletionProvider } from '../../../src/autocomplete/RelatedResourcesInlineCompletionProvider';
import { RelationshipSchemaService } from '../../../src/services/RelationshipSchemaService';
import { createTopLevelContext } from '../../utils/MockContext';
import { createMockDocumentManager, createMockSchemaRetriever } from '../../utils/MockServerComponents';

describe('RelatedResourcesInlineCompletionProvider', () => {
    const mockDocumentManager = createMockDocumentManager();
    const mockRelationshipSchemaService = RelationshipSchemaService.getInstance();
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

    describe('getlineCompletion', () => {
        test('should return undefined when document is not found', () => {
            mockDocumentManager.get.returns(undefined);

            const result = provider.getlineCompletion(mockContext, mockParams);

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

            const result = provider.getlineCompletion(mockContext, mockParams);

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

            const result = provider.getlineCompletion(mockContext, mockParams);

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
            };
            mockDocumentManager.get.returns(mockDocument as any);

            // Mock the service to return existing resources and related ones
            vi.spyOn(mockRelationshipSchemaService, 'extractResourceTypesFromTemplate').mockReturnValue([
                'AWS::S3::Bucket',
            ]);
            vi.spyOn(mockRelationshipSchemaService, 'getAllRelatedResourceTypes').mockReturnValue(
                new Set(['AWS::Lambda::Function', 'AWS::IAM::Role', 'AWS::CloudFront::Distribution']),
            );

            const result = provider.getlineCompletion(mockContext, mockParams) as any[];

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
                expect(item.insertText).toContain('relatedResourceLogicalId:');
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

            const result = provider.getlineCompletion(mockContext, mockParams);

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
            expect(result).toEqual(['AWS::IAM::Role']);
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
            expect(result[0]).toBe('AWS::IAM::Role');
        });
    });

    describe('generateInlineCompletionItems', () => {
        test('should limit suggestions to top 5', () => {
            const manyResourceTypes = [
                'AWS::IAM::Role',
                'AWS::CloudFront::Distribution',
                'AWS::API::Gateway',
                'AWS::EC2::SecurityGroup',
                'AWS::RDS::DBInstance',
                'AWS::DynamoDB::Table',
                'AWS::SNS::Topic',
                'AWS::SQS::Queue',
            ];

            const result = (provider as any).generateInlineCompletionItems(manyResourceTypes, mockParams, mockContext);

            expect(result).toBeDefined();
            expect(Array.isArray(result)).toBe(true);
            expect(result.length).toBe(5); // Should limit to 5
        });

        test('should create proper completion items structure', () => {
            const resourceTypes = ['AWS::IAM::Role', 'AWS::CloudFront::Distribution'];

            const result = (provider as any).generateInlineCompletionItems(resourceTypes, mockParams, mockContext);

            expect(result).toBeDefined();
            expect(result.length).toBe(2);

            for (const item of result) {
                expect(item.insertText).toBeDefined();
                expect(item.insertText).toContain('relatedResourceLogicalId:');
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

            const result = (provider as any).generatePropertySnippet(
                resourceType,
                mockContext.documentType,
                mockParams,
            );

            expect(result).toBeDefined();
            expect(result).toContain('relatedResourceLogicalId:');
            expect(result).toContain('Type: AWS::S3::Bucket');
        });

        test('should handle different resource types', () => {
            const testCases = ['AWS::Lambda::Function', 'AWS::IAM::Role', 'AWS::EC2::Instance', 'AWS::RDS::DBInstance'];

            for (const resourceType of testCases) {
                const result = (provider as any).generatePropertySnippet(
                    resourceType,
                    mockContext.documentType,
                    mockParams,
                );
                expect(result).toContain('relatedResourceLogicalId:');
                expect(result).toContain(`Type: ${resourceType}`);
            }
        });

        test('should include required properties when schema has required fields', () => {
            const resourceType = 'AWS::S3::Bucket';

            // Mock schema with required properties
            const mockSchema = {
                required: ['BucketName', 'AccessControl'],
            };

            mockSchemaRetriever.getDefault.returns({
                schemas: new Map([[resourceType, mockSchema]]),
            } as any);

            const result = (provider as any).generatePropertySnippet(
                resourceType,
                mockContext.documentType,
                mockParams,
            );

            expect(result).toContain('relatedResourceLogicalId:');
            expect(result).toContain(`Type: ${resourceType}`);
            expect(result).toContain('Properties:');
            expect(result).toContain('BucketName:');
            expect(result).toContain('AccessControl:');
        });
    });
});
