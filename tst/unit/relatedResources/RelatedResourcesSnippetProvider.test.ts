import { describe, it, expect, beforeEach, vi } from 'vitest';
import { CodeActionKind } from 'vscode-languageserver-protocol';
import { TextDocument } from 'vscode-languageserver-textdocument';
import { getEntityMap } from '../../../src/context/SectionContextBuilder';
import { Document } from '../../../src/document/Document';
import { RelatedResourcesSnippetProvider } from '../../../src/relatedResources/RelatedResourcesSnippetProvider';
import {
    createMockComponents,
    createMockDocumentManager,
    createMockRelationshipSchemaService,
    createMockSchemaRetriever,
    createMockSyntaxTreeManager,
} from '../../utils/MockServerComponents';
import { combinedSchemas } from '../../utils/SchemaUtils';

// Mock the SectionContextBuilder module
vi.mock('../../../src/context/SectionContextBuilder', () => ({
    getEntityMap: vi.fn(),
}));

describe('RelatedResourcesSnippetProvider', () => {
    const defaultSchemas = combinedSchemas();

    const syntaxTreeManager = createMockSyntaxTreeManager();
    const documentManager = createMockDocumentManager();
    const schemaRetriever = createMockSchemaRetriever(defaultSchemas);
    const relationshipSchemaService = createMockRelationshipSchemaService();
    const mockComponents = createMockComponents({
        syntaxTreeManager,
        documentManager,
        schemaRetriever,
        relationshipSchemaService,
    });
    const provider = new RelatedResourcesSnippetProvider(
        mockComponents.documentManager,
        mockComponents.syntaxTreeManager,
        mockComponents.schemaRetriever,
    );
    const mockGetEntityMap = vi.mocked(getEntityMap) as any;

    beforeEach(() => {
        mockGetEntityMap.mockReset();
        syntaxTreeManager.getSyntaxTree.reset();
        documentManager.get.reset();
        schemaRetriever.getDefault.returns(defaultSchemas);
    });

    describe('insertRelatedResources', () => {
        it('should throw error when document not found', () => {
            const templateUri = 'file:///test/template.yaml';
            documentManager.get.withArgs(templateUri).returns(undefined);

            expect(() => {
                provider.insertRelatedResources(templateUri, ['AWS::Lambda::Function'], 'AWS::S3::Bucket');
            }).toThrow('Document not found');
        });

        it('should generate code action for YAML document without Resources section', () => {
            const templateUri = 'file:///test/template.yaml';
            const yamlContent = 'AWSTemplateFormatVersion: "2010-09-09"\n';
            const document = new Document(TextDocument.create(templateUri, 'yaml', 1, yamlContent));

            documentManager.get.withArgs(templateUri).returns(document);
            syntaxTreeManager.getSyntaxTree.withArgs(templateUri).returns(undefined);

            const result = provider.insertRelatedResources(templateUri, ['AWS::Lambda::Function'], 'AWS::S3::Bucket');

            expect(result).toBeDefined();
            expect(result.title).toBe('Insert 1 related resources');
            expect(result.kind).toBe(CodeActionKind.Refactor);
            expect(result.edit).toBeDefined();
            expect(result.edit?.changes).toBeDefined();
            expect(result.edit?.changes![templateUri]).toBeDefined();
            expect(result.edit?.changes![templateUri].length).toBe(1);

            const textEdit = result.edit?.changes![templateUri][0];
            expect(textEdit?.newText).toContain('Resources:');
            expect(textEdit?.newText).toContain('LambdaFunctionRelatedToS3Bucket:');
            expect(textEdit?.newText).toContain('Type: AWS::Lambda::Function');
        });

        it('should generate code action for YAML document with existing Resources section', () => {
            const templateUri = 'file:///test/template.yaml';
            const yamlContent = `AWSTemplateFormatVersion: "2010-09-09"
Resources:
  MyBucket:
    Type: AWS::S3::Bucket
`;
            const document = new Document(TextDocument.create(templateUri, 'yaml', 1, yamlContent));

            const mockSyntaxTree = {
                findTopLevelSections: vi.fn().mockReturnValue(
                    new Map([
                        [
                            'Resources',
                            {
                                endPosition: { row: 3, column: 0 },
                            },
                        ],
                    ]),
                ),
            };

            documentManager.get.withArgs(templateUri).returns(document);
            syntaxTreeManager.getSyntaxTree.withArgs(templateUri).returns(mockSyntaxTree as any);
            mockGetEntityMap.mockReturnValue(new Map([['MyBucket', { entity: { Type: 'AWS::S3::Bucket' } }]]));

            const result = provider.insertRelatedResources(templateUri, ['AWS::Lambda::Function'], 'AWS::S3::Bucket');

            expect(result).toBeDefined();
            expect(result.title).toBe('Insert 1 related resources');
            const textEdit = result.edit?.changes![templateUri][0];
            expect(textEdit?.newText).toContain('LambdaFunctionRelatedToS3Bucket:');
            expect(textEdit?.newText).toContain('Type: AWS::Lambda::Function');
            expect(textEdit?.newText).not.toContain('Resources:'); // Should not add Resources section again
        });

        it('should generate code action for JSON document without Resources section', () => {
            const templateUri = 'file:///test/template.json';
            const jsonContent = '{\n  "AWSTemplateFormatVersion": "2010-09-09"\n}';
            const document = new Document(TextDocument.create(templateUri, 'json', 1, jsonContent));

            documentManager.get.withArgs(templateUri).returns(document);
            syntaxTreeManager.getSyntaxTree.withArgs(templateUri).returns(undefined);

            const result = provider.insertRelatedResources(templateUri, ['AWS::Lambda::Function'], 'AWS::S3::Bucket');

            expect(result).toBeDefined();
            const textEdit = result.edit?.changes![templateUri][0];
            expect(textEdit?.newText).toContain('"Resources"');
            expect(textEdit?.newText).toContain('"LambdaFunctionRelatedToS3Bucket"');
            expect(textEdit?.newText).toContain('"Type": "AWS::Lambda::Function"');
        });

        it('should generate code action for JSON document with existing Resources section', () => {
            const templateUri = 'file:///test/template.json';
            const jsonContent = `{
  "AWSTemplateFormatVersion": "2010-09-09",
  "Resources": {
    "MyBucket": {
      "Type": "AWS::S3::Bucket"
    }
  }
}`;
            const document = new Document(TextDocument.create(templateUri, 'json', 1, jsonContent));

            const mockSyntaxTree = {
                findTopLevelSections: vi.fn().mockReturnValue(
                    new Map([
                        [
                            'Resources',
                            {
                                endPosition: { row: 6, column: 0 },
                            },
                        ],
                    ]),
                ),
            };

            documentManager.get.withArgs(templateUri).returns(document);
            syntaxTreeManager.getSyntaxTree.withArgs(templateUri).returns(mockSyntaxTree as any);
            mockGetEntityMap.mockReturnValue(new Map([['MyBucket', { entity: { Type: 'AWS::S3::Bucket' } }]]));

            const result = provider.insertRelatedResources(templateUri, ['AWS::Lambda::Function'], 'AWS::S3::Bucket');

            expect(result).toBeDefined();
            const textEdit = result.edit?.changes![templateUri][0];
            expect(textEdit?.newText).toContain('"LambdaFunctionRelatedToS3Bucket"');
            expect(textEdit?.newText).toContain('"Type": "AWS::Lambda::Function"');
        });

        it('should generate multiple resources', () => {
            const templateUri = 'file:///test/template.yaml';
            const yamlContent = `AWSTemplateFormatVersion: "2010-09-09"
Resources:
  MyBucket:
    Type: AWS::S3::Bucket
`;
            const document = new Document(TextDocument.create(templateUri, 'yaml', 1, yamlContent));

            const mockSyntaxTree = {
                findTopLevelSections: vi.fn().mockReturnValue(
                    new Map([
                        [
                            'Resources',
                            {
                                endPosition: { row: 3, column: 0 },
                            },
                        ],
                    ]),
                ),
            };

            documentManager.get.withArgs(templateUri).returns(document);
            syntaxTreeManager.getSyntaxTree.withArgs(templateUri).returns(mockSyntaxTree as any);
            mockGetEntityMap.mockReturnValue(new Map([['MyBucket', { entity: { Type: 'AWS::S3::Bucket' } }]]));

            const result = provider.insertRelatedResources(
                templateUri,
                ['AWS::Lambda::Function', 'AWS::IAM::Role'],
                'AWS::S3::Bucket',
            );

            expect(result).toBeDefined();
            expect(result.title).toBe('Insert 2 related resources');
            const textEdit = result.edit?.changes![templateUri][0];
            expect(textEdit?.newText).toContain('LambdaFunctionRelatedToS3Bucket:');
            expect(textEdit?.newText).toContain('IAMRoleRelatedToS3Bucket:');
        });

        it('should include required properties from schema', () => {
            const templateUri = 'file:///test/template.yaml';
            const yamlContent = `AWSTemplateFormatVersion: "2010-09-09"
Resources:
  MyBucket:
    Type: AWS::S3::Bucket
`;
            const document = new Document(TextDocument.create(templateUri, 'yaml', 1, yamlContent));

            const mockSyntaxTree = {
                findTopLevelSections: vi.fn().mockReturnValue(
                    new Map([
                        [
                            'Resources',
                            {
                                endPosition: { row: 3, column: 0 },
                            },
                        ],
                    ]),
                ),
            };

            const mockSchema = {
                required: ['Code', 'Handler', 'Runtime', 'Role'],
            };

            documentManager.get.withArgs(templateUri).returns(document);
            syntaxTreeManager.getSyntaxTree.withArgs(templateUri).returns(mockSyntaxTree as any);
            mockGetEntityMap.mockReturnValue(new Map([['MyBucket', { entity: { Type: 'AWS::S3::Bucket' } }]]));
            schemaRetriever.getDefault.returns({
                schemas: new Map([['AWS::Lambda::Function', mockSchema]]),
            } as any);

            const result = provider.insertRelatedResources(templateUri, ['AWS::Lambda::Function'], 'AWS::S3::Bucket');

            expect(result).toBeDefined();
            const textEdit = result.edit?.changes![templateUri][0];
            expect(textEdit?.newText).toContain('Properties:');
            expect(textEdit?.newText).toContain('Code:');
            expect(textEdit?.newText).toContain('Handler:');
            expect(textEdit?.newText).toContain('Runtime:');
            expect(textEdit?.newText).toContain('Role:');
        });

        it('should generate unique logical IDs when duplicates exist', () => {
            const templateUri = 'file:///test/template.yaml';
            const yamlContent = `AWSTemplateFormatVersion: "2010-09-09"
Resources:
  MyBucket:
    Type: AWS::S3::Bucket
  LambdaFunctionRelatedToS3Bucket:
    Type: AWS::Lambda::Function
`;
            const document = new Document(TextDocument.create(templateUri, 'yaml', 1, yamlContent));

            const mockSyntaxTree = {
                findTopLevelSections: vi.fn().mockReturnValue(
                    new Map([
                        [
                            'Resources',
                            {
                                endPosition: { row: 5, column: 0 },
                            },
                        ],
                    ]),
                ),
            };

            documentManager.get.withArgs(templateUri).returns(document);
            syntaxTreeManager.getSyntaxTree.withArgs(templateUri).returns(mockSyntaxTree as any);
            mockGetEntityMap.mockReturnValue(
                new Map([
                    ['MyBucket', { entity: { Type: 'AWS::S3::Bucket' } }],
                    ['LambdaFunctionRelatedToS3Bucket', { entity: { Type: 'AWS::Lambda::Function' } }],
                ]),
            );

            const result = provider.insertRelatedResources(templateUri, ['AWS::Lambda::Function'], 'AWS::S3::Bucket');

            expect(result).toBeDefined();
            const textEdit = result.edit?.changes![templateUri][0];
            // Should append a number to make it unique
            expect(textEdit?.newText).toContain('LambdaFunctionRelatedToS3Bucket1:');
        });

        it('should include scroll position and first logical ID in data', () => {
            const templateUri = 'file:///test/template.yaml';
            const yamlContent = `AWSTemplateFormatVersion: "2010-09-09"
Resources:
  MyBucket:
    Type: AWS::S3::Bucket
`;
            const document = new Document(TextDocument.create(templateUri, 'yaml', 1, yamlContent));

            const mockSyntaxTree = {
                findTopLevelSections: vi.fn().mockReturnValue(
                    new Map([
                        [
                            'Resources',
                            {
                                endPosition: { row: 3, column: 0 },
                            },
                        ],
                    ]),
                ),
            };

            documentManager.get.withArgs(templateUri).returns(document);
            syntaxTreeManager.getSyntaxTree.withArgs(templateUri).returns(mockSyntaxTree as any);
            mockGetEntityMap.mockReturnValue(new Map([['MyBucket', { entity: { Type: 'AWS::S3::Bucket' } }]]));

            const result = provider.insertRelatedResources(templateUri, ['AWS::Lambda::Function'], 'AWS::S3::Bucket');

            expect(result).toBeDefined();
            expect(result.data).toBeDefined();
            expect(result.data?.scrollToPosition).toBeDefined();
            expect(result.data?.firstLogicalId).toBe('LambdaFunctionRelatedToS3Bucket');
        });

        it('should handle errors and rethrow them', () => {
            const templateUri = 'file:///test/template.yaml';
            documentManager.get.withArgs(templateUri).throws(new Error('Document manager error'));

            expect(() => {
                provider.insertRelatedResources(templateUri, ['AWS::Lambda::Function'], 'AWS::S3::Bucket');
            }).toThrow('Document manager error');
        });
    });
});
