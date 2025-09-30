import { SyntaxNode } from 'tree-sitter';
import { stubInterface } from 'ts-sinon';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { CompletionParams, TextDocumentIdentifier } from 'vscode-languageserver';
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

describe('IntrinsicFunctionArgumentCompletionProvider - Sub Function', () => {
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
                value: createMockIntrinsicContext(IntrinsicFunction.Sub, ['Hello ${MyParam}']),
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
                value: createMockIntrinsicContext(IntrinsicFunction.Sub, ['Hello ${MyParam}']),
            });

            const mockParametersMap = new Map([
                [
                    'Environment',
                    {
                        entity: {
                            Type: 'String',
                            Description: 'Environment parameter',
                        },
                    },
                ],
                [
                    'InstanceType',
                    {
                        entity: {
                            Type: 'String',
                            Description: 'Instance type parameter',
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
            expect(labels).toContain('Environment');
            expect(labels).toContain('InstanceType');
        });
    });

    describe('resource completions with proper section filtering', () => {
        it('should include resource completions in Resources section', () => {
            const context = createMockContext(TopLevelSection.Resources, 'MyResource', { text: '' });
            Object.defineProperty(context, 'intrinsicContext', {
                value: createMockIntrinsicContext(IntrinsicFunction.Sub, ['Hello ${MyParam}']),
            });

            const mockResourcesMap = new Map([
                ['MyResource', { entity: { Type: 'AWS::S3::Bucket' } }],
                ['DatabaseInstance', { entity: { Type: 'AWS::RDS::DBInstance' } }],
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
            expect(resourceCompletions[0].label).toBe('DatabaseInstance');
        });

        it('should include GetAtt completions in Resources section', () => {
            const context = createMockContext(TopLevelSection.Resources, 'MyResource', { text: '' });
            Object.defineProperty(context, 'intrinsicContext', {
                value: createMockIntrinsicContext(IntrinsicFunction.Sub, ['Hello ${MyBucket.Arn}']),
            });

            const mockResourcesMap = new Map([
                ['MyResource', { entity: { Type: 'AWS::S3::Bucket', entityType: EntityType.Resource } }],
                ['MyBucket', { entity: { Type: 'AWS::S3::Bucket', entityType: EntityType.Resource } }],
            ]);

            const mockSyntaxTree = stubInterface<SyntaxTree>();
            mockSyntaxTree.findTopLevelSections.returns(new Map([[TopLevelSection.Resources, {} as SyntaxNode]]));
            (mockSyntaxTree as any).type = DocumentType.YAML;
            mockSyntaxTreeManager.getSyntaxTree.returns(mockSyntaxTree);

            (getEntityMap as any).mockImplementation((syntaxTree: any, section: TopLevelSection) => {
                if (section === TopLevelSection.Resources) {
                    return mockResourcesMap;
                }
                return new Map();
            });

            const result = provider.getCompletions(context, createTestParams());

            expect(result).toBeDefined();
            const getAttCompletions = result!.filter((item) => item.detail?.includes('GetAtt ('));
            expect(getAttCompletions.length).toBe(2); // MyBucket.Arn and MyBucket.DomainName

            const labels = result!.map((item) => item.label);
            expect(labels).toContain('MyBucket.Arn');
            expect(labels).toContain('MyBucket.DomainName');
        });

        it('should exclude current resource from GetAtt completions', () => {
            const context = createMockContext(TopLevelSection.Resources, 'MyBucket', { text: '' });
            Object.defineProperty(context, 'intrinsicContext', {
                value: createMockIntrinsicContext(IntrinsicFunction.Sub, ['Hello ${}']),
            });

            const mockResourcesMap = new Map([
                ['MyBucket', { entity: { Type: 'AWS::S3::Bucket', entityType: EntityType.Resource } }],
                ['OtherBucket', { entity: { Type: 'AWS::S3::Bucket', entityType: EntityType.Resource } }],
            ]);

            const mockSyntaxTree = stubInterface<SyntaxTree>();
            mockSyntaxTree.findTopLevelSections.returns(new Map([[TopLevelSection.Resources, {} as SyntaxNode]]));
            (mockSyntaxTree as any).type = DocumentType.YAML;
            mockSyntaxTreeManager.getSyntaxTree.returns(mockSyntaxTree);

            (getEntityMap as any).mockImplementation((syntaxTree: any, section: TopLevelSection) => {
                if (section === TopLevelSection.Resources) {
                    return mockResourcesMap;
                }
                return new Map();
            });

            const result = provider.getCompletions(context, createTestParams());

            expect(result).toBeDefined();
            const getAttCompletions = result!.filter((item) => item.detail?.includes('GetAtt ('));
            expect(getAttCompletions.length).toBe(2); // Only OtherBucket attributes

            const labels = result!.map((item) => item.label);
            expect(labels).toContain('OtherBucket.Arn');
            expect(labels).toContain('OtherBucket.DomainName');
            expect(labels).not.toContain('MyBucket.Arn');
        });
    });

    describe('substitution context detection', () => {
        it('should handle ${} parameter substitution context', () => {
            const context = createMockContext('Resources', 'MyResource', { text: 'Account' });
            Object.defineProperty(context, 'intrinsicContext', {
                value: createMockIntrinsicContext(IntrinsicFunction.Sub, ['Hello ${Account}']),
            });

            mockSyntaxTreeManager.getSyntaxTree.returns({} as SyntaxTree);

            const result = provider.getCompletions(context, createTestParams());

            expect(result).toBeDefined();
            expect(Array.isArray(result)).toBe(true);

            // Should filter based on the text 'Account' and find matching pseudo parameters
            const labels = result!.map((item) => item.label);
            expect(labels.length).toBeGreaterThan(0);
            // Should include AWS::AccountId which contains 'Account'
            expect(labels).toContain('AWS::AccountId');
        });

        it('should handle multi-line Sub templates', () => {
            const context = createMockContext('Resources', 'MyResource', { text: 'Region' });
            Object.defineProperty(context, 'intrinsicContext', {
                value: createMockIntrinsicContext(IntrinsicFunction.Sub, [
                    'Hello from ${AWS::Region} in ${Environment}',
                ]),
            });

            mockSyntaxTreeManager.getSyntaxTree.returns({} as SyntaxTree);

            const result = provider.getCompletions(context, createTestParams());

            expect(result).toBeDefined();
            expect(Array.isArray(result)).toBe(true);

            // Should include AWS::Region in results
            const labels = result!.map((item) => item.label);
            expect(labels).toContain('AWS::Region');
        });
    });

    describe('Sub function specific features', () => {
        it('should handle Sub with variable map (second argument)', () => {
            const context = createMockContext('Resources', 'MyResource', { text: '' });
            Object.defineProperty(context, 'intrinsicContext', {
                value: createMockIntrinsicContext(IntrinsicFunction.Sub, [
                    'Hello ${CustomVar}',
                    { CustomVar: 'SomeValue' },
                ]),
            });

            mockSyntaxTreeManager.getSyntaxTree.returns({} as SyntaxTree);

            const result = provider.getCompletions(context, createTestParams());

            expect(result).toBeDefined();
            expect(Array.isArray(result)).toBe(true);
            expect(result!.length).toBeGreaterThan(0);

            // Should still provide standard completions
            const labels = result!.map((item) => item.label);
            expect(labels).toContain('AWS::Region');
            expect(labels).toContain('AWS::AccountId');
        });

        it('should handle nested intrinsic functions in Sub', () => {
            const context = createMockContext('Resources', 'MyResource', { text: 'Stack' });
            Object.defineProperty(context, 'intrinsicContext', {
                value: createMockIntrinsicContext(IntrinsicFunction.Sub, ['Hello from ${AWS::StackName}']),
            });

            mockSyntaxTreeManager.getSyntaxTree.returns({} as SyntaxTree);

            const result = provider.getCompletions(context, createTestParams());

            expect(result).toBeDefined();
            expect(Array.isArray(result)).toBe(true);

            // Should filter to Stack-related completions
            const labels = result!.map((item) => item.label);
            expect(labels).toContain('AWS::StackName');
            expect(labels).toContain('AWS::StackId');
        });
    });
});
