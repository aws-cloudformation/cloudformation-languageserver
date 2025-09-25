import { SyntaxNode } from 'tree-sitter';
import { stubInterface } from 'ts-sinon';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { CompletionItemKind, CompletionParams, TextDocumentIdentifier } from 'vscode-languageserver';
import { IntrinsicFunctionArgumentCompletionProvider } from '../../../src/autocomplete/IntrinsicFunctionArgumentCompletionProvider';
import { IntrinsicFunction, TopLevelSection } from '../../../src/context/ContextType';
import { getEntityMap } from '../../../src/context/SectionContextBuilder';
import { EntityType } from '../../../src/context/semantic/SemanticTypes';
import { SyntaxTree } from '../../../src/context/syntaxtree/SyntaxTree';
import { DocumentType } from '../../../src/document/Document';
import { CombinedSchemas } from '../../../src/schema/CombinedSchemas';
import { ResourceSchema } from '../../../src/schema/ResourceSchema';
import { createMockContext } from '../../utils/MockContext';
import {
    createMockDocumentManager,
    createMockSchemaRetriever,
    createMockSyntaxTreeManager,
} from '../../utils/MockServerComponents';

// Mock the getEntityMap function
vi.mock('../../../src/context/SectionContextBuilder', () => ({
    getEntityMap: vi.fn(),
}));

const createMockIntrinsicContext = (functionType: IntrinsicFunction, args: unknown) => ({
    inIntrinsic: () => true,
    intrinsicFunction: () => ({
        type: functionType,
        args: args,
    }),
    record: () => ({
        isInsideIntrinsic: true,
        intrinsicFunction: {
            type: functionType,
            args: args,
        },
    }),
});

