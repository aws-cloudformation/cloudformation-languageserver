import { describe, it, expect, beforeEach, vi } from 'vitest';
import { CompletionParams } from 'vscode-languageserver';
import { IntrinsicFunctionArgumentCompletionProvider } from '../../../src/autocomplete/IntrinsicFunctionArgumentCompletionProvider';
import { IntrinsicFunction } from '../../../src/context/ContextType';
import { SyntaxTree } from '../../../src/context/syntaxtree/SyntaxTree';
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

const createMockIntrinsicContextNotInside = () => ({
    inIntrinsic: () => false,
    intrinsicFunction: () => undefined,
    record: () => ({
        isInsideIntrinsic: false,
        intrinsicFunction: undefined,
    }),
});

const createMockIntrinsicContextNoFunction = () => ({
    inIntrinsic: () => true,
    intrinsicFunction: () => undefined,
    record: () => ({
        isInsideIntrinsic: true,
        intrinsicFunction: undefined,
    }),
});

describe('IntrinsicFunctionArgumentCompletionProvider - Core Functionality', () => {
    let provider: IntrinsicFunctionArgumentCompletionProvider;
    const mockSyntaxTreeManager = createMockSyntaxTreeManager();
    const mockConstantsFeatureFlag = { isEnabled: () => true, describe: () => 'Constants feature flag' };

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
            mockConstantsFeatureFlag,
        );
    });

    describe('Intrinsic Function Detection and Routing', () => {
        describe('should only handle contexts inside intrinsic functions', () => {
            it('should return undefined when not inside an intrinsic function', () => {
                const context = createMockContext('Resources', 'MyResource');
                Object.defineProperty(context, 'intrinsicContext', {
                    value: createMockIntrinsicContextNotInside(),
                });
                const params = {
                    textDocument: {
                        uri: 'file:///test.yaml',
                    },
                } as CompletionParams;

                const result = provider.getCompletions(context, params);

                expect(result).toBeUndefined();
            });

            it('should return undefined when intrinsic function is undefined', () => {
                const context = createMockContext('Resources', 'MyResource');
                Object.defineProperty(context, 'intrinsicContext', {
                    value: createMockIntrinsicContextNoFunction(),
                });
                const params = {
                    textDocument: {
                        uri: 'file:///test.yaml',
                    },
                } as CompletionParams;

                const result = provider.getCompletions(context, params);

                expect(result).toBeUndefined();
            });
        });

        describe('should route to different handler methods based on function type', () => {
            const createTestParams = (): CompletionParams => ({
                textDocument: { uri: 'test://test.yaml' },
                position: { line: 0, character: 0 },
            });

            it('should route to handleRefArguments for Ref function', () => {
                const context = createMockContext('Resources', 'MyResource', { text: '' });
                Object.defineProperty(context, 'intrinsicContext', {
                    value: createMockIntrinsicContext(IntrinsicFunction.Ref, 'MyParameter'),
                });

                mockSyntaxTreeManager.getSyntaxTree.returns({} as SyntaxTree);

                const result = provider.getCompletions(context, createTestParams());

                expect(result).toBeDefined();
                expect(Array.isArray(result)).toBe(true);
                // Should return pseudo parameters when no syntax tree
                expect(result!.length).toBeGreaterThan(0);
            });

            it('should route to handleSubArguments for Sub function', () => {
                const context = createMockContext('Resources', 'MyResource', { text: '' });
                Object.defineProperty(context, 'intrinsicContext', {
                    value: createMockIntrinsicContext(IntrinsicFunction.Sub, ['Hello ${MyParam}']),
                });

                mockSyntaxTreeManager.getSyntaxTree.returns({} as SyntaxTree);

                const result = provider.getCompletions(context, createTestParams());

                expect(result).toBeDefined();
                expect(Array.isArray(result)).toBe(true);
                // Should return pseudo parameters when no syntax tree
                expect(result!.length).toBeGreaterThan(0);
            });

            it('should route to handleFindInMapArguments for FindInMap function', () => {
                const context = createMockContext('Resources', 'MyResource', { text: 'MyMapping' });
                Object.defineProperty(context, 'intrinsicContext', {
                    value: createMockIntrinsicContext(IntrinsicFunction.FindInMap, ['MyMapping']),
                });

                mockSyntaxTreeManager.getSyntaxTree.returns({} as SyntaxTree);

                const result = provider.getCompletions(context, createTestParams());

                // Should return undefined when no syntax tree for FindInMap
                expect(result).toBeUndefined();
            });

            it('should route to handleGetAttArguments for GetAtt function', () => {
                const context = createMockContext('Resources', 'MyResource', { text: 'MyRes' });
                Object.defineProperty(context, 'intrinsicContext', {
                    value: createMockIntrinsicContext(IntrinsicFunction.GetAtt, ['MyRes']),
                });

                mockSyntaxTreeManager.getSyntaxTree.returns({} as SyntaxTree);

                const result = provider.getCompletions(context, createTestParams());

                // Should return undefined when no syntax tree for GetAtt
                expect(result).toBeUndefined();
            });
        });

        describe('should return undefined for unsupported function types', () => {
            const unsupportedFunctions = [
                IntrinsicFunction.Base64,
                IntrinsicFunction.Cidr,
                IntrinsicFunction.GetAZs,
                IntrinsicFunction.ImportValue,
                IntrinsicFunction.Join,
                IntrinsicFunction.Select,
                IntrinsicFunction.Split,
                IntrinsicFunction.Transform,
                IntrinsicFunction.Length,
                IntrinsicFunction.ToJsonString,
            ];

            for (const functionType of unsupportedFunctions) {
                it(`should return undefined for ${functionType}`, () => {
                    const context = createMockContext('Resources', 'MyResource');
                    Object.defineProperty(context, 'intrinsicContext', {
                        value: createMockIntrinsicContext(functionType, 'test'),
                    });
                    const params = {
                        textDocument: {
                            uri: 'file:///test.yaml',
                        },
                    } as CompletionParams;

                    const result = provider.getCompletions(context, params);

                    expect(result).toBeUndefined();
                });
            }
        });
    });

    describe('Provider Integration', () => {
        it('should be properly instantiated with required dependencies', () => {
            expect(provider).toBeDefined();
            expect(provider.getCompletions).toBeDefined();
        });

        it('should handle null or undefined context gracefully', () => {
            const params = {
                textDocument: {
                    uri: 'file:///test.yaml',
                },
            } as CompletionParams;

            // Test with null context - should return undefined
            const nullResult = provider.getCompletions(null as any, params);
            expect(nullResult).toBeUndefined();

            // Test with undefined context - should return undefined
            const undefinedResult = provider.getCompletions(undefined as any, params);
            expect(undefinedResult).toBeUndefined();
        });

        it('should handle malformed intrinsic context gracefully', () => {
            const context = createMockContext('Resources', 'MyResource');
            Object.defineProperty(context, 'intrinsicContext', {
                value: null,
            });
            const params = {
                textDocument: {
                    uri: 'file:///test.yaml',
                },
            } as CompletionParams;

            const result = provider.getCompletions(context, params);
            expect(result).toBeUndefined();
        });
    });
});
