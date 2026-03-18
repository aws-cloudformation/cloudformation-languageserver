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
        mockComponents.relationshipSchemaService,
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

        it('should populate !Ref for YAML when attribute matches primary identifier', () => {
            const templateUri = 'file:///test/template.yaml';
            const yamlContent = `AWSTemplateFormatVersion: "2010-09-09"
Resources:
  MyVpc:
    Type: AWS::EC2::VPC
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
            mockGetEntityMap.mockReturnValue(new Map([['MyVpc', { entity: { Type: 'AWS::EC2::VPC' } }]]));
            schemaRetriever.getDefault.returns({
                schemas: new Map([
                    ['AWS::EC2::Subnet', { required: ['VpcId', 'AvailabilityZone'] }],
                    ['AWS::EC2::VPC', { primaryIdentifier: ['/properties/VpcId'] }],
                ]),
            } as any);
            relationshipSchemaService.getRelationshipsForResourceType.withArgs('AWS::EC2::Subnet').returns({
                resourceType: 'AWS::EC2::Subnet',
                relationships: [
                    {
                        property: 'VpcId',
                        relatedResourceTypes: [{ typeName: 'AWS::EC2::VPC', attribute: '/properties/VpcId' }],
                    },
                ],
            });

            const result = provider.insertRelatedResources(templateUri, ['AWS::EC2::Subnet'], 'AWS::EC2::VPC');

            expect(result).toBeDefined();
            const textEdit = result.edit?.changes![templateUri][0];
            expect(textEdit?.newText).toContain('VpcId: !Ref MyVpc');
            expect(textEdit?.newText).toContain('AvailabilityZone: ""');
        });

        it('should populate {"Ref": ...} for JSON when attribute matches primary identifier', () => {
            const templateUri = 'file:///test/template.json';
            const jsonContent = `{
  "AWSTemplateFormatVersion": "2010-09-09",
  "Resources": {
    "MyVpc": {
      "Type": "AWS::EC2::VPC"
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
            mockGetEntityMap.mockReturnValue(new Map([['MyVpc', { entity: { Type: 'AWS::EC2::VPC' } }]]));
            schemaRetriever.getDefault.returns({
                schemas: new Map([
                    ['AWS::EC2::Subnet', { required: ['VpcId', 'AvailabilityZone'] }],
                    ['AWS::EC2::VPC', { primaryIdentifier: ['/properties/VpcId'] }],
                ]),
            } as any);
            relationshipSchemaService.getRelationshipsForResourceType.withArgs('AWS::EC2::Subnet').returns({
                resourceType: 'AWS::EC2::Subnet',
                relationships: [
                    {
                        property: 'VpcId',
                        relatedResourceTypes: [{ typeName: 'AWS::EC2::VPC', attribute: '/properties/VpcId' }],
                    },
                ],
            });

            const result = provider.insertRelatedResources(templateUri, ['AWS::EC2::Subnet'], 'AWS::EC2::VPC');

            expect(result).toBeDefined();
            const textEdit = result.edit?.changes![templateUri][0];
            expect(textEdit?.newText).toContain('"Ref": "MyVpc"');
        });

        it('should populate !GetAtt for YAML when attribute does not match primary identifier', () => {
            const templateUri = 'file:///test/template.yaml';
            const yamlContent = `AWSTemplateFormatVersion: "2010-09-09"
Resources:
  MyRole:
    Type: AWS::IAM::Role
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
            mockGetEntityMap.mockReturnValue(new Map([['MyRole', { entity: { Type: 'AWS::IAM::Role' } }]]));
            schemaRetriever.getDefault.returns({
                schemas: new Map([
                    ['AWS::Lambda::Function', { required: ['Code', 'Role', 'Runtime'] }],
                    ['AWS::IAM::Role', { primaryIdentifier: ['/properties/RoleName'] }],
                ]),
            } as any);
            // Role property references IAM::Role with attribute /properties/Arn
            // which is NOT the primary identifier (/properties/RoleName)
            relationshipSchemaService.getRelationshipsForResourceType.withArgs('AWS::Lambda::Function').returns({
                resourceType: 'AWS::Lambda::Function',
                relationships: [
                    {
                        property: 'Role',
                        relatedResourceTypes: [{ typeName: 'AWS::IAM::Role', attribute: '/properties/Arn' }],
                    },
                ],
            });

            const result = provider.insertRelatedResources(templateUri, ['AWS::Lambda::Function'], 'AWS::IAM::Role');

            expect(result).toBeDefined();
            const textEdit = result.edit?.changes![templateUri][0];
            expect(textEdit?.newText).toContain('Role: !GetAtt MyRole.Arn');
            expect(textEdit?.newText).toContain('Code: ""');
            expect(textEdit?.newText).toContain('Runtime: ""');
        });

        it('should populate Fn::GetAtt for JSON when attribute does not match primary identifier', () => {
            const templateUri = 'file:///test/template.json';
            const jsonContent = `{
  "AWSTemplateFormatVersion": "2010-09-09",
  "Resources": {
    "MyRole": {
      "Type": "AWS::IAM::Role"
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
            mockGetEntityMap.mockReturnValue(new Map([['MyRole', { entity: { Type: 'AWS::IAM::Role' } }]]));
            schemaRetriever.getDefault.returns({
                schemas: new Map([
                    ['AWS::Lambda::Function', { required: ['Code', 'Role', 'Runtime'] }],
                    ['AWS::IAM::Role', { primaryIdentifier: ['/properties/RoleName'] }],
                ]),
            } as any);
            relationshipSchemaService.getRelationshipsForResourceType.withArgs('AWS::Lambda::Function').returns({
                resourceType: 'AWS::Lambda::Function',
                relationships: [
                    {
                        property: 'Role',
                        relatedResourceTypes: [{ typeName: 'AWS::IAM::Role', attribute: '/properties/Arn' }],
                    },
                ],
            });

            const result = provider.insertRelatedResources(templateUri, ['AWS::Lambda::Function'], 'AWS::IAM::Role');

            expect(result).toBeDefined();
            const textEdit = result.edit?.changes![templateUri][0];
            expect(textEdit?.newText).toContain('"Fn::GetAtt"');
            expect(textEdit?.newText).toContain('"MyRole"');
            expect(textEdit?.newText).toContain('"Arn"');
        });

        it('should use !GetAtt for non-required properties when attribute is not primary identifier', () => {
            const templateUri = 'file:///test/template.yaml';
            const yamlContent = `AWSTemplateFormatVersion: "2010-09-09"
Resources:
  MyRole:
    Type: AWS::IAM::Role
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
            mockGetEntityMap.mockReturnValue(new Map([['MyRole', { entity: { Type: 'AWS::IAM::Role' } }]]));
            schemaRetriever.getDefault.returns({
                schemas: new Map([
                    ['AWS::CloudTrail::Trail', { required: ['IsLogging', 'S3BucketName'] }],
                    ['AWS::IAM::Role', { primaryIdentifier: ['/properties/RoleName'] }],
                ]),
            } as any);
            // CloudWatchLogsRoleArn is NOT required but references IAM::Role with /properties/Arn
            relationshipSchemaService.getRelationshipsForResourceType.withArgs('AWS::CloudTrail::Trail').returns({
                resourceType: 'AWS::CloudTrail::Trail',
                relationships: [
                    {
                        property: 'CloudWatchLogsRoleArn',
                        relatedResourceTypes: [{ typeName: 'AWS::IAM::Role', attribute: '/properties/Arn' }],
                    },
                ],
            });

            const result = provider.insertRelatedResources(templateUri, ['AWS::CloudTrail::Trail'], 'AWS::IAM::Role');

            expect(result).toBeDefined();
            const textEdit = result.edit?.changes![templateUri][0];
            // Non-required property should use !GetAtt since /properties/Arn != primaryIdentifier
            expect(textEdit?.newText).toContain('CloudWatchLogsRoleArn: !GetAtt MyRole.Arn');
        });

        it('should leave property empty when it does not relate to parent resource type', () => {
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
            schemaRetriever.getDefault.returns({
                schemas: new Map([['AWS::Lambda::Function', { required: ['Code', 'Role', 'Runtime'] }]]),
            } as any);
            // Role relates to IAM::Role, not S3::Bucket
            relationshipSchemaService.getRelationshipsForResourceType.withArgs('AWS::Lambda::Function').returns({
                resourceType: 'AWS::Lambda::Function',
                relationships: [
                    {
                        property: 'Role',
                        relatedResourceTypes: [{ typeName: 'AWS::IAM::Role', attribute: '/properties/Arn' }],
                    },
                ],
            });

            const result = provider.insertRelatedResources(templateUri, ['AWS::Lambda::Function'], 'AWS::S3::Bucket');

            expect(result).toBeDefined();
            const textEdit = result.edit?.changes![templateUri][0];
            // None of the properties should have !Ref since none relate to S3::Bucket
            expect(textEdit?.newText).not.toContain('!Ref');
            expect(textEdit?.newText).toContain('Role: ""');
            expect(textEdit?.newText).toContain('Code: ""');
            expect(textEdit?.newText).toContain('Runtime: ""');
        });

        it('should add non-required properties with Ref when they reference the parent type in YAML', () => {
            const templateUri = 'file:///test/template.yaml';
            const yamlContent = `AWSTemplateFormatVersion: "2010-09-09"
Resources:
  MyPolicy:
    Type: AWS::IAM::ManagedPolicy
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
            mockGetEntityMap.mockReturnValue(new Map([['MyPolicy', { entity: { Type: 'AWS::IAM::ManagedPolicy' } }]]));
            schemaRetriever.getDefault.returns({
                schemas: new Map([['AWS::IAM::Role', { required: ['AssumeRolePolicyDocument'] }]]),
            } as any);
            // ManagedPolicyArns is NOT required but references the parent
            relationshipSchemaService.getRelationshipsForResourceType.withArgs('AWS::IAM::Role').returns({
                resourceType: 'AWS::IAM::Role',
                relationships: [
                    {
                        property: 'ManagedPolicyArns',
                        relatedResourceTypes: [
                            { typeName: 'AWS::IAM::ManagedPolicy', attribute: '/properties/PolicyArn' },
                        ],
                    },
                ],
            });

            const result = provider.insertRelatedResources(templateUri, ['AWS::IAM::Role'], 'AWS::IAM::ManagedPolicy');

            expect(result).toBeDefined();
            const textEdit = result.edit?.changes![templateUri][0];
            // ManagedPolicyArns should be added with !Ref even though it's not required
            expect(textEdit?.newText).toContain('ManagedPolicyArns: !Ref MyPolicy');
            // Required property should still be present as empty
            expect(textEdit?.newText).toContain('AssumeRolePolicyDocument: ""');
        });

        it('should add non-required properties with Ref in JSON when they reference the parent type', () => {
            const templateUri = 'file:///test/template.json';
            const jsonContent = `{
  "AWSTemplateFormatVersion": "2010-09-09",
  "Resources": {
    "MyPolicy": {
      "Type": "AWS::IAM::ManagedPolicy"
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
            mockGetEntityMap.mockReturnValue(new Map([['MyPolicy', { entity: { Type: 'AWS::IAM::ManagedPolicy' } }]]));
            schemaRetriever.getDefault.returns({
                schemas: new Map([['AWS::IAM::Role', { required: ['AssumeRolePolicyDocument'] }]]),
            } as any);
            relationshipSchemaService.getRelationshipsForResourceType.withArgs('AWS::IAM::Role').returns({
                resourceType: 'AWS::IAM::Role',
                relationships: [
                    {
                        property: 'ManagedPolicyArns',
                        relatedResourceTypes: [
                            { typeName: 'AWS::IAM::ManagedPolicy', attribute: '/properties/PolicyArn' },
                        ],
                    },
                ],
            });

            const result = provider.insertRelatedResources(templateUri, ['AWS::IAM::Role'], 'AWS::IAM::ManagedPolicy');

            expect(result).toBeDefined();
            const textEdit = result.edit?.changes![templateUri][0];
            expect(textEdit?.newText).toContain('"ManagedPolicyArns"');
            expect(textEdit?.newText).toContain('"Ref": "MyPolicy"');
        });

        it('should not add non-required properties with nested paths', () => {
            const templateUri = 'file:///test/template.yaml';
            const yamlContent = `AWSTemplateFormatVersion: "2010-09-09"
Resources:
  MyVpc:
    Type: AWS::EC2::VPC
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
            mockGetEntityMap.mockReturnValue(new Map([['MyVpc', { entity: { Type: 'AWS::EC2::VPC' } }]]));
            schemaRetriever.getDefault.returns({
                schemas: new Map([['AWS::Lambda::Function', { required: ['Code', 'Role', 'Runtime'] }]]),
            } as any);
            // VpcConfig/SecurityGroupIds is a nested path - should NOT be added
            relationshipSchemaService.getRelationshipsForResourceType.withArgs('AWS::Lambda::Function').returns({
                resourceType: 'AWS::Lambda::Function',
                relationships: [
                    {
                        property: 'VpcConfig/SecurityGroupIds',
                        relatedResourceTypes: [
                            { typeName: 'AWS::EC2::VPC', attribute: '/properties/DefaultSecurityGroup' },
                        ],
                    },
                ],
            });

            const result = provider.insertRelatedResources(templateUri, ['AWS::Lambda::Function'], 'AWS::EC2::VPC');

            expect(result).toBeDefined();
            const textEdit = result.edit?.changes![templateUri][0];
            // Nested path properties should NOT be added
            expect(textEdit?.newText).not.toContain('VpcConfig');
            expect(textEdit?.newText).not.toContain('SecurityGroupIds');
        });

        it('should not auto-populate when multiple top-level properties reference the same parent', () => {
            const templateUri = 'file:///test/template.yaml';
            const yamlContent = `AWSTemplateFormatVersion: "2010-09-09"
Resources:
  MyRole:
    Type: AWS::IAM::Role
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
            mockGetEntityMap.mockReturnValue(new Map([['MyRole', { entity: { Type: 'AWS::IAM::Role' } }]]));
            schemaRetriever.getDefault.returns({
                schemas: new Map([
                    ['AWS::ECS::TaskDefinition', { required: ['TaskRoleArn', 'ExecutionRoleArn'] }],
                    ['AWS::IAM::Role', { primaryIdentifier: ['/properties/RoleName'] }],
                ]),
            } as any);
            // Both TaskRoleArn AND ExecutionRoleArn reference IAM::Role → 2 refs → don't populate
            relationshipSchemaService.getRelationshipsForResourceType.withArgs('AWS::ECS::TaskDefinition').returns({
                resourceType: 'AWS::ECS::TaskDefinition',
                relationships: [
                    {
                        property: 'TaskRoleArn',
                        relatedResourceTypes: [{ typeName: 'AWS::IAM::Role', attribute: '/properties/Arn' }],
                    },
                    {
                        property: 'ExecutionRoleArn',
                        relatedResourceTypes: [{ typeName: 'AWS::IAM::Role', attribute: '/properties/Arn' }],
                    },
                ],
            });

            const result = provider.insertRelatedResources(templateUri, ['AWS::ECS::TaskDefinition'], 'AWS::IAM::Role');

            expect(result).toBeDefined();
            const textEdit = result.edit?.changes![templateUri][0];
            // Neither property should be populated since there are multiple references
            expect(textEdit?.newText).not.toContain('!Ref');
            expect(textEdit?.newText).not.toContain('!GetAtt');
            expect(textEdit?.newText).toContain('TaskRoleArn: ""');
            expect(textEdit?.newText).toContain('ExecutionRoleArn: ""');
        });

        it('should leave property empty when parent logical ID is not found in template', () => {
            const templateUri = 'file:///test/template.yaml';
            const yamlContent = 'AWSTemplateFormatVersion: "2010-09-09"\n';
            const document = new Document(TextDocument.create(templateUri, 'yaml', 1, yamlContent));

            documentManager.get.withArgs(templateUri).returns(document);
            syntaxTreeManager.getSyntaxTree.withArgs(templateUri).returns(undefined);

            schemaRetriever.getDefault.returns({
                schemas: new Map([['AWS::EC2::Subnet', { required: ['VpcId'] }]]),
            } as any);
            relationshipSchemaService.getRelationshipsForResourceType.withArgs('AWS::EC2::Subnet').returns({
                resourceType: 'AWS::EC2::Subnet',
                relationships: [
                    {
                        property: 'VpcId',
                        relatedResourceTypes: [{ typeName: 'AWS::EC2::VPC', attribute: '/properties/VpcId' }],
                    },
                ],
            });

            const result = provider.insertRelatedResources(templateUri, ['AWS::EC2::Subnet'], 'AWS::EC2::VPC');

            expect(result).toBeDefined();
            const textEdit = result.edit?.changes![templateUri][0];
            // No parent found, so VpcId should be empty
            expect(textEdit?.newText).not.toContain('!Ref');
            expect(textEdit?.newText).toContain('VpcId: ""');
        });

        it('should skip array properties and not populate them with references', () => {
            const templateUri = 'file:///test/template.yaml';
            const yamlContent = `AWSTemplateFormatVersion: "2010-09-09"
Resources:
  MyRole:
    Type: AWS::IAM::Role
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
            mockGetEntityMap.mockReturnValue(new Map([['MyRole', { entity: { Type: 'AWS::IAM::Role' } }]]));
            schemaRetriever.getDefault.returns({
                schemas: new Map([
                    [
                        'AWS::IAM::ManagedPolicy',
                        {
                            required: ['PolicyDocument', 'Roles'],
                            properties: {
                                PolicyDocument: { type: 'object' },
                                Roles: { type: 'array' }, // Array property
                            },
                        },
                    ],
                    ['AWS::IAM::Role', { primaryIdentifier: ['/properties/RoleName'] }],
                ]),
            } as any);
            relationshipSchemaService.getRelationshipsForResourceType.withArgs('AWS::IAM::ManagedPolicy').returns({
                resourceType: 'AWS::IAM::ManagedPolicy',
                relationships: [
                    {
                        property: 'Roles',
                        relatedResourceTypes: [{ typeName: 'AWS::IAM::Role', attribute: '/properties/RoleName' }],
                    },
                ],
            });

            const result = provider.insertRelatedResources(templateUri, ['AWS::IAM::ManagedPolicy'], 'AWS::IAM::Role');

            expect(result).toBeDefined();
            const textEdit = result.edit?.changes![templateUri][0];
            // Roles is an array property, should NOT be populated with !Ref
            expect(textEdit?.newText).toContain('Roles: ""');
            expect(textEdit?.newText).not.toContain('Roles: !Ref');
            expect(textEdit?.newText).not.toContain('Roles: !GetAtt');
            // Non-array property should still work
            expect(textEdit?.newText).toContain('PolicyDocument: ""');
        });
    });
});
