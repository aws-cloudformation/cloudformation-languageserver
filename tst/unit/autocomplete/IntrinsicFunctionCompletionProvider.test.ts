import { beforeEach, describe, expect, test, vi } from 'vitest';
import { CompletionItemKind, CompletionParams, CompletionTriggerKind } from 'vscode-languageserver';
import { IntrinsicFunctionCompletionProvider } from '../../../src/autocomplete/IntrinsicFunctionCompletionProvider';
import { Intrinsics } from '../../../src/context/ContextType';
import { DocumentType } from '../../../src/document/Document';
import { createMockContext } from '../../utils/MockContext';

// Mock the getEntityMap function
vi.mock('../../../src/context/SectionContextBuilder', () => ({
    getEntityMap: vi.fn(),
}));

describe('IntrinsicFunctionCompletionProvider', () => {
    const provider = new IntrinsicFunctionCompletionProvider();

    beforeEach(() => {
        vi.clearAllMocks();
    });

    test('should return all intrinsic functions for Fn: trigger', () => {
        // Create a context where the user has typed "Fn:"
        const mockContext = createMockContext('Unknown', undefined, {
            text: 'Fn:',
            type: DocumentType.YAML,
        });

        const mockParams: CompletionParams = {
            textDocument: { uri: 'file:///test.yaml' },
            position: { line: 0, character: 0 },
            context: { triggerCharacter: ':', triggerKind: CompletionTriggerKind.TriggerCharacter },
        };

        const completions = provider.getCompletions(mockContext, mockParams);

        // Verify completions
        expect(completions).toBeDefined();
        expect(completions!.length).toBeGreaterThan(0);

        // Check that we have all intrinsic functions
        const fnCount = Intrinsics.length - 1; // since 'Ref' will be ignored by fuzzy search
        expect(completions!.length).toBe(fnCount);

        // Check a specific function (Fn::And)
        const andFunction = completions!.find((item) => item.label === 'Fn::And');
        expect(andFunction).toBeDefined();
        expect(andFunction!.kind).toBe(CompletionItemKind.Function);
        expect(andFunction!.textEdit?.newText).toBe('And');

        // Check data properties
        expect(andFunction!.data.isIntrinsicFunction).toBe(true);
        expect(andFunction!.data.isFnColonTrigger).toBe(true);
    });

    test('should return YAML short form functions for ! trigger', () => {
        // Create a context where the user has typed "!"
        const mockContext = createMockContext('Unknown', undefined, {
            text: '',
            type: DocumentType.YAML,
        });

        const mockParams: CompletionParams = {
            textDocument: { uri: 'file:///test.yaml' },
            position: { line: 0, character: 0 },
            context: { triggerCharacter: '!', triggerKind: CompletionTriggerKind.TriggerCharacter },
        };

        const completions = provider.getCompletions(mockContext, mockParams);

        // Verify completions
        expect(completions).toBeDefined();
        expect(completions!.length).toBeGreaterThan(0);

        // Check a specific function (Fn::And becomes !And)
        const andFunction = completions!.find((item) => item.label === '!And');
        expect(andFunction).toBeDefined();
        expect(andFunction!.kind).toBe(CompletionItemKind.Function);
        expect(andFunction!.insertText).toBe('And');

        // Check data properties
        expect(andFunction!.data.isIntrinsicFunction).toBe(true);
        expect(andFunction!.data.isYamlShortForm).toBe(true);
    });

    test('should preserve ! character when user has typed !Ref', () => {
        // Create a context where the user has typed "!Ref"
        const mockContext = createMockContext('Unknown', undefined, {
            text: '!Ref',
            type: DocumentType.YAML,
        });

        const mockParams: CompletionParams = {
            textDocument: { uri: 'file:///test.yaml' },
            position: { line: 0, character: 0 },
        };

        const completions = provider.getCompletions(mockContext, mockParams);

        // Verify completions
        expect(completions).toBeDefined();
        expect(completions!.length).toBeGreaterThan(0);

        // Check that !Ref completion preserves the ! character
        const refFunction = completions!.find((item) => item.label === '!Ref');
        expect(refFunction).toBeDefined();
        expect(refFunction!.kind).toBe(CompletionItemKind.Function);

        // The textEdit should replace the entire "!Ref" with "!Ref" (preserving the !)
        if (refFunction!.textEdit && 'newText' in refFunction!.textEdit) {
            expect(refFunction!.textEdit.newText).toBe('!Ref');
        } else {
            expect(refFunction!.insertText).toBe('!Ref');
        }

        // Check data properties
        expect(refFunction!.data.isIntrinsicFunction).toBe(true);
        expect(refFunction!.data.isYamlShortForm).toBe(true);
    });

    test('should preserve ! character when user has typed !And', () => {
        // Create a context where the user has typed "!And"
        const mockContext = createMockContext('Unknown', undefined, {
            text: '!And',
            type: DocumentType.YAML,
        });

        const mockParams: CompletionParams = {
            textDocument: { uri: 'file:///test.yaml' },
            position: { line: 0, character: 0 },
        };

        const completions = provider.getCompletions(mockContext, mockParams);

        // Verify completions
        expect(completions).toBeDefined();
        expect(completions!.length).toBeGreaterThan(0);

        // Check that !And completion preserves the ! character
        const andFunction = completions!.find((item) => item.label === '!And');
        expect(andFunction).toBeDefined();
        expect(andFunction!.kind).toBe(CompletionItemKind.Function);

        // The textEdit should replace the entire "!And" with "!And" (preserving the !)
        if (andFunction!.textEdit && 'newText' in andFunction!.textEdit) {
            expect(andFunction!.textEdit.newText).toBe('!And');
        } else {
            expect(andFunction!.insertText).toBe('!And');
        }

        // Check data properties
        expect(andFunction!.data.isIntrinsicFunction).toBe(true);
        expect(andFunction!.data.isYamlShortForm).toBe(true);
    });

    test('should not return YAML short form in JSON documents', () => {
        // Create a context where the user has typed "!" in a JSON document
        const mockContext = createMockContext('Unknown', undefined, {
            text: '',
            type: DocumentType.JSON,
        });

        const mockParams: CompletionParams = {
            textDocument: { uri: 'file:///test.json' },
            position: { line: 0, character: 0 },
            context: { triggerCharacter: '!', triggerKind: CompletionTriggerKind.TriggerCharacter },
        };

        const completions = provider.getCompletions(mockContext, mockParams);

        // Verify completions
        expect(completions).toBeDefined();

        // Check that no functions have YAML short form
        const shortFormFunctions = completions!.filter((item) => item.data.isYamlShortForm);
        expect(shortFormFunctions.length).toBe(0);
    });

    test('should return fuzzy matched results for partial function name', () => {
        // Create a context where the user has typed a partial function name with Fn:: prefix
        const mockContext = createMockContext('Unknown', undefined, {
            text: 'Fn::Base',
            type: DocumentType.YAML,
        });

        const mockParams: CompletionParams = {
            textDocument: { uri: 'file:///test.yaml' },
            position: { line: 0, character: 0 },
        };

        const completions = provider.getCompletions(mockContext, mockParams);

        // Verify completions
        expect(completions).toBeDefined();
        expect(completions!.length).toBeGreaterThan(0);

        // Base64 should be in the results and should be first (best match)
        const base64Function = completions!.find((item) => item.label === 'Fn::Base64');
        expect(base64Function).toBeDefined();

        // Check that the fuzzy search properties are set
        expect(base64Function!.sortText).toBeDefined();
        expect(base64Function!.filterText).toBe('Fn::Base');
    });

    test('should return fuzzy matched results for typos in function name', () => {
        // Create a context where the user has typed a function name with typos
        const mockContext = createMockContext('Unknown', undefined, {
            text: 'Fn::Jion', // Typo for "Fn::Join"
            type: DocumentType.YAML,
        });

        const mockParams: CompletionParams = {
            textDocument: { uri: 'file:///test.yaml' },
            position: { line: 0, character: 0 },
        };

        const completions = provider.getCompletions(mockContext, mockParams);

        // Verify completions
        expect(completions).toBeDefined();
        expect(completions!.length).toBeGreaterThan(0);

        // Join should be in the results
        const joinFunction = completions!.find((item) => item.label === 'Fn::Join');
        expect(joinFunction).toBeDefined();
    });

    test('should return empty results when query is empty without trigger', () => {
        // Create a context with empty text and no trigger character
        const mockContext = createMockContext('Unknown', undefined, {
            text: '',
            type: DocumentType.YAML,
        });

        const mockParams: CompletionParams = {
            textDocument: { uri: 'file:///test.yaml' },
            position: { line: 0, character: 0 },
        };

        const completions = provider.getCompletions(mockContext, mockParams);

        // Verify completions
        expect(completions).toBeDefined();

        // Should return empty results since there's no trigger
        expect(completions!.length).toBe(0);
    });
});
