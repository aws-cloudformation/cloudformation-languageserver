import { SyntaxNode } from 'tree-sitter';
import { stubInterface } from 'ts-sinon';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { CompletionItemKind, CompletionParams, TextDocumentIdentifier } from 'vscode-languageserver';
import { IntrinsicFunctionArgumentCompletionProvider } from '../../../src/autocomplete/IntrinsicFunctionArgumentCompletionProvider';
import { IntrinsicFunction, PseudoParameter, TopLevelSection } from '../../../src/context/ContextType';
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

describe('IntrinsicFunctionArgumentCompletionProvider - FindInMap Pattern Filtering', () => {
    let provider: IntrinsicFunctionArgumentCompletionProvider;
    const mockSyntaxTreeManager = createMockSyntaxTreeManager();

    // create a combined schemas mock
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

    // some keys match AWS::Region pattern some don't
    const mockMappingDataWithMixedPatterns = {
        RegionMap: {
            'us-east-1': { AMI: 'ami-12345', InstanceType: 't3.micro' },
            'us-west-2': { AMI: 'ami-67890', InstanceType: 't3.small' },
            'eu-west-1': { AMI: 'ami-abcde', InstanceType: 't3.medium' },
            'donor-region': { Privilege: 'view' },
            'partition-leader': { Privilege: 'admin' },
        },
        AccountMap: {
            '123456789012': { Environment: 'prod', Owner: 'team-a' },
            '987654321098': { Environment: 'dev', Owner: 'team-b' },
            'default-account': { Environment: 'test', Owner: 'team-c' },
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

    describe('AWS::Region Pattern Filtering', () => {
        it('should filter second-level keys based on AWS::Region pattern when using !Ref AWS::Region', () => {
            setupMappingEntities(mockMappingDataWithMixedPatterns);

            const mockContext = createMockFindInMapContext('', [
                'RegionMap',
                { Ref: 'AWS::Region' },
                '',
            ]);

            const result = provider.getCompletions(mockContext, createTestParams());

            expect(result).toBeDefined();
            expect(result!.length).toBe(2);

            const labels = result!.map((item) => item.label);
            expect(labels).toContain('AMI');
            expect(labels).toContain('InstanceType');
            expect(labels).not.toContain('Privilege');

            for (const item of result!) {
                expect(item.kind).toBe(CompletionItemKind.EnumMember);
            }
        });

        it('should filter second-level keys based on AWS::Region pattern when using {"Ref": "AWS::Region"}', () => {
            setupMappingEntities(mockMappingDataWithMixedPatterns);

            const mockContext = createMockFindInMapContext('', [
                'RegionMap',
                { Ref: 'AWS::Region' },
                '',
            ]);

            const result = provider.getCompletions(mockContext, createTestParams());

            expect(result).toBeDefined();
            expect(result!.length).toBe(2);

            const labels = result!.map((item) => item.label);
            expect(labels).toContain('AMI');
            expect(labels).toContain('InstanceType');
            expect(labels).not.toContain('Privilege');
        });

        it('should filter second-level keys based on AWS::Region pattern when using {"!Ref": "AWS::Region"}', () => {
            setupMappingEntities(mockMappingDataWithMixedPatterns);

            const mockContext = createMockFindInMapContext('', [
                'RegionMap',
                { '!Ref': 'AWS::Region' },
                '',
            ]);

            const result = provider.getCompletions(mockContext, createTestParams());

            expect(result).toBeDefined();
            expect(result!.length).toBe(2);

            const labels = result!.map((item) => item.label);
            expect(labels).toContain('AMI');
            expect(labels).toContain('InstanceType');
            expect(labels).not.toContain('Privilege');
        });

        it('should filter second-level keys based on AWS::Region pattern when using {"Fn::Ref": "AWS::Region"} (JSON format)', () => {
            setupMappingEntities(mockMappingDataWithMixedPatterns);

            const mockContext = createMockFindInMapContext('', [
                'RegionMap',
                { 'Fn::Ref': 'AWS::Region' },
                '',
            ], DocumentType.JSON);

            const result = provider.getCompletions(mockContext, createTestParams());

            expect(result).toBeDefined();
            expect(result!.length).toBe(2);

            const labels = result!.map((item) => item.label);

            expect(labels).toContain('AMI');
            expect(labels).toContain('InstanceType');
            expect(labels).not.toContain('Privilege');
        });
    });

    describe('AWS::AccountId Pattern Filtering', () => {
        it('should filter second-level keys based on AWS::AccountId pattern when using !Ref AWS::AccountId', () => {
            setupMappingEntities(mockMappingDataWithMixedPatterns);

            const mockContext = createMockFindInMapContext('', [
                'AccountMap',
                { Ref: 'AWS::AccountId' },
                '',
            ]);

            const result = provider.getCompletions(mockContext, createTestParams());

            expect(result).toBeDefined();
            expect(result!.length).toBe(2);

            const labels = result!.map((item) => item.label);

            expect(labels).toContain('Environment');
            expect(labels).toContain('Owner');
  
            for (const item of result!) {
                expect(item.kind).toBe(CompletionItemKind.EnumMember);
            }
        });

        it('should filter second-level keys based on AWS::AccountId pattern when using {"Fn::Ref": "AWS::AccountId"} (JSON format)', () => {
            setupMappingEntities(mockMappingDataWithMixedPatterns);

            const mockContext = createMockFindInMapContext('', [
                'AccountMap',
                { 'Fn::Ref': 'AWS::AccountId' },
                '',
            ], DocumentType.JSON);

            const result = provider.getCompletions(mockContext, createTestParams());

            expect(result).toBeDefined();
            expect(result!.length).toBe(2);

            const labels = result!.map((item) => item.label);
            expect(labels).toContain('Environment');
            expect(labels).toContain('Owner');
        });
    });

    describe('Fallback Behavior', () => {
        it('should fallback to all keys when no top-level keys match the pattern', () => {
            const mappingWithNoRegions = {
                NonRegionMap: {
                    'custom-key-1': { Value: 'test1' },
                    'custom-key-2': { Value: 'test2' },
                },
            };
            setupMappingEntities(mappingWithNoRegions);

            const mockContext = createMockFindInMapContext('', [
                'NonRegionMap',
                { Ref: 'AWS::Region' },
                '',
            ]);

            const result = provider.getCompletions(mockContext, createTestParams());

            expect(result).toBeDefined();
            expect(result!.length).toBe(1);

            const labels = result!.map((item) => item.label);
            expect(labels).toContain('Value');
        });

        it('should fallback to all keys when using unknown pseudo-parameter', () => {
            setupMappingEntities(mockMappingDataWithMixedPatterns);

            const mockContext = createMockFindInMapContext('', [
                'RegionMap',
                { Ref: 'AWS::StackName' }, // not a pattern-supported pseudo-parameter
                '',
            ]);

            const result = provider.getCompletions(mockContext, createTestParams());

            expect(result).toBeDefined();
            expect(result!.length).toBe(3);

            const labels = result!.map((item) => item.label);
            expect(labels).toContain('AMI');
            expect(labels).toContain('InstanceType');
            expect(labels).toContain('Privilege');
        });

        it('should fallback to all keys when using non-pseudo-parameter reference', () => {
            setupMappingEntities(mockMappingDataWithMixedPatterns);

            const mockContext = createMockFindInMapContext('', [
                'RegionMap',
                { Ref: 'MyParameter' }, // not a pseudo-parameter
                '',
            ]);

            const result = provider.getCompletions(mockContext, createTestParams());

            expect(result).toBeDefined();
            expect(result!.length).toBe(3);

            const labels = result!.map((item) => item.label);
            expect(labels).toContain('AMI');
            expect(labels).toContain('InstanceType');
            expect(labels).toContain('Privilege');
        });
    });

    describe('Edge Cases', () => {
        it('should handle mapping with only pattern-matching keys', () => {
            const onlyRegionsMapping = {
                RegionOnlyMap: {
                    'us-east-1': { AMI: 'ami-12345' },
                    'us-west-2': { AMI: 'ami-67890' },
                    'eu-west-1': { AMI: 'ami-abcde' },
                },
            };
            setupMappingEntities(onlyRegionsMapping);

            const mockContext = createMockFindInMapContext('', [
                'RegionOnlyMap',
                { Ref: 'AWS::Region' },
                '',
            ]);

            const result = provider.getCompletions(mockContext, createTestParams());

            expect(result).toBeDefined();
            expect(result!.length).toBe(1);

            const labels = result!.map((item) => item.label);
            expect(labels).toContain('AMI');
        });

        it('should handle mapping with only non-pattern-matching keys', () => {
            const noRegionsMapping = {
                NoRegionsMap: {
                    'custom-key': { Value: 'test' },
                    'another-key': { Value: 'test2' },
                },
            };
            setupMappingEntities(noRegionsMapping);

            const mockContext = createMockFindInMapContext('', [
                'NoRegionsMap',
                { Ref: 'AWS::Region' },
                '',
            ]);

            const result = provider.getCompletions(mockContext, createTestParams());

            expect(result).toBeDefined();
            expect(result!.length).toBe(1);

            const labels = result!.map((item) => item.label);
            expect(labels).toContain('Value');
        });

        it('should handle empty mapping gracefully', () => {
            const emptyMapping = {
                EmptyMap: {},
            };
            setupMappingEntities(emptyMapping);

            const mockContext = createMockFindInMapContext('', [
                'EmptyMap',
                { Ref: 'AWS::Region' },
                '',
            ]);

            const result = provider.getCompletions(mockContext, createTestParams());

            expect(result).toBeUndefined();
        });

        it('should maintain fuzzy search functionality with pattern filtering', () => {
            setupMappingEntities(mockMappingDataWithMixedPatterns);

            const mockContext = createMockFindInMapContext('AMI', [
                'RegionMap',
                { Ref: 'AWS::Region' },
                'AMI',
            ]);

            const result = provider.getCompletions(mockContext, createTestParams());

            expect(result).toBeDefined();
            expect(result!.length).toBe(1);

            const labels = result!.map((item) => item.label);
            expect(labels).toContain('AMI');
            expect(labels).not.toContain('InstanceType');
            expect(labels).not.toContain('Privilege');
        });
    });

    describe('Static String Keys (Existing Behavior)', () => {
        it('should continue to work with static string keys without pattern filtering', () => {
            setupMappingEntities(mockMappingDataWithMixedPatterns);

            const mockContext = createMockFindInMapContext('', [
                'RegionMap',
                'donor-region', // static string key
                '',
            ]);

            const result = provider.getCompletions(mockContext, createTestParams());

            expect(result).toBeDefined();
            expect(result!.length).toBe(1);

            const labels = result!.map((item) => item.label);
            expect(labels).toContain('Privilege');
            expect(labels).not.toContain('AMI');
            expect(labels).not.toContain('InstanceType');
        });
    });
});