describe('IntrinsicFunctionArgumentCompletionProvider - GetAtt Function', () => {
    let provider: IntrinsicFunctionArgumentCompletionProvider;
    const mockSyntaxTreeManager = createMockSyntaxTreeManager();

    // Create a proper CombinedSchemas mock with S3 Bucket schema
    const mockSchemaJson = JSON.stringify({
        typeName: 'AWS::S3::Bucket',
        description: 'Mock S3 Bucket schema',
        additionalProperties: false,
        primaryIdentifier: ['/properties/BucketName'],
        properties: {},
        readOnlyProperties: [
            '/properties/Arn',
            '/properties/DomainName',
            '/properties/RegionalDomainName',
            '/properties/WebsiteURL',
            '/properties/MetadataTableConfiguration/S3TablesDestination/TableNamespace',
        ],
    });
    const mockSchema = new ResourceSchema(mockSchemaJson);

    const mockSchemas = new Map([['AWS::S3::Bucket', mockSchema]]);
    const mockCombinedSchemas = new CombinedSchemas();
    (mockCombinedSchemas as any).schemas = mockSchemas;

    const mockSchemaRetriever = createMockSchemaRetriever(mockCombinedSchemas);
    const mockDocumentManager = createMockDocumentManager();

    const mockResourceData = {
        MyVPC: { Type: 'AWS::EC2::VPC' },
        MyS3Bucket: { Type: 'AWS::S3::Bucket' },
        LambdaRole: { Type: 'AWS::IAM::Role' },
        DatabaseInstance: { Type: 'AWS::RDS::DBInstance' },
    };

    beforeEach(() => {
        vi.clearAllMocks();
        provider = new IntrinsicFunctionArgumentCompletionProvider(
            mockSyntaxTreeManager,
            mockSchemaRetriever,
            mockDocumentManager,
        );
    });

    const createTestParams = (): CompletionParams => ({
        textDocument: { uri: 'test://test.yaml' } as TextDocumentIdentifier,
        position: { line: 0, character: 0 },
    });

    // Helper function to create mock GetAtt intrinsic context
    function createMockGetAttContext(text: string, args: unknown[] | string = [], documentType = DocumentType.YAML) {
        const mockContext = createMockContext('Unknown', undefined, {
            text,
            type: documentType,
        });

        Object.defineProperty(mockContext, 'intrinsicContext', {
            value: createMockIntrinsicContext(IntrinsicFunction.GetAtt, args),
        });

        return mockContext;
    }

    // Helper function to setup resource entities
    function setupResourceEntities(resourceData: Record<string, any>) {
        const mockSectionNodeMap = new Map();
        mockSectionNodeMap.set(TopLevelSection.Resources, {} as SyntaxNode);

        const mockSyntaxTree = stubInterface<SyntaxTree>();
        mockSyntaxTree.findTopLevelSections.returns(mockSectionNodeMap);
        (mockSyntaxTree as any).type = DocumentType.YAML;
        mockSyntaxTreeManager.getSyntaxTree.returns(mockSyntaxTree);

        const mockResourcesMap = new Map();
        for (const [resourceName] of Object.entries(resourceData)) {
            const resourceContext = createMockContext('Resources', resourceName);
            mockResourcesMap.set(resourceName, resourceContext);
        }

        (getEntityMap as any).mockReturnValue(mockResourcesMap);
    }

    // Helper function to setup resource entities with schema
    function setupResourceEntitiesWithSchema(resourceData: Record<string, any>) {
        const mockSectionNodeMap = new Map();
        mockSectionNodeMap.set(TopLevelSection.Resources, {} as SyntaxNode);

        const mockSyntaxTree = stubInterface<SyntaxTree>();
        mockSyntaxTree.findTopLevelSections.returns(mockSectionNodeMap);
        (mockSyntaxTree as any).type = DocumentType.YAML;
        mockSyntaxTreeManager.getSyntaxTree.returns(mockSyntaxTree);

        const mockResourcesMap = new Map();
        for (const [resourceName, resourceInfo] of Object.entries(resourceData)) {
            const resourceContext = createMockContext('Resources', resourceName);
            // Mock the entity with the resource type
            Object.defineProperty(resourceContext, 'entity', {
                get: () => ({
                    entityType: EntityType.Resource,
                    Type: resourceInfo.Type,
                }),
                configurable: true,
            });
            mockResourcesMap.set(resourceName, resourceContext);
        }

        (getEntityMap as any).mockReturnValue(mockResourcesMap);
    }

    describe('JSON Array Format: { "Fn::GetAtt" : [ "logicalNameOfResource", "attributeName" ] }', () => {
        it('should return resource logical IDs for first position in array', () => {
            setupResourceEntities(mockResourceData);
            const mockContext = createMockGetAttContext('', [], DocumentType.JSON);

            const result = provider.getCompletions(mockContext, createTestParams());

            expect(result).toBeDefined();
            expect(result!.length).toBe(4);

            const labels = result!.map((item) => item.label);
            expect(labels).toContain('MyVPC');
            expect(labels).toContain('MyS3Bucket');
            expect(labels).toContain('LambdaRole');
            expect(labels).toContain('DatabaseInstance');

            for (const item of result!) {
                expect(item.kind).toBe(CompletionItemKind.Reference);
            }
        });

        it('should filter resources with fuzzy search', () => {
            setupResourceEntities(mockResourceData);
            const mockContext = createMockGetAttContext('Lambda', ['Lambda'], DocumentType.JSON);

            const result = provider.getCompletions(mockContext, createTestParams());

            expect(result).toBeDefined();
            expect(result!.length).toBeGreaterThan(0);

            const labels = result!.map((item) => item.label);
            expect(labels).toContain('LambdaRole');
        });
    });

    describe('YAML Array Format: Fn::GetAtt: [ logicalNameOfResource, attributeName ]', () => {
        it('should return resource logical IDs for first position in array', () => {
            setupResourceEntities(mockResourceData);
            const mockContext = createMockGetAttContext('', []);

            const result = provider.getCompletions(mockContext, createTestParams());

            expect(result).toBeDefined();
            expect(result!.length).toBe(4);

            const labels = result!.map((item) => item.label);
            expect(labels).toContain('MyVPC');
            expect(labels).toContain('MyS3Bucket');
            expect(labels).toContain('LambdaRole');
            expect(labels).toContain('DatabaseInstance');
        });

        it('should filter resources when typing partial name', () => {
            setupResourceEntities(mockResourceData);
            const mockContext = createMockGetAttContext('My', ['My']);

            const result = provider.getCompletions(mockContext, createTestParams());

            expect(result).toBeDefined();
            expect(result!.length).toBeGreaterThan(0);

            const labels = result!.map((item) => item.label);
            expect(labels).toContain('MyVPC');
            expect(labels).toContain('MyS3Bucket');
        });
    });

    describe('YAML String Format: !GetAtt logicalNameOfResource.attributeName', () => {
        it('should return resource logical IDs when typing resource name', () => {
            setupResourceEntities(mockResourceData);
            const mockContext = createMockGetAttContext('Database', 'Database');

            const result = provider.getCompletions(mockContext, createTestParams());

            expect(result).toBeDefined();
            expect(result!.length).toBeGreaterThan(0);

            const labels = result!.map((item) => item.label);
            expect(labels).toContain('DatabaseInstance');
        });

        it('should return resource logical IDs for complete resource name', () => {
            setupResourceEntities(mockResourceData);
            const mockContext = createMockGetAttContext('MyVPC', 'MyVPC');

            const result = provider.getCompletions(mockContext, createTestParams());

            expect(result).toBeDefined();
            expect(result!.length).toBeGreaterThan(0);

            const labels = result!.map((item) => item.label);
            expect(labels).toContain('MyVPC');
        });
    });

    describe('Resource Filtering', () => {
        it('should filter out current resource logical ID from completions', () => {
            setupResourceEntities(mockResourceData);

            // Create context as if we're inside the MyS3Bucket resource definition
            const mockContext = createMockGetAttContext('', []);
            // Mock the logicalId to simulate being inside MyS3Bucket resource
            Object.defineProperty(mockContext, 'logicalId', {
                get: () => 'MyS3Bucket',
                configurable: true,
            });

            const result = provider.getCompletions(mockContext, createTestParams());

            expect(result).toBeDefined();
            expect(result!.length).toBe(3); // Should exclude MyS3Bucket

            const labels = result!.map((item) => item.label);
            expect(labels).toContain('MyVPC');
            expect(labels).toContain('LambdaRole');
            expect(labels).toContain('DatabaseInstance');
            expect(labels).not.toContain('MyS3Bucket'); // Should be filtered out
        });

        it('should include current resource when logicalId is undefined', () => {
            setupResourceEntities(mockResourceData);

            const mockContext = createMockGetAttContext('', []);
            // Ensure logicalId is undefined (default behavior)
            Object.defineProperty(mockContext, 'logicalId', {
                get: () => undefined,
                configurable: true,
            });

            const result = provider.getCompletions(mockContext, createTestParams());

            expect(result).toBeDefined();
            expect(result!.length).toBe(4); // Should include all resources

            const labels = result!.map((item) => item.label);
            expect(labels).toContain('MyVPC');
            expect(labels).toContain('MyS3Bucket');
            expect(labels).toContain('LambdaRole');
            expect(labels).toContain('DatabaseInstance');
        });
    });

    describe('Invalid Arguments', () => {
        it('should return undefined for invalid argument types', () => {
            setupResourceEntities(mockResourceData);

            // Test with number (invalid)
            const mockContextNumber = createMockGetAttContext('', 123 as any);
            const resultNumber = provider.getCompletions(mockContextNumber, createTestParams());
            expect(resultNumber).toBeUndefined();

            // Test with object (invalid)
            const mockContextObject = createMockGetAttContext('', { invalid: 'object' } as any);
            const resultObject = provider.getCompletions(mockContextObject, createTestParams());
            expect(resultObject).toBeUndefined();

            // Test with null (invalid)
            const mockContextNull = createMockGetAttContext('', null as any);
            const resultNull = provider.getCompletions(mockContextNull, createTestParams());
            expect(resultNull).toBeUndefined();
        });
    });

    describe('Error Handling', () => {
        it('should return undefined when syntax tree is not found', () => {
            const mockContext = createMockGetAttContext('MyVPC');
            mockSyntaxTreeManager.getSyntaxTree.returns(undefined);

            const result = provider.getCompletions(mockContext, createTestParams());
            expect(result).toBeUndefined();
        });

        it('should return undefined when no Resources section found', () => {
            const mockContext = createMockGetAttContext('MyVPC');
            const mockSyntaxTree = stubInterface<SyntaxTree>();
            mockSyntaxTree.findTopLevelSections.returns(new Map());
            (mockSyntaxTree as any).type = DocumentType.YAML;
            mockSyntaxTreeManager.getSyntaxTree.returns(mockSyntaxTree);

            (getEntityMap as any).mockReturnValue(undefined);

            const result = provider.getCompletions(mockContext, createTestParams());
            expect(result).toBeUndefined();
        });

        it('should return undefined when no resource entities found', () => {
            const mockContext = createMockGetAttContext('MyVPC');
            const mockSectionNodeMap = new Map();
            mockSectionNodeMap.set(TopLevelSection.Resources, {} as SyntaxNode);

            const mockSyntaxTree = stubInterface<SyntaxTree>();
            mockSyntaxTree.findTopLevelSections.returns(mockSectionNodeMap);
            (mockSyntaxTree as any).type = DocumentType.YAML;
            mockSyntaxTreeManager.getSyntaxTree.returns(mockSyntaxTree);

            (getEntityMap as any).mockReturnValue(new Map());

            const result = provider.getCompletions(mockContext, createTestParams());
            expect(result).toBeUndefined();
        });
    });

    describe('Attribute Completions', () => {
        describe('String Format: !GetAtt Resource.Attribute', () => {
            it('should return attribute completions for string format with dot', () => {
                setupResourceEntitiesWithSchema({ MyS3Bucket: { Type: 'AWS::S3::Bucket' } });
                const mockContext = createMockGetAttContext('', 'MyS3Bucket.');

                const result = provider.getCompletions(mockContext, createTestParams());

                expect(result).toBeDefined();
                expect(result!.length).toBe(5);

                const labels = result!.map((item) => item.label);
                expect(labels).toContain('Arn');
                expect(labels).toContain('DomainName');
                expect(labels).toContain('RegionalDomainName');
                expect(labels).toContain('WebsiteURL');
                expect(labels).toContain('MetadataTableConfiguration.S3TablesDestination.TableNamespace');

                for (const item of result!) {
                    expect(item.kind).toBe(CompletionItemKind.Property);
                }
            });

            it('should filter attributes with fuzzy search in string format', () => {
                setupResourceEntitiesWithSchema({ MyS3Bucket: { Type: 'AWS::S3::Bucket' } });
                const mockContext = createMockGetAttContext('MyS3Bucket.Domain', 'MyS3Bucket.Domain');

                const result = provider.getCompletions(mockContext, createTestParams());

                expect(result).toBeDefined();
                expect(result!.length).toBeGreaterThan(0);

                const labels = result!.map((item) => item.label);
                expect(labels).toContain('DomainName');
                expect(labels.some((label) => label.includes('Domain'))).toBe(true);
            });

            it('should return resource completions for string format without dot', () => {
                setupResourceEntitiesWithSchema({ MyS3Bucket: { Type: 'AWS::S3::Bucket' } });
                const mockContext = createMockGetAttContext('MyS3', 'MyS3');

                const result = provider.getCompletions(mockContext, createTestParams());

                expect(result).toBeDefined();
                expect(result!.length).toBe(1);

                const labels = result!.map((item) => item.label);
                expect(labels).toContain('MyS3Bucket');

                for (const item of result!) {
                    expect(item.kind).toBe(CompletionItemKind.Reference);
                }
            });
        });

        describe('Array Format: [Resource, Attribute]', () => {
            it('should return attribute completions for second position in array', () => {
                setupResourceEntitiesWithSchema({ MyS3Bucket: { Type: 'AWS::S3::Bucket' } });
                const mockContext = createMockGetAttContext('', ['MyS3Bucket', '']);

                const result = provider.getCompletions(mockContext, createTestParams());

                expect(result).toBeDefined();
                expect(result!.length).toBe(5);

                const labels = result!.map((item) => item.label);
                expect(labels).toContain('Arn');
                expect(labels).toContain('DomainName');
                expect(labels).toContain('RegionalDomainName');
                expect(labels).toContain('WebsiteURL');

                for (const item of result!) {
                    expect(item.kind).toBe(CompletionItemKind.Property);
                }
            });

            it('should filter attributes with fuzzy search in array format', () => {
                setupResourceEntitiesWithSchema({ MyS3Bucket: { Type: 'AWS::S3::Bucket' } });
                const mockContext = createMockGetAttContext('Arn', ['MyS3Bucket', 'Arn']);

                const result = provider.getCompletions(mockContext, createTestParams());

                expect(result).toBeDefined();
                expect(result!.length).toBeGreaterThan(0);

                const labels = result!.map((item) => item.label);
                expect(labels).toContain('Arn');
            });
        });

        describe('Error Handling for Attributes', () => {
            it('should return undefined when resource not found', () => {
                setupResourceEntitiesWithSchema({ MyS3Bucket: { Type: 'AWS::S3::Bucket' } });
                const mockContext = createMockGetAttContext('', 'NonExistentResource.');

                const result = provider.getCompletions(mockContext, createTestParams());

                expect(result).toBeUndefined();
            });

            it('should return undefined when resource has no Type', () => {
                setupResourceEntitiesWithSchema({ MyS3Bucket: { Type: null } });
                const mockContext = createMockGetAttContext('', 'MyS3Bucket.');

                const result = provider.getCompletions(mockContext, createTestParams());

                expect(result).toBeUndefined();
            });

            it('should return undefined when schema not found', () => {
                setupResourceEntitiesWithSchema({ MyS3Bucket: { Type: 'AWS::S3::Bucket' } });

                // Mock schema retriever to return empty schemas
                const emptyCombinedSchemas = new CombinedSchemas();
                (emptyCombinedSchemas as any).schemas = new Map();
                const emptySchemaRetriever = createMockSchemaRetriever(emptyCombinedSchemas);

                provider = new IntrinsicFunctionArgumentCompletionProvider(
                    mockSyntaxTreeManager,
                    emptySchemaRetriever,
                    mockDocumentManager,
                );

                const mockContext = createMockGetAttContext('', 'MyS3Bucket.');

                const result = provider.getCompletions(mockContext, createTestParams());

                expect(result).toBeUndefined();
            });

            it('should return undefined when schema has no readOnlyProperties', () => {
                setupResourceEntitiesWithSchema({ MyS3Bucket: { Type: 'AWS::S3::Bucket' } });

                // Mock schema with no readOnlyProperties
                const emptySchemaJson = JSON.stringify({
                    typeName: 'AWS::S3::Bucket',
                    description: 'Mock S3 Bucket schema',
                    additionalProperties: false,
                    primaryIdentifier: ['/properties/BucketName'],
                    properties: {},
                    readOnlyProperties: [],
                });
                const emptySchema = new ResourceSchema(emptySchemaJson);

                const emptySchemas = new Map([['AWS::S3::Bucket', emptySchema]]);
                const emptyCombinedSchemas = new CombinedSchemas();
                (emptyCombinedSchemas as any).schemas = emptySchemas;
                const emptySchemaRetriever = createMockSchemaRetriever(emptyCombinedSchemas);

                provider = new IntrinsicFunctionArgumentCompletionProvider(
                    mockSyntaxTreeManager,
                    emptySchemaRetriever,
                    mockDocumentManager,
                );

                const mockContext = createMockGetAttContext('', 'MyS3Bucket.');

                const result = provider.getCompletions(mockContext, createTestParams());

                expect(result).toBeUndefined();
            });
        });

        describe('Property Path Parsing', () => {
            it('should extract full nested attribute paths from property paths', () => {
                setupResourceEntitiesWithSchema({ MyS3Bucket: { Type: 'AWS::S3::Bucket' } });
                const mockContext = createMockGetAttContext('', 'MyS3Bucket.');

                const result = provider.getCompletions(mockContext, createTestParams());

                expect(result).toBeDefined();

                const labels = result!.map((item) => item.label);
                // Should extract full nested path 'MetadataTableConfiguration.S3TablesDestination.TableNamespace' from '/properties/MetadataTableConfiguration/S3TablesDestination/TableNamespace'
                expect(labels).toContain('MetadataTableConfiguration.S3TablesDestination.TableNamespace');
                // Should not contain the path with forward slashes
                expect(labels).not.toContain('MetadataTableConfiguration/S3TablesDestination/TableNamespace');
            });

            it('should remove duplicate attribute names', () => {
                // Setup mock schema with duplicates
                const duplicateSchemaJson = JSON.stringify({
                    typeName: 'AWS::S3::Bucket',
                    description: 'Mock S3 Bucket schema',
                    additionalProperties: false,
                    primaryIdentifier: ['/properties/BucketName'],
                    properties: {},
                    readOnlyProperties: [
                        '/properties/Arn',
                        '/properties/Arn', // Duplicate
                        '/properties/DomainName',
                        '/properties/MetadataTableConfiguration/S3TablesDestination/TableNamespace',
                        '/properties/MetadataTableConfiguration/S3TablesDestination/TableArn', // Same top-level
                    ],
                });
                const duplicateSchema = new ResourceSchema(duplicateSchemaJson);

                const duplicateSchemas = new Map([['AWS::S3::Bucket', duplicateSchema]]);
                const duplicateCombinedSchemas = new CombinedSchemas();
                (duplicateCombinedSchemas as any).schemas = duplicateSchemas;
                const duplicateSchemaRetriever = createMockSchemaRetriever(duplicateCombinedSchemas);

                provider = new IntrinsicFunctionArgumentCompletionProvider(
                    mockSyntaxTreeManager,
                    duplicateSchemaRetriever,
                    mockDocumentManager,
                );

                setupResourceEntitiesWithSchema({ MyS3Bucket: { Type: 'AWS::S3::Bucket' } });

                const mockContext = createMockGetAttContext('', 'MyS3Bucket.');

                const result = provider.getCompletions(mockContext, createTestParams());

                expect(result).toBeDefined();
                expect(result!.length).toBe(4); // Arn, DomainName, and two nested MetadataTableConfiguration paths (no duplicates)

                const labels = result!.map((item) => item.label);
                expect(labels).toContain('Arn');
                expect(labels).toContain('DomainName');
                expect(labels).toContain('MetadataTableConfiguration.S3TablesDestination.TableNamespace');
                expect(labels).toContain('MetadataTableConfiguration.S3TablesDestination.TableArn');
            });
        });
    });
});
