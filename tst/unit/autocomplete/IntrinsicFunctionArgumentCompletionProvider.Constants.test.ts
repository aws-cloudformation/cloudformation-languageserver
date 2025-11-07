import { describe, it, expect, beforeEach, vi } from 'vitest';
import { CompletionItemKind, CompletionParams, TextDocumentIdentifier } from 'vscode-languageserver';
import { IntrinsicFunctionArgumentCompletionProvider } from '../../../src/autocomplete/IntrinsicFunctionArgumentCompletionProvider';
import { IntrinsicFunction, TopLevelSection } from '../../../src/context/ContextType';
import { getEntityMap } from '../../../src/context/SectionContextBuilder';
import { Constant } from '../../../src/context/semantic/Entity';
import { SyntaxTree } from '../../../src/context/syntaxtree/SyntaxTree';
import { CombinedSchemas } from '../../../src/schema/CombinedSchemas';
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
});

describe('IntrinsicFunctionArgumentCompletionProvider - Constants', () => {
    const mockSyntaxTreeManager = createMockSyntaxTreeManager();
    const mockCombinedSchemas = new CombinedSchemas();
    const mockSchemaRetriever = createMockSchemaRetriever(mockCombinedSchemas);
    const mockDocumentManager = createMockDocumentManager();

    const createTestParams = (): CompletionParams => ({
        textDocument: { uri: 'test://test.yaml' } as TextDocumentIdentifier,
        position: { line: 0, character: 0 },
    });

    const setupConstantsMap = () => {
        const constantsMap = new Map();

        // String constant
        const fooConstant = new Constant('foo', 'bar');
        const fooContext = createMockContext(TopLevelSection.Constants, 'foo', { text: '' });
        Object.defineProperty(fooContext, 'entity', { value: fooConstant, writable: false });
        constantsMap.set('foo', fooContext);

        // String constant with interpolation
        const subConstant = new Constant('sub', '${Const::foo}-abc-${AWS::AccountId}');
        const subContext = createMockContext(TopLevelSection.Constants, 'sub', { text: '' });
        Object.defineProperty(subContext, 'entity', { value: subConstant, writable: false });
        constantsMap.set('sub', subContext);

        // Object constant
        const objConstant = new Constant('obj', { TestObject: { A: 'b' } });
        const objContext = createMockContext(TopLevelSection.Constants, 'obj', { text: '' });
        Object.defineProperty(objContext, 'entity', { value: objConstant, writable: false });
        constantsMap.set('obj', objContext);

        return constantsMap;
    };

    describe('when feature flag is enabled', () => {
        let provider: IntrinsicFunctionArgumentCompletionProvider;
        const mockConstantsFeatureFlag = { isEnabled: () => true, describe: () => 'Constants feature flag' };

        beforeEach(() => {
            vi.clearAllMocks();
            mockSyntaxTreeManager.getSyntaxTree.returns({} as SyntaxTree);
            provider = new IntrinsicFunctionArgumentCompletionProvider(
                mockSyntaxTreeManager,
                mockSchemaRetriever,
                mockDocumentManager,
                mockConstantsFeatureFlag,
            );
        });

        describe('Ref function', () => {
            it('should include all Constants (string and object types)', () => {
                const constantsMap = setupConstantsMap();
                vi.mocked(getEntityMap).mockImplementation((tree, section) => {
                    if (section === TopLevelSection.Constants) return constantsMap;
                    return new Map();
                });

                const context = createMockContext('Resources', 'MyResource', { text: '' });
                Object.defineProperty(context, 'intrinsicContext', {
                    value: createMockIntrinsicContext(IntrinsicFunction.Ref, ''),
                });

                const result = provider.getCompletions(context, createTestParams());

                expect(result).toBeDefined();
                const constantItems = result!.filter((item) => item.label.startsWith('Const::'));

                expect(constantItems.length).toBe(3);
                expect(constantItems.find((item) => item.label === 'Const::foo')).toBeDefined();
                expect(constantItems.find((item) => item.label === 'Const::sub')).toBeDefined();
                expect(constantItems.find((item) => item.label === 'Const::obj')).toBeDefined();
            });

            it('should show Constants with correct CompletionItemKind', () => {
                const constantsMap = setupConstantsMap();
                vi.mocked(getEntityMap).mockImplementation((tree, section) => {
                    if (section === TopLevelSection.Constants) return constantsMap;
                    return new Map();
                });

                const context = createMockContext('Resources', 'MyResource', { text: '' });
                Object.defineProperty(context, 'intrinsicContext', {
                    value: createMockIntrinsicContext(IntrinsicFunction.Ref, ''),
                });

                const result = provider.getCompletions(context, createTestParams());

                const constantItems = result!.filter((item) => item.label.startsWith('Const::'));
                for (const item of constantItems) {
                    expect(item.kind).toBe(CompletionItemKind.Constant);
                    expect(item.detail).toBe('Constant');
                }
            });
        });

        describe('Sub function', () => {
            it('should include only string-type Constants', () => {
                const constantsMap = setupConstantsMap();
                vi.mocked(getEntityMap).mockImplementation((tree, section) => {
                    if (section === TopLevelSection.Constants) return constantsMap;
                    return new Map();
                });

                const context = createMockContext('Resources', 'MyResource', { text: '' });
                Object.defineProperty(context, 'intrinsicContext', {
                    value: createMockIntrinsicContext(IntrinsicFunction.Sub, ''),
                });

                const result = provider.getCompletions(context, createTestParams());

                expect(result).toBeDefined();
                const constantItems = result!.filter((item) => item.label.startsWith('Const::'));

                // Should only have string constants (foo and sub), not obj
                expect(constantItems.length).toBe(2);
                expect(constantItems.find((item) => item.label === 'Const::foo')).toBeDefined();
                expect(constantItems.find((item) => item.label === 'Const::sub')).toBeDefined();
                expect(constantItems.find((item) => item.label === 'Const::obj')).toBeUndefined();
            });

            it('should show string Constants with value preview in documentation', () => {
                const constantsMap = setupConstantsMap();
                vi.mocked(getEntityMap).mockImplementation((tree, section) => {
                    if (section === TopLevelSection.Constants) return constantsMap;
                    return new Map();
                });

                const context = createMockContext('Resources', 'MyResource', { text: '' });
                Object.defineProperty(context, 'intrinsicContext', {
                    value: createMockIntrinsicContext(IntrinsicFunction.Sub, ''),
                });

                const result = provider.getCompletions(context, createTestParams());

                const fooItem = result!.find((item) => item.label === 'Const::foo');
                expect(fooItem).toBeDefined();
                expect(fooItem!.documentation).toContain('Value: bar');
            });
        });
    });

    describe('when feature flag is disabled', () => {
        let provider: IntrinsicFunctionArgumentCompletionProvider;
        const mockConstantsFeatureFlag = { isEnabled: () => false, describe: () => 'Constants feature flag' };

        beforeEach(() => {
            vi.clearAllMocks();
            mockSyntaxTreeManager.getSyntaxTree.returns({} as SyntaxTree);
            provider = new IntrinsicFunctionArgumentCompletionProvider(
                mockSyntaxTreeManager,
                mockSchemaRetriever,
                mockDocumentManager,
                mockConstantsFeatureFlag,
            );
        });

        describe('Ref function', () => {
            it('should not include any Constants', () => {
                const constantsMap = setupConstantsMap();
                vi.mocked(getEntityMap).mockImplementation((tree, section) => {
                    if (section === TopLevelSection.Constants) return constantsMap;
                    return new Map();
                });

                const context = createMockContext('Resources', 'MyResource', { text: '' });
                Object.defineProperty(context, 'intrinsicContext', {
                    value: createMockIntrinsicContext(IntrinsicFunction.Ref, ''),
                });

                const result = provider.getCompletions(context, createTestParams());

                expect(result).toBeDefined();
                const constantItems = result!.filter((item) => item.label.startsWith('Const::'));

                expect(constantItems.length).toBe(0);
            });
        });

        describe('Sub function', () => {
            it('should not include any Constants', () => {
                const constantsMap = setupConstantsMap();
                vi.mocked(getEntityMap).mockImplementation((tree, section) => {
                    if (section === TopLevelSection.Constants) return constantsMap;
                    return new Map();
                });

                const context = createMockContext('Resources', 'MyResource', { text: '' });
                Object.defineProperty(context, 'intrinsicContext', {
                    value: createMockIntrinsicContext(IntrinsicFunction.Sub, ''),
                });

                const result = provider.getCompletions(context, createTestParams());

                expect(result).toBeDefined();
                const constantItems = result!.filter((item) => item.label.startsWith('Const::'));

                expect(constantItems.length).toBe(0);
            });
        });
    });
});
