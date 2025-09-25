import { beforeEach, describe, expect, test } from 'vitest';
import { CompletionItemKind, CompletionParams } from 'vscode-languageserver';
import { ParameterTypeValueCompletionProvider } from '../../../src/autocomplete/ParameterTypeValueCompletionProvider';
import { TopLevelSection } from '../../../src/context/ContextType';
import { PARAMETER_TYPES } from '../../../src/context/semantic/parameter/ParameterType';
import { ExtensionName } from '../../../src/utils/ExtensionConfig';
import { createMockContext } from '../../utils/MockContext';

describe('ParameterTypeValueCompletionProvider', () => {
    const provider = new ParameterTypeValueCompletionProvider();
    const mockParams: CompletionParams = {
        textDocument: { uri: 'file:///test.yaml' },
        position: { line: 0, character: 0 },
    };

    beforeEach(() => {
        // Clear the static cache to ensure test isolation
        (ParameterTypeValueCompletionProvider as any).cachedCompletionItems = undefined;
    });

    test('should return all parameter types when no text is typed', () => {
        const mockContext = createMockContext(TopLevelSection.Parameters, 'MyParam', { text: '' });
        const result = provider.getCompletions(mockContext, mockParams);

        expect(result).toBeDefined();
        expect(result?.length).toBe(PARAMETER_TYPES.length);

        // Check that all parameter types are included
        const labels = result?.map((item) => item.label);
        expect(labels).toContain('String');
        expect(labels).toContain('Number');
        expect(labels).toContain('CommaDelimitedList');
        expect(labels).toContain('AWS::EC2::VPC::Id');
    });

    test('should return filtered results with fuzzy search when text is typed', () => {
        const mockContext = createMockContext(TopLevelSection.Parameters, 'MyParam', { text: 'Str' });
        const result = provider.getCompletions(mockContext, mockParams);

        expect(result).toBeDefined();
        expect(result!.length).toBeGreaterThan(0);

        // Should include String
        const labels = result?.map((item) => item.label);
        expect(labels).toContain('String');
    });

    test('should return List types when searching for List', () => {
        const mockContext = createMockContext(TopLevelSection.Parameters, 'MyParam', { text: 'List' });
        const result = provider.getCompletions(mockContext, mockParams);

        expect(result).toBeDefined();
        expect(result!.length).toBeGreaterThan(0);

        // Should include List types
        const labels = result?.map((item) => item.label);
        expect(labels).toContain('List<String>');
        expect(labels).toContain('List<Number>');
    });

    test('should return AWS types when searching for AWS', () => {
        const mockContext = createMockContext(TopLevelSection.Parameters, 'MyParam', { text: 'AWS' });
        const result = provider.getCompletions(mockContext, mockParams);

        expect(result).toBeDefined();
        expect(result!.length).toBeGreaterThan(0);

        // All results should contain AWS
        if (result)
            for (const item of result) {
                expect(item.label).toContain('AWS');
            }
    });

    test('should set correct completion item properties', () => {
        const mockContext = createMockContext(TopLevelSection.Parameters, 'MyParam', { text: '' });
        const result = provider.getCompletions(mockContext, mockParams);

        expect(result).toBeDefined();

        const stringItem = result?.find((item) => item.label === 'String');
        expect(stringItem).toBeDefined();
        expect(stringItem?.kind).toBe(CompletionItemKind.Value);
        expect(stringItem?.detail).toBe(ExtensionName);
        expect(stringItem?.insertText).toBe('String');
        expect(stringItem?.filterText).toBe('String');
    });
});
