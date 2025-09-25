import { SyntaxNode } from 'tree-sitter';
import { stubInterface } from 'ts-sinon';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { CompletionItemKind, CompletionParams, TextDocumentIdentifier } from 'vscode-languageserver';
import { IntrinsicFunctionArgumentCompletionProvider } from '../../../src/autocomplete/IntrinsicFunctionArgumentCompletionProvider';
import { IntrinsicFunction, TopLevelSection } from '../../../src/context/ContextType';
import { getEntityMap } from '../../../src/context/SectionContextBuilder';
import { SyntaxTree } from '../../../src/context/syntaxtree/SyntaxTree';
import { DocumentType } from '../../../src/document/Document';
import { CombinedSchemas } from '../../../src/schema/CombinedSchemas';
import { ResourceSchema } from '../../../src/schema/ResourceSchema';
import { createMockContext, createMappingContext } from '../../utils/MockContext';
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

describe('IntrinsicFunctionArgumentCompletionProvider - FindInMap Function', () => {
    let provider: IntrinsicFunctionArgumentCompletionProvider;
    const mockSyntaxTreeManager = createMockSyntaxTreeManager();

    // Create a proper CombinedSchemas mock
    const mockSchemas = new Map([
        [
            'AWS::S3::Bucket',
            {
                readOnlyProperties: ['/properties/Arn', '/properties/DomainName'],
            } as ResourceSchema,
        ],
    ]);
    const mockCombinedSchemas = new CombinedSchemas();
    (mockCombinedSchemas as any).schemas = mockSchemas;

    const mockSchemaRetriever = createMockSchemaRetriever(mockCombinedSchemas);
    const mockDocumentManager = createMockDocumentManager();

    // Mock mapping data for comprehensive testing
    const mockMappingData = {
        RegionMap: {
            'us-east-1': { AMI: 'ami-12345', InstanceType: 't2.micro' },
            'us-west-2': { AMI: 'ami-67890', InstanceType: 't2.small' },
            'eu-west-1': { AMI: 'ami-abcde', InstanceType: 't2.medium' },
        },
        EnvironmentMap: {
            Production: { DBSize: 'db.t3.large', BackupRetention: 30 },
            Development: { DBSize: 'db.t3.micro', BackupRetention: 7 },
            Staging: { DBSize: 'db.t3.small', BackupRetention: 14 },
        },
        InstanceTypeMap: {
            Small: { Type: 't2.micro', Storage: '20GB' },
            Medium: { Type: 't2.small', Storage: '50GB' },
            Large: { Type: 't2.medium', Storage: '100GB' },
        },
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

    // Helper function to create mock FindInMap intrinsic context
    function createMockFindInMapContext(text: string, args: unknown[] | string = [], documentType = DocumentType.YAML) {
        const mockContext = createMockContext('Unknown', undefined, {
            text,
            type: documentType,
        });

        Object.defineProperty(mockContext, 'intrinsicContext', {
            value: createMockIntrinsicContext(IntrinsicFunction.FindInMap, args),
        });

        return mockContext;
    }

    // Helper function to setup mapping entities
    function setupMappingEntities(mappingData: Record<string, Record<string, Record<string, any>>>) {
        const mockSectionNodeMap = new Map();
        mockSectionNodeMap.set(TopLevelSection.Mappings, {} as SyntaxNode);

        const mockSyntaxTree = stubInterface<SyntaxTree>();
        mockSyntaxTree.findTopLevelSections.returns(mockSectionNodeMap);
        (mockSyntaxTree as any).type = DocumentType.YAML;
        mockSyntaxTreeManager.getSyntaxTree.returns(mockSyntaxTree);

        const mockMappingsMap = new Map();
        for (const [mappingName, mappingValue] of Object.entries(mappingData)) {
            const mappingContext = createMappingContext(mappingName, {
                data: mappingValue,
            });
            mockMappingsMap.set(mappingName, mappingContext);
        }

        (getEntityMap as any).mockReturnValue(mockMappingsMap);
    }

    describe('Error Handling', () => {
        it('should return undefined when syntax tree is not found', () => {
            const mockContext = createMockFindInMapContext('RegionMap');
            mockSyntaxTreeManager.getSyntaxTree.returns(undefined);

            const result = provider.getCompletions(mockContext, createTestParams());
            expect(result).toBeUndefined();
        });

        it('should return undefined when no Mappings section found', () => {
            const mockContext = createMockFindInMapContext('RegionMap');
            const mockSyntaxTree = stubInterface<SyntaxTree>();
            mockSyntaxTree.findTopLevelSections.returns(new Map());
            (mockSyntaxTree as any).type = DocumentType.YAML;
            mockSyntaxTreeManager.getSyntaxTree.returns(mockSyntaxTree);

            const result = provider.getCompletions(mockContext, createTestParams());
            expect(result).toBeUndefined();
        });

        it('should return undefined when no mapping entities found', () => {
            const mockContext = createMockFindInMapContext('RegionMap');
            const mockSectionNodeMap = new Map();
            mockSectionNodeMap.set(TopLevelSection.Mappings, {} as SyntaxNode);

            const mockSyntaxTree = stubInterface<SyntaxTree>();
            mockSyntaxTree.findTopLevelSections.returns(mockSectionNodeMap);
            (mockSyntaxTree as any).type = DocumentType.YAML;
            mockSyntaxTreeManager.getSyntaxTree.returns(mockSyntaxTree);

            (getEntityMap as any).mockReturnValue(new Map());

            const result = provider.getCompletions(mockContext, createTestParams());
            expect(result).toBeUndefined();
        });
    });

    describe('Position 1: Mapping Name Completions', () => {
        it('should return all mapping names when text is empty', () => {
            setupMappingEntities(mockMappingData);

            const mockContext = createMockFindInMapContext('', []);

            const result = provider.getCompletions(mockContext, createTestParams());

            expect(result).toBeDefined();
            expect(result!.length).toBe(3);

            const labels = result!.map((item) => item.label);
            expect(labels).toContain('RegionMap');
            expect(labels).toContain('EnvironmentMap');
            expect(labels).toContain('InstanceTypeMap');

            for (const item of result!) {
                expect(item.kind).toBe(CompletionItemKind.EnumMember);
                expect(mockMappingData).toHaveProperty(item.label);
            }
        });

        it('should return filtered mapping names with fuzzy search', () => {
            setupMappingEntities(mockMappingData);
            const mockContext = createMockFindInMapContext('Region', ['']);

            const result = provider.getCompletions(mockContext, createTestParams());

            expect(result).toBeDefined();
            expect(result!.length).toBeGreaterThan(0);

            const labels = result!.map((item) => item.label);
            expect(labels).toContain('RegionMap');

            for (const item of result!) {
                expect(item.kind).toBe(CompletionItemKind.EnumMember);
            }
        });

        it('should return filtered mapping names for partial match', () => {
            setupMappingEntities(mockMappingData);
            const mockContext = createMockFindInMapContext('Env', ['']);

            const result = provider.getCompletions(mockContext, createTestParams());

            expect(result).toBeDefined();
            expect(result!.length).toBeGreaterThan(0);

            const labels = result!.map((item) => item.label);
            expect(labels).toContain('EnvironmentMap');
        });

        it('should return empty array when no mappings match', () => {
            setupMappingEntities(mockMappingData);
            const mockContext = createMockFindInMapContext('XYZ123', ['']);

            const result = provider.getCompletions(mockContext, createTestParams());

            expect(result).toBeDefined();
            expect(result!.length).toBe(0);
        });
    });

    describe('Position 2: Top-Level Key Completions', () => {
        it('should return top-level keys for valid mapping name', () => {
            setupMappingEntities(mockMappingData);

            const mockContext = createMockFindInMapContext('', ['RegionMap', '']);

            const result = provider.getCompletions(mockContext, createTestParams());

            expect(result).toBeDefined();
            expect(result!.length).toBe(3);

            const labels = result!.map((item) => item.label);
            expect(labels).toContain('us-east-1');
            expect(labels).toContain('us-west-2');
            expect(labels).toContain('eu-west-1');

            for (const item of result!) {
                expect(item.kind).toBe(CompletionItemKind.EnumMember);
            }
        });

        it('should return filtered top-level keys with fuzzy search', () => {
            setupMappingEntities(mockMappingData);
            const mockContext = createMockFindInMapContext('us', ['RegionMap', 'us']);

            const result = provider.getCompletions(mockContext, createTestParams());

            expect(result).toBeDefined();
            expect(result!.length).toBe(2);

            const labels = result!.map((item) => item.label);
            expect(labels).toContain('us-east-1');
            expect(labels).toContain('us-west-2');
        });

        it('should return undefined for invalid mapping name', () => {
            setupMappingEntities(mockMappingData);

            const mockContext = createMockFindInMapContext('', ['NonExistentMapping', '']);

            const result = provider.getCompletions(mockContext, createTestParams());

            expect(result).toBeUndefined();
        });

        it('should return undefined when first arg is not a string', () => {
            setupMappingEntities(mockMappingData);

            const mockContext = createMockFindInMapContext('', [123, '']);

            const result = provider.getCompletions(mockContext, createTestParams());

            expect(result).toBeUndefined();
        });

        it('should return all keys when text is empty', () => {
            setupMappingEntities(mockMappingData);

            const mockContext = createMockFindInMapContext('', ['EnvironmentMap', '']);

            const result = provider.getCompletions(mockContext, createTestParams());

            expect(result).toBeDefined();
            expect(result!.length).toBe(3);

            const labels = result!.map((item) => item.label);
            expect(labels).toContain('Production');
            expect(labels).toContain('Development');
            expect(labels).toContain('Staging');
        });
    });

    describe('Position 3: Second-Level Key Completions', () => {
        it('should return second-level keys for valid mapping and top-level key', () => {
            setupMappingEntities(mockMappingData);

            const mockContext = createMockFindInMapContext('', ['RegionMap', 'us-east-1', '']);

            const result = provider.getCompletions(mockContext, createTestParams());

            expect(result).toBeDefined();
            expect(result!.length).toBe(2);

            const labels = result!.map((item) => item.label);
            expect(labels).toContain('AMI');
            expect(labels).toContain('InstanceType');

            for (const item of result!) {
                expect(item.kind).toBe(CompletionItemKind.EnumMember);
            }
        });

        it('should return filtered second-level keys with fuzzy search', () => {
            setupMappingEntities(mockMappingData);
            const mockContext = createMockFindInMapContext('AMI', ['RegionMap', 'us-east-1', 'AMI']);

            const result = provider.getCompletions(mockContext, createTestParams());

            expect(result).toBeDefined();
            expect(result!.length).toBe(1);

            const labels = result!.map((item) => item.label);
            expect(labels).toContain('AMI');
        });

        it('should return undefined for invalid mapping name', () => {
            setupMappingEntities(mockMappingData);
            const mockContext = createMockFindInMapContext('', ['NonExistentMapping', 'us-east-1']);

            const result = provider.getCompletions(mockContext, createTestParams());

            expect(result).toBeUndefined();
        });

        it('should return undefined for invalid top-level key', () => {
            setupMappingEntities(mockMappingData);

            const mockContext = createMockFindInMapContext('', ['RegionMap', 'NonExistentRegion', '']);

            const result = provider.getCompletions(mockContext, createTestParams());

            expect(result).toBeUndefined();
        });

        it('should return undefined when first arg is not a string', () => {
            setupMappingEntities(mockMappingData);
            const mockContext = createMockFindInMapContext('', [123, 'us-east-1']);

            const result = provider.getCompletions(mockContext, createTestParams());

            expect(result).toBeUndefined();
        });

        it('should return undefined when second arg is not a string', () => {
            setupMappingEntities(mockMappingData);

            const mockContext = createMockFindInMapContext('', ['RegionMap', 123, '']);

            const result = provider.getCompletions(mockContext, createTestParams());

            expect(result).toBeUndefined();
        });

        it('should return all second-level keys when text is empty', () => {
            setupMappingEntities(mockMappingData);

            const mockContext = createMockFindInMapContext('', ['EnvironmentMap', 'Production', '']);

            const result = provider.getCompletions(mockContext, createTestParams());

            expect(result).toBeDefined();
            expect(result!.length).toBe(2);

            const labels = result!.map((item) => item.label);
            expect(labels).toContain('DBSize');
            expect(labels).toContain('BackupRetention');
        });
    });

    describe('Position Determination', () => {
        it('should determine position 1 when args is not an array', () => {
            setupMappingEntities(mockMappingData);
            const mockContext = createMockFindInMapContext('Region', 'not-an-array' as any);

            const result = provider.getCompletions(mockContext, createTestParams());

            expect(result).toBeDefined();
            expect(result!.length).toBeGreaterThan(0);

            const labels = result!.map((item) => item.label);
            expect(labels).toContain('RegionMap');
        });

        it('should determine position based on text match in args', () => {
            setupMappingEntities(mockMappingData);

            const mockContext = createMockFindInMapContext('us-east-1', ['RegionMap', 'us-east-1', '']);

            const result = provider.getCompletions(mockContext, createTestParams());

            expect(result).toBeDefined();
            expect(result!.length).toBe(3); // Should return top-level keys

            const labels = result!.map((item) => item.label);
            expect(labels).toContain('us-east-1');
            expect(labels).toContain('us-west-2');
            expect(labels).toContain('eu-west-1');
        });

        it('should determine position based on args length when text is empty', () => {
            setupMappingEntities(mockMappingData);

            const mockContext = createMockFindInMapContext('', ['RegionMap', 'us-east-1', '']);

            const result = provider.getCompletions(mockContext, createTestParams());

            expect(result).toBeDefined();
            expect(result!.length).toBe(2); // Should return second-level keys (position 3)

            const labels = result!.map((item) => item.label);
            expect(labels).toContain('AMI');
            expect(labels).toContain('InstanceType');
        });

        it('should return undefined for position beyond 3', () => {
            setupMappingEntities(mockMappingData);
            const mockContext = createMockFindInMapContext('', ['RegionMap', 'us-east-1', 'AMI', 'extra-arg']);

            const result = provider.getCompletions(mockContext, createTestParams());

            expect(result).toBeUndefined();
        });
    });

    describe('Edge Cases', () => {
        it('should handle mapping with empty top-level keys', () => {
            const emptyMappingData = {
                EmptyMapping: {},
            };
            setupMappingEntities(emptyMappingData);

            const mockContext = createMockFindInMapContext('', ['EmptyMapping', '']);

            const result = provider.getCompletions(mockContext, createTestParams());

            expect(result).toBeUndefined();
        });

        it('should handle mapping with empty second-level keys', () => {
            const mappingWithEmptySecondLevel = {
                TestMapping: {
                    TopKey: {},
                },
            };
            setupMappingEntities(mappingWithEmptySecondLevel);

            const mockContext = createMockFindInMapContext('', ['TestMapping', 'TopKey', '']);

            const result = provider.getCompletions(mockContext, createTestParams());

            expect(result).toBeUndefined();
        });

        it('should work with JSON document type', () => {
            setupMappingEntities(mockMappingData);

            const mockContext = createMockFindInMapContext('Region', [''], DocumentType.JSON);

            const result = provider.getCompletions(mockContext, createTestParams());

            expect(result).toBeDefined();
            expect(result!.length).toBeGreaterThan(0);

            const labels = result!.map((item) => item.label);
            expect(labels).toContain('RegionMap');
        });

        it('should handle case-sensitive fuzzy search', () => {
            setupMappingEntities(mockMappingData);

            const mockContext = createMockFindInMapContext('production', ['EnvironmentMap', 'production']);

            const result = provider.getCompletions(mockContext, createTestParams());

            expect(result).toBeDefined();
            expect(result!.length).toBeGreaterThan(0);

            const labels = result!.map((item) => item.label);
            expect(labels).toContain('Production');
        });

        it('should handle special characters in mapping names', () => {
            const specialMappingData = {
                'Region-Map_v2': {
                    'us-east-1': { AMI: 'ami-12345' },
                },
            };
            setupMappingEntities(specialMappingData);

            const mockContext = createMockFindInMapContext('Region', ['']);

            const result = provider.getCompletions(mockContext, createTestParams());

            expect(result).toBeDefined();
            expect(result!.length).toBeGreaterThan(0);

            const labels = result!.map((item) => item.label);
            expect(labels).toContain('Region-Map_v2');
        });
    });
});
