import { describe, expect, test, beforeEach, vi } from 'vitest';
import { CompletionItemKind, CompletionParams, InsertTextFormat } from 'vscode-languageserver';
import * as CompletionUtils from '../../../src/autocomplete/CompletionUtils';
import { TopLevelSectionCompletionProvider } from '../../../src/autocomplete/TopLevelSectionCompletionProvider';
import { TopLevelSection } from '../../../src/context/ContextType';
import { DocumentType } from '../../../src/document/Document';
import { ExtensionName } from '../../../src/utils/ExtensionConfig';
import { createTopLevelContext } from '../../utils/MockContext';
import { createMockComponents, createMockDocumentManager } from '../../utils/MockServerComponents';
import { createMockYamlSyntaxTree } from '../../utils/TestTree';

describe('TopLevelSectionCompletionProvider', () => {
    const mockComponents = createMockComponents();
    const mockDocumentManager = createMockDocumentManager();
    const provider = new TopLevelSectionCompletionProvider(
        mockComponents.syntaxTreeManager,
        mockDocumentManager,
        mockComponents.external.featureFlags,
    );
    const mockSyntaxTree = createMockYamlSyntaxTree();

    const mockParams: CompletionParams = {
        textDocument: { uri: 'file:///test.yaml' },
        position: { line: 0, character: 0 },
    };

    beforeEach(() => {
        mockComponents.syntaxTreeManager.getSyntaxTree.reset();
        mockSyntaxTree.topLevelSections.reset();
        mockComponents.syntaxTreeManager.getSyntaxTree.returns(mockSyntaxTree);

        mockComponents.external.featureFlags.get.returns({ isEnabled: () => true, describe: () => 'mock' });

        vi.restoreAllMocks();
    });

    test('should return fuzzy search results when context exists with matching text', () => {
        mockSyntaxTree.topLevelSections.returns([]);

        // Create a mock context with text that will match "Resources" in fuzzy search
        const mockContext = createTopLevelContext('Unknown', { text: 'Res' });

        const result = provider.getCompletions(mockContext, mockParams);

        expect(result).toBeDefined();
        // Since we're at top level, we should get sections
        expect(result!.length).toBeGreaterThan(0);

        // Resources should be in the results
        const resourcesItem = result!.find((item) => item.label === 'Resources');
        expect(resourcesItem).toBeDefined();
        expect(resourcesItem!.kind).toBe(CompletionItemKind.Class);
        expect(resourcesItem!.detail).toBe(ExtensionName);
    });

    test('should return all sections when context exists but current text is empty', () => {
        mockSyntaxTree.topLevelSections.returns([]);

        const mockContext = createTopLevelContext('Unknown', { text: '' });

        const result = provider.getCompletions(mockContext, mockParams);

        expect(result).toBeDefined();
        expect(result).toHaveLength(16); // All TopLevelSection enum values (11) + snippets (5)

        // Should return all regular sections
        const regularSections = result!.filter((item) => item.kind === CompletionItemKind.Class);
        expect(regularSections).toHaveLength(11);

        // Should return all snippet sections
        const snippetSections = result!.filter((item) => item.kind === CompletionItemKind.File);
        expect(snippetSections).toHaveLength(5);

        // Should return all sections without fuzzy search modifications
        for (const item of regularSections) {
            expect(item.kind).toBe(CompletionItemKind.Class);
            expect(item.detail).toBe(ExtensionName);
            expect(item.filterText).toBe(item.label); // Original filterText
        }
    });

    test('should return fuzzy search results for partial matches', () => {
        mockSyntaxTree.topLevelSections.returns([]);

        const mockContext = createTopLevelContext('Unknown', { text: 'Par' });

        const result = provider.getCompletions(mockContext, mockParams);

        expect(result).toBeDefined();
        expect(result!.length).toBeGreaterThan(0);

        // Should find Parameters as a match
        const parametersItem = result!.find((item) => item.label === 'Parameters');
        expect(parametersItem).toBeDefined();
        expect(parametersItem!.filterText).toBe('Parameters');
    });

    test('should handle context with whitespace-only text', () => {
        mockSyntaxTree.topLevelSections.returns([]);

        const mockContext = createTopLevelContext('Unknown', { text: '    ' });

        const result = provider.getCompletions(mockContext, mockParams);

        expect(result).toBeDefined();
        expect(result).toHaveLength(16); // Should return all sections (11) + snippets (5)
    });

    test('should return all top-level CloudFormation sections when text is empty', () => {
        mockSyntaxTree.topLevelSections.returns([]);

        const mockContext = createTopLevelContext('Unknown', { text: '' });

        const result = provider.getCompletions(mockContext, mockParams);

        expect(result).toBeDefined();

        const regularSections = result!.filter((item) => item.kind === CompletionItemKind.Class);
        expect(regularSections).toHaveLength(11); // All TopLevelSection enum values

        // Verify all top-level sections are present
        const expectedSections = Object.values(TopLevelSection);
        expect(regularSections).toHaveLength(expectedSections.length);

        for (const [index, item] of regularSections.entries()) {
            expect(item.label).toBe(expectedSections[index]);
            expect(item.kind).toBe(CompletionItemKind.Class);
            expect(item.detail).toBe(ExtensionName);
            // Providers return raw labels, formatting is handled by CompletionFormatAdapter
            expect(item.insertText).toBe(expectedSections[index]);
        }
    });

    test('should return raw labels for all sections without formatting', () => {
        mockSyntaxTree.topLevelSections.returns([]);

        const mockContext = createTopLevelContext('Unknown', { text: '' });

        const result = provider.getCompletions(mockContext, mockParams);

        // Check that all sections return raw labels without formatting
        for (const section of Object.values(TopLevelSection)) {
            const item = result!.find((item) => item.label === String(section));
            expect(item).toBeDefined();
            expect(item!.insertText).toBe(section);
            expect(item!.detail).toBe(ExtensionName);
            expect(item!.kind).toBe(CompletionItemKind.Class);
        }
    });

    test('should filter out already defined sections', () => {
        // Define some sections that are already in the document
        const definedSections = [TopLevelSection.Resources, TopLevelSection.Parameters];
        mockSyntaxTree.topLevelSections.returns(definedSections);

        const mockContext = createTopLevelContext('Unknown', { text: '' });

        const result = provider.getCompletions(mockContext, mockParams);

        // Verify that defined sections are filtered out
        expect(result).toBeDefined();

        const regularSections = result!.filter((item) => item.kind === CompletionItemKind.Class);
        expect(regularSections.length).toBe(Object.values(TopLevelSection).length - definedSections.length);

        // Check that defined sections are not in the result
        for (const definedSection of definedSections) {
            const item = result!.find((item) => item.label === String(definedSection));
            expect(item).toBeUndefined();
        }

        // Check that other sections are still in the result
        const otherSections = Object.values(TopLevelSection).filter((section) => !definedSections.includes(section));
        for (const section of otherSections) {
            const item = result!.find((item) => item.label === String(section));
            expect(item).toBeDefined();
        }
    });

    // New tests for the snippet feature
    describe('Snippet Completions', () => {
        test('should include snippet completions for top-level sections', () => {
            mockSyntaxTree.topLevelSections.returns([]);
            const mockContext = createTopLevelContext('Unknown', { text: '' });

            const result = provider.getCompletions(mockContext, mockParams);

            expect(result).toBeDefined();

            // Find snippet completions for Resources, Parameters, Outputs, and Conditions
            const resourcesSnippet = result!.find(
                (item) => item.label === 'Resources' && item.kind === CompletionItemKind.File,
            );
            const parametersSnippet = result!.find(
                (item) => item.label === 'Parameters' && item.kind === CompletionItemKind.File,
            );
            const outputsSnippet = result!.find(
                (item) => item.label === 'Outputs' && item.kind === CompletionItemKind.File,
            );
            const conditionsSnippet = result!.find(
                (item) => item.label === 'Conditions' && item.kind === CompletionItemKind.File,
            );

            // Verify that all snippet completions exist
            expect(resourcesSnippet).toBeDefined();
            expect(parametersSnippet).toBeDefined();
            expect(outputsSnippet).toBeDefined();
            expect(conditionsSnippet).toBeDefined();

            // Verify that they are all snippets
            expect(resourcesSnippet!.insertTextFormat).toBe(InsertTextFormat.Snippet);
            expect(parametersSnippet!.insertTextFormat).toBe(InsertTextFormat.Snippet);
            expect(outputsSnippet!.insertTextFormat).toBe(InsertTextFormat.Snippet);
            expect(conditionsSnippet!.insertTextFormat).toBe(InsertTextFormat.Snippet);
        });

        test('should create YAML snippets with descriptive placeholders', () => {
            mockSyntaxTree.topLevelSections.returns([]);
            const mockContext = createTopLevelContext('Unknown', {
                text: '',
                type: DocumentType.YAML,
            });

            const result = provider.getCompletions(mockContext, mockParams);

            // Find the Resources snippet
            const resourcesSnippet = result!.find(
                (item) => item.label === 'Resources' && item.kind === CompletionItemKind.File,
            );

            expect(resourcesSnippet).toBeDefined();
            expect(resourcesSnippet!.insertText).toMatch(/\$\{1:[^}]+\}:/);
            expect(resourcesSnippet!.insertText).toContain('Type: $2');
        });

        test('should create JSON snippets with descriptive placeholders', () => {
            mockSyntaxTree.topLevelSections.returns([]);
            const mockContext = createTopLevelContext('Unknown', {
                text: '',
                type: DocumentType.JSON,
            });

            mockDocumentManager.getLine.returns('');

            const result = provider.getCompletions(mockContext, mockParams);

            // Find the Resources snippet
            const resourcesSnippet = result!.find(
                (item) => item.label === 'Resources' && item.kind === CompletionItemKind.File,
            );

            expect(resourcesSnippet).toBeDefined();
            expect(resourcesSnippet!.insertText).toMatch(/"\$\{1:[^}]+\}": \{/);
            expect(resourcesSnippet!.insertText).toContain('"Type": "$2"');
        });

        test('should use handleSnippetJsonQuotes utility for JSON snippets', () => {
            // Spy on the handleSnippetJsonQuotes function
            const handleSnippetJsonQuotesSpy = vi.spyOn(CompletionUtils, 'handleSnippetJsonQuotes');

            mockSyntaxTree.topLevelSections.returns([]);
            const mockContext = createTopLevelContext('Unknown', {
                text: '',
                type: DocumentType.JSON,
            });

            mockDocumentManager.getLine.returns('');

            provider.getCompletions(mockContext, mockParams);

            // Verify that handleSnippetJsonQuotes was called for each snippet
            expect(handleSnippetJsonQuotesSpy).toHaveBeenCalled();

            // Count the number of calls (should be called once for each snippet type)
            const snippetCount = Object.keys(provider['sectionSnippets']).length;
            expect(handleSnippetJsonQuotesSpy).toHaveBeenCalledTimes(snippetCount);
        });

        test('should not use handleSnippetJsonQuotes utility for YAML snippets', () => {
            // Spy on the handleSnippetJsonQuotes function
            const handleSnippetJsonQuotesSpy = vi.spyOn(CompletionUtils, 'handleSnippetJsonQuotes');

            mockSyntaxTree.topLevelSections.returns([]);
            const mockContext = createTopLevelContext('Unknown', {
                text: '',
                type: DocumentType.YAML,
            });

            provider.getCompletions(mockContext, mockParams);

            // Verify that handleSnippetJsonQuotes was not called
            expect(handleSnippetJsonQuotesSpy).not.toHaveBeenCalled();
        });

        test('should include descriptive placeholders for Parameters snippet', () => {
            mockSyntaxTree.topLevelSections.returns([]);
            const mockContext = createTopLevelContext('Unknown', { text: '' });

            const result = provider.getCompletions(mockContext, mockParams);

            // Find the Parameters snippet
            const parametersSnippet = result!.find(
                (item) => item.label === 'Parameters' && item.kind === CompletionItemKind.File,
            );

            expect(parametersSnippet).toBeDefined();
            expect(parametersSnippet!.insertText).toMatch(/\$\{1:[^}]+\}:/);
        });

        test('should include descriptive placeholders for Outputs snippet', () => {
            mockSyntaxTree.topLevelSections.returns([]);
            const mockContext = createTopLevelContext('Unknown', { text: '' });

            const result = provider.getCompletions(mockContext, mockParams);

            // Find the Outputs snippet
            const outputsSnippet = result!.find(
                (item) => item.label === 'Outputs' && item.kind === CompletionItemKind.File,
            );

            expect(outputsSnippet).toBeDefined();
            expect(outputsSnippet!.insertText).toMatch(/\$\{1:[^}]+\}:/);
        });

        test('should include descriptive placeholders for Conditions snippet', () => {
            mockSyntaxTree.topLevelSections.returns([]);
            const mockContext = createTopLevelContext('Unknown', { text: '' });

            const result = provider.getCompletions(mockContext, mockParams);

            // Find the Conditions snippet
            const conditionsSnippet = result!.find(
                (item) => item.label === 'Conditions' && item.kind === CompletionItemKind.File,
            );

            expect(conditionsSnippet).toBeDefined();
            expect(conditionsSnippet!.insertText).toMatch(/\$\{1:[^}]+\}:/);
        });

        test('should filter out snippet completions for already defined sections', () => {
            // Define some sections that are already in the document
            const definedSections = [TopLevelSection.Resources, TopLevelSection.Parameters];
            mockSyntaxTree.topLevelSections.returns(definedSections);

            const mockContext = createTopLevelContext('Unknown', { text: '' });

            const result = provider.getCompletions(mockContext, mockParams);

            // Verify that defined sections are filtered out from snippets
            const resourcesSnippet = result!.find(
                (item) => item.label === 'Resources' && item.kind === CompletionItemKind.File,
            );
            const parametersSnippet = result!.find(
                (item) => item.label === 'Parameters' && item.kind === CompletionItemKind.File,
            );

            expect(resourcesSnippet).toBeUndefined();
            expect(parametersSnippet).toBeUndefined();

            // But other snippets should still be there
            const outputsSnippet = result!.find(
                (item) => item.label === 'Outputs' && item.kind === CompletionItemKind.File,
            );
            const conditionsSnippet = result!.find(
                (item) => item.label === 'Conditions' && item.kind === CompletionItemKind.File,
            );

            expect(outputsSnippet).toBeDefined();
            expect(conditionsSnippet).toBeDefined();
        });

        describe('Snippet Indentation', () => {
            test('should use 2 spaces in YAML snippets when configured with tabSize 2', () => {
                mockDocumentManager.getEditorSettingsForDocument.returns({
                    tabSize: 2,
                    insertSpaces: true,
                    detectIndentation: false,
                });

                const testProvider = new TopLevelSectionCompletionProvider(
                    mockComponents.syntaxTreeManager,
                    mockDocumentManager,
                    mockComponents.external.featureFlags,
                );

                mockSyntaxTree.topLevelSections.returns([]);
                const mockContext = createTopLevelContext('Unknown', { text: '', type: DocumentType.YAML });

                const result = testProvider.getCompletions(mockContext, mockParams);

                const resourcesSnippet = result!.find(
                    (item) => item.label === 'Resources' && item.kind === CompletionItemKind.File,
                );

                expect(resourcesSnippet).toBeDefined();
                expect(resourcesSnippet!.insertText).toBe('Resources:\n  ${1:MyLogicalId}:\n    Type: $2\n    $3');
            });

            test('should use 4 spaces in YAML snippets when configured with tabSize 4', () => {
                mockDocumentManager.getEditorSettingsForDocument.returns({
                    tabSize: 4,
                    insertSpaces: true,
                    detectIndentation: false,
                });

                const testProvider = new TopLevelSectionCompletionProvider(
                    mockComponents.syntaxTreeManager,
                    mockDocumentManager,
                    mockComponents.external.featureFlags,
                );

                mockSyntaxTree.topLevelSections.returns([]);
                const mockContext = createTopLevelContext('Unknown', { text: '', type: DocumentType.YAML });

                const result = testProvider.getCompletions(mockContext, mockParams);

                const resourcesSnippet = result!.find(
                    (item) => item.label === 'Resources' && item.kind === CompletionItemKind.File,
                );

                expect(resourcesSnippet).toBeDefined();
                expect(resourcesSnippet!.insertText).toBe(
                    `Resources:\n${' '.repeat(4)}\${1:MyLogicalId}:\n${' '.repeat(8)}Type: $2\n${' '.repeat(8)}$3`,
                );
            });

            test('should use spaces for YAML even when insertSpaces is false', () => {
                mockDocumentManager.getEditorSettingsForDocument.returns({
                    tabSize: 3,
                    insertSpaces: false,
                    detectIndentation: false,
                });

                const testProvider = new TopLevelSectionCompletionProvider(
                    mockComponents.syntaxTreeManager,
                    mockDocumentManager,
                    mockComponents.external.featureFlags,
                );

                mockSyntaxTree.topLevelSections.returns([]);
                const mockContext = createTopLevelContext('Unknown', { text: '', type: DocumentType.YAML });

                const result = testProvider.getCompletions(mockContext, mockParams);

                const resourcesSnippet = result!.find(
                    (item) => item.label === 'Resources' && item.kind === CompletionItemKind.File,
                );

                expect(resourcesSnippet).toBeDefined();
                expect(resourcesSnippet!.insertText).toBe(
                    `Resources:\n${' '.repeat(3)}\${1:MyLogicalId}:\n${' '.repeat(6)}Type: $2\n${' '.repeat(6)}$3`,
                );
            });

            test('should use spaces in JSON snippets when insertSpaces is true', () => {
                mockDocumentManager.getEditorSettingsForDocument.returns({
                    tabSize: 4,
                    insertSpaces: true,
                    detectIndentation: false,
                });

                const testProvider = new TopLevelSectionCompletionProvider(
                    mockComponents.syntaxTreeManager,
                    mockDocumentManager,
                    mockComponents.external.featureFlags,
                );

                mockSyntaxTree.topLevelSections.returns([]);
                const mockContext = createTopLevelContext('Unknown', {
                    text: '',
                    type: DocumentType.JSON,
                });

                mockDocumentManager.getLine.returns('');

                const result = testProvider.getCompletions(mockContext, mockParams);

                const resourcesSnippet = result!.find(
                    (item) => item.label === 'Resources' && item.kind === CompletionItemKind.File,
                );

                expect(resourcesSnippet).toBeDefined();
                expect(resourcesSnippet!.insertText).toBe(
                    `"Resources": {\n${' '.repeat(4)}"\${1:MyLogicalId}": {\n${' '.repeat(8)}"Type": "$2",\n${' '.repeat(8)}$3\n${' '.repeat(4)}}\n}`,
                );
            });

            test('should use single tab in JSON snippets when insertSpaces is false', () => {
                mockDocumentManager.getEditorSettingsForDocument.returns({
                    tabSize: 4,
                    insertSpaces: false,
                    detectIndentation: false,
                });

                const testProvider = new TopLevelSectionCompletionProvider(
                    mockComponents.syntaxTreeManager,
                    mockDocumentManager,
                    mockComponents.external.featureFlags,
                );

                mockSyntaxTree.topLevelSections.returns([]);
                const mockContext = createTopLevelContext('Unknown', {
                    text: '',
                    type: DocumentType.JSON,
                });

                mockDocumentManager.getLine.returns('');

                const result = testProvider.getCompletions(mockContext, mockParams);

                const resourcesSnippet = result!.find(
                    (item) => item.label === 'Resources' && item.kind === CompletionItemKind.File,
                );

                expect(resourcesSnippet).toBeDefined();
                expect(resourcesSnippet!.insertText).toBe(
                    '"Resources": {\n\t"${1:MyLogicalId}": {\n\t\t"Type": "$2",\n\t\t$3\n\t}\n}',
                );
            });
        });
    });

    describe('TopLevelSection Feature Flag Tests', () => {
        test('should include Constants when feature flag is enabled', () => {
            mockComponents.external.featureFlags.get.returns({ isEnabled: () => true, describe: () => 'mock' });

            const testProvider = new TopLevelSectionCompletionProvider(
                mockComponents.syntaxTreeManager,
                mockDocumentManager,
                mockComponents.external.featureFlags,
            );

            mockSyntaxTree.topLevelSections.returns([]);
            const mockContext = createTopLevelContext('Unknown', { text: '' });

            const result = testProvider.getCompletions(mockContext, mockParams);

            expect(result).toBeDefined();

            // Should include Constants
            const regularSections = result!.filter((item) => item.kind === CompletionItemKind.Class);
            expect(regularSections).toHaveLength(11); // All 11 sections including Constants

            const constantsItem = regularSections.find((item) => item.label === 'Constants');
            expect(constantsItem).toBeDefined();
            expect(constantsItem!.label).toBe('Constants');
        });

        test('should exclude Constants when feature flag is disabled', () => {
            mockComponents.external.featureFlags.get.returns({ isEnabled: () => false, describe: () => 'mock' });

            mockSyntaxTree.topLevelSections.returns([]);
            const mockContext = createTopLevelContext('Unknown', { text: '' });

            const result = provider.getCompletions(mockContext, mockParams);

            expect(result).toBeDefined();

            // Should NOT include Constants
            const regularSections = result!.filter((item) => item.kind === CompletionItemKind.Class);
            expect(regularSections).toHaveLength(10); // 10 sections without Constants

            const constantsItem = regularSections.find((item) => item.label === 'Constants');
            expect(constantsItem).toBeUndefined();
        });
    });
});
