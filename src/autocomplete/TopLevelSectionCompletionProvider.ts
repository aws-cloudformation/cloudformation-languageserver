import { CompletionItem, CompletionItemKind, CompletionParams, InsertTextFormat } from 'vscode-languageserver';
import { Context } from '../context/Context';
import { TopLevelSection, TopLevelSections } from '../context/ContextType';
import { SyntaxTreeManager } from '../context/syntaxtree/SyntaxTreeManager';
import { DocumentType } from '../document/Document';
import { DocumentManager } from '../document/DocumentManager';
import { EditorSettings } from '../settings/Settings';
import { LoggerFactory } from '../telemetry/LoggerFactory';
import { getFuzzySearchFunction } from '../utils/FuzzySearchUtil';
import { applySnippetIndentation } from '../utils/IndentationUtils';
import { ExtendedCompletionItem } from './CompletionFormatter';
import { CompletionProvider } from './CompletionProvider';
import { createCompletionItem, handleSnippetJsonQuotes } from './CompletionUtils';

/**
 * Interface defining the structure of a snippet template
 */
interface SnippetTemplate {
    json: string;
    yaml: string;
}

/**
 * Type defining the mapping of section names to their snippet templates
 */
type SectionSnippetMap = {
    [key in TopLevelSection]?: SnippetTemplate;
};

export class TopLevelSectionCompletionProvider implements CompletionProvider {
    private readonly sectionKeywordFs = getFuzzySearchFunction();

    private readonly log = LoggerFactory.getLogger(TopLevelSectionCompletionProvider);

    /**
     * Snippet templates for different top-level sections
     */
    private readonly sectionSnippets: SectionSnippetMap = {
        [TopLevelSection.AWSTemplateFormatVersion]: {
            json: `"AWSTemplateFormatVersion": "2010-09-09"`,
            yaml: `AWSTemplateFormatVersion: '2010-09-09'`,
        },
        [TopLevelSection.Resources]: {
            json: `"Resources": {
{INDENT1}"\${1:MyLogicalId}": {
{INDENT2}"Type": "$2",
{INDENT2}$3
{INDENT1}}
}`,
            yaml: `Resources:
{INDENT1}\${1:MyLogicalId}:
{INDENT2}Type: $2
{INDENT2}$3`,
        },
        [TopLevelSection.Parameters]: {
            json: `"Parameters": {
{INDENT1}"\${1:ParameterName}": {
{INDENT2}"Type": "$2"
{INDENT1}}
}`,
            yaml: `Parameters:
{INDENT1}\${1:ParameterName}:
{INDENT2}Type: $2`,
        },
        [TopLevelSection.Outputs]: {
            json: `"Outputs": {
{INDENT1}"\${1:OutputName}": {
{INDENT2}"Value": $2
{INDENT1}}
}`,
            yaml: `Outputs:
{INDENT1}\${1:OutputName}:
{INDENT2}Value: $2`,
        },
        [TopLevelSection.Conditions]: {
            json: `"Conditions": {
{INDENT1}"\${1:ConditionName}": $2
}`,
            yaml: `Conditions:
{INDENT1}\${1:ConditionName}: $2`,
        },
    };

    constructor(
        private readonly syntaxTreeManager: SyntaxTreeManager,
        private readonly documentManager: DocumentManager,
    ) {}

    getCompletions(
        context: Context,
        params: CompletionParams,
        editorSettings: EditorSettings,
    ): CompletionItem[] | undefined {
        // Get both regular and snippet completions
        const stringCompletions = this.getTopLevelSectionCompletions();
        const snippetCompletions = this.getTopLevelSectionSnippetCompletions(context, params, editorSettings);

        // Combine both types of completions
        let completions = [...stringCompletions, ...snippetCompletions];

        const syntaxTree = this.syntaxTreeManager.getSyntaxTree(params.textDocument.uri);

        if (syntaxTree) {
            const definedSections = syntaxTree.topLevelSections();
            completions = completions.filter((item) => {
                const baseName = item.label as TopLevelSection;
                return !definedSections.includes(baseName);
            });
        }

        if (context.text?.length > 0) {
            return this.sectionKeywordFs(completions, context.text);
        }

        return completions;
    }

    private getTopLevelSectionCompletions(): CompletionItem[] {
        return TopLevelSections.map((section) => createCompletionItem(section, CompletionItemKind.Class));
    }

    private getTopLevelSectionSnippetCompletions(
        context: Context,
        params: CompletionParams,
        editorSettings: EditorSettings,
    ): CompletionItem[] {
        const snippets: CompletionItem[] = [];

        // Add snippets for top level sections
        for (const [section] of Object.entries(this.sectionSnippets)) {
            snippets.push(this.createSectionSnippet(section as TopLevelSection, context, params, editorSettings));
        }

        return snippets;
    }

    private createSectionSnippet(
        section: TopLevelSection,
        context: Context,
        params: CompletionParams,
        editorSettings: EditorSettings,
    ): ExtendedCompletionItem {
        const snippetTemplate = this.sectionSnippets[section];

        if (!snippetTemplate) {
            throw new Error(`No snippet template defined for section: ${section}`);
        }

        let snippet = context.documentType === DocumentType.JSON ? snippetTemplate.json : snippetTemplate.yaml;

        snippet = applySnippetIndentation(snippet, editorSettings, context.documentType);

        const completionItem: ExtendedCompletionItem = createCompletionItem(section, CompletionItemKind.Snippet, {
            insertText: snippet,
            data: { type: 'object' },
        });

        completionItem.insertTextFormat = InsertTextFormat.Snippet;
        completionItem.filterText = context.text;

        // Handle JSON quotes if needed
        if (context.documentType === DocumentType.JSON) {
            handleSnippetJsonQuotes(
                completionItem,
                context,
                params,
                this.documentManager,
                TopLevelSectionCompletionProvider.name,
            );
        }

        return completionItem;
    }
}
