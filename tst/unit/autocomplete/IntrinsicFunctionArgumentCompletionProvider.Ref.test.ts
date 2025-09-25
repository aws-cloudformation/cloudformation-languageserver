import { SyntaxNode } from 'tree-sitter';
import { stubInterface } from 'ts-sinon';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { CompletionParams, TextDocumentIdentifier } from 'vscode-languageserver';
import { IntrinsicFunctionArgumentCompletionProvider } from '../../../src/autocomplete/IntrinsicFunctionArgumentCompletionProvider';
import { IntrinsicFunction, TopLevelSection } from '../../../src/context/ContextType';
import { getEntityMap } from '../../../src/context/SectionContextBuilder';
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

describe('IntrinsicFunctionArgumentCompletionProvider - Ref Function', () => {
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

    describe('parameter completions', () => {
        it('should provide pseudo-parameters when no syntax tree is available', () => {
            const context = createMockContext('Resources', 'MyResource', { text: '' });
            Object.defineProperty(context, 'intrinsicContext', {
                value: createMockIntrinsicContext(IntrinsicFunction.Ref, ''),
            });

            mockSyntaxTreeManager.getSyntaxTree.returns({} as SyntaxTree);

            const result = provider.getCompletions(context, createTestParams());

            expect(result).toBeDefined();
            expect(Array.isArray(result)).toBe(true);
            expect(result!.length).toBeGreaterThan(0);

            // Should include pseudo parameters
            const pseudoParams = result!.filter((item) => item.detail === 'Pseudo Parameter');
            expect(pseudoParams.length).toBeGreaterThan(0);

            // Check for common pseudo parameters
            const labels = result!.map((item) => item.label);
            expect(labels).toContain('AWS::Region');
            expect(labels).toContain('AWS::AccountId');
        });

        it('should provide template parameters when syntax tree is available', () => {
            const context = createMockContext('Resources', 'MyResource', { text: '' });
            Object.defineProperty(context, 'intrinsicContext', {
                value: createMockIntrinsicContext(IntrinsicFunction.Ref, ''),
            });

            const mockParametersMap = new Map([
                [
                    'MyParam1',
                    {
                        entity: {
                            Type: 'String',
                            Description: 'Test parameter 1',
                        },
                    },
                ],
                [
                    'MyParam2',
                    {
                        entity: {
                            Type: 'Number',
                            Description: 'Test parameter 2',
                        },
                    },
                ],
            ]);

            const mockSyntaxTree = stubInterface<SyntaxTree>();
            mockSyntaxTree.findTopLevelSections.returns(new Map([[TopLevelSection.Parameters, {} as SyntaxNode]]));
            (mockSyntaxTree as any).type = DocumentType.YAML;
            mockSyntaxTreeManager.getSyntaxTree.returns(mockSyntaxTree);

            // Mock getEntityMap to return the parameters map
            (getEntityMap as any).mockReturnValue(mockParametersMap);

            const result = provider.getCompletions(context, createTestParams());

            expect(result).toBeDefined();
            expect(Array.isArray(result)).toBe(true);

            // Should include both pseudo and template parameters
            const templateParams = result!.filter((item) => item.detail?.includes('Parameter ('));
            expect(templateParams.length).toBe(2);

            const labels = result!.map((item) => item.label);
            expect(labels).toContain('MyParam1');
            expect(labels).toContain('MyParam2');
        });
    });

    describe('resource completions with proper section filtering', () => {
        it('should include resource completions in Resources section', () => {
            const context = createMockContext(TopLevelSection.Resources, 'MyResource', { text: '' });
            Object.defineProperty(context, 'intrinsicContext', {
                value: createMockIntrinsicContext(IntrinsicFunction.Ref, ''),
            });

            const mockResourcesMap = new Map([
                ['MyResource', { entity: { Type: 'AWS::S3::Bucket' } }],
                ['OtherResource', { entity: { Type: 'AWS::EC2::Instance' } }],
            ]);

            const mockSyntaxTree = stubInterface<SyntaxTree>();
            mockSyntaxTree.findTopLevelSections.returns(new Map([[TopLevelSection.Resources, {} as SyntaxNode]]));
            (mockSyntaxTree as any).type = DocumentType.YAML;
            mockSyntaxTreeManager.getSyntaxTree.returns(mockSyntaxTree);

            // Mock getEntityMap to return the resources map
            (getEntityMap as any).mockImplementation((syntaxTree: any, section: TopLevelSection) => {
                if (section === TopLevelSection.Resources) {
                    return mockResourcesMap;
                }
                return new Map();
            });

            const result = provider.getCompletions(context, createTestParams());

            expect(result).toBeDefined();
            const resourceCompletions = result!.filter((item) => item.detail?.includes('Resource ('));
            expect(resourceCompletions.length).toBe(1); // Should exclude current resource
            expect(resourceCompletions[0].label).toBe('OtherResource');
        });

        it('should not include resource completions in other sections', () => {
            const context = createMockContext(TopLevelSection.Parameters, 'MyParam', { text: '' });
            Object.defineProperty(context, 'intrinsicContext', {
                value: createMockIntrinsicContext(IntrinsicFunction.Ref, ''),
            });

            const mockSyntaxTree = stubInterface<SyntaxTree>();
            const entityMaps = new Map([
                [TopLevelSection.Resources, new Map([['MyResource', { entity: { Type: 'AWS::S3::Bucket' } }]])],
            ]);
            mockSyntaxTree.findTopLevelSections.callsFake((sections: TopLevelSection[]) => {
                const result = new Map();
                for (const section of sections) {
                    if (entityMaps.has(section)) {
                        result.set(section, entityMaps.get(section));
                    }
                }
                return result;
            });
            (mockSyntaxTree as any).type = DocumentType.YAML;
            mockSyntaxTreeManager.getSyntaxTree.returns(mockSyntaxTree);

            const result = provider.getCompletions(context, createTestParams());

            expect(result).toBeDefined();
            const resourceCompletions = result!.filter((item) => item.detail?.includes('Resource ('));
            expect(resourceCompletions.length).toBe(0);
        });

        it('should include resource completions in Outputs section', () => {
            const context = createMockContext(TopLevelSection.Outputs, 'MyOutput', { text: '' });
            Object.defineProperty(context, 'intrinsicContext', {
                value: createMockIntrinsicContext(IntrinsicFunction.Ref, ''),
            });

            const mockResourcesMap = new Map([
                ['MyResource', { entity: { Type: 'AWS::S3::Bucket' } }],
                ['OtherResource', { entity: { Type: 'AWS::EC2::Instance' } }],
            ]);

            const mockSyntaxTree = stubInterface<SyntaxTree>();
            mockSyntaxTree.findTopLevelSections.returns(new Map([[TopLevelSection.Resources, {} as SyntaxNode]]));
            (mockSyntaxTree as any).type = DocumentType.YAML;
            mockSyntaxTreeManager.getSyntaxTree.returns(mockSyntaxTree);

            // Mock getEntityMap to return the resources map
            (getEntityMap as any).mockImplementation((syntaxTree: any, section: TopLevelSection) => {
                if (section === TopLevelSection.Resources) {
                    return mockResourcesMap;
                }
                return new Map();
            });

            const result = provider.getCompletions(context, createTestParams());

            expect(result).toBeDefined();
            const resourceCompletions = result!.filter((item) => item.detail?.includes('Resource ('));
            expect(resourceCompletions.length).toBe(2); // Should include all resources in Outputs section
        });
    });

    describe('filtering and fuzzy search', () => {
        it('should filter completions based on context text', () => {
            const context = createMockContext('Resources', 'MyResource', { text: 'AWS' });
            Object.defineProperty(context, 'intrinsicContext', {
                value: createMockIntrinsicContext(IntrinsicFunction.Ref, 'AWS'),
            });

            mockSyntaxTreeManager.getSyntaxTree.returns({} as SyntaxTree);

            const result = provider.getCompletions(context, createTestParams());

            expect(result).toBeDefined();
            expect(Array.isArray(result)).toBe(true);

            // Should filter to only AWS pseudo parameters
            const labels = result!.map((item) => item.label);
            expect(labels.every((label) => label.includes('AWS'))).toBe(true);
        });

        it('should handle empty text by returning all available completions', () => {
            const context = createMockContext('Resources', 'MyResource', { text: '' });
            Object.defineProperty(context, 'intrinsicContext', {
                value: createMockIntrinsicContext(IntrinsicFunction.Ref, ''),
            });

            mockSyntaxTreeManager.getSyntaxTree.returns({} as SyntaxTree);

            const result = provider.getCompletions(context, createTestParams());

            expect(result).toBeDefined();
            expect(Array.isArray(result)).toBe(true);
            expect(result!.length).toBeGreaterThan(0);

            // Should include various pseudo parameters
            const labels = result!.map((item) => item.label);
            expect(labels).toContain('AWS::Region');
            expect(labels).toContain('AWS::AccountId');
            expect(labels).toContain('AWS::StackName');
        });
    });
});
