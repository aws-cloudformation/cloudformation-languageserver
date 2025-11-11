import { CompletionItem, CompletionItemKind, CompletionParams, InsertTextFormat } from 'vscode-languageserver';
import { Context } from '../context/Context';
import { TopLevelSection, TopLevelSections, TopLevelSectionsWithLogicalIdsSet } from '../context/ContextType';
import { SyntaxTreeManager } from '../context/syntaxtree/SyntaxTreeManager';
import { DocumentType } from '../document/Document';
import { DocumentManager } from '../document/DocumentManager';
import { FeatureFlag } from '../featureFlag/FeatureFlagI';
import { LoggerFactory } from '../telemetry/LoggerFactory';
import { Measure } from '../telemetry/TelemetryDecorator';
import { getFuzzySearchFunction } from '../utils/FuzzySearchUtil';
import { applySnippetIndentation } from '../utils/IndentationUtils';
import { CompletionFormatter, ExtendedCompletionItem } from './CompletionFormatter';
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
${CompletionFormatter.getIndentPlaceholder(1)}"\${1:MyLogicalId}": {
${CompletionFormatter.getIndentPlaceholder(2)}"Type": "$2",
${CompletionFormatter.getIndentPlaceholder(2)}$3
${CompletionFormatter.getIndentPlaceholder(1)}}
}`,
            yaml: `Resources:
${CompletionFormatter.getIndentPlaceholder(1)}\${1:MyLogicalId}:
${CompletionFormatter.getIndentPlaceholder(2)}Type: $2
${CompletionFormatter.getIndentPlaceholder(2)}$3`,
        },
        [TopLevelSection.Parameters]: {
            json: `"Parameters": {
${CompletionFormatter.getIndentPlaceholder(1)}"\${1:ParameterName}": {
${CompletionFormatter.getIndentPlaceholder(2)}"Type": "$2"
${CompletionFormatter.getIndentPlaceholder(1)}}
}`,
            yaml: `Parameters:
${CompletionFormatter.getIndentPlaceholder(1)}\${1:ParameterName}:
${CompletionFormatter.getIndentPlaceholder(2)}Type: $2`,
        },
        [TopLevelSection.Outputs]: {
            json: `"Outputs": {
${CompletionFormatter.getIndentPlaceholder(1)}"\${1:OutputName}": {
${CompletionFormatter.getIndentPlaceholder(2)}"Value": $2
${CompletionFormatter.getIndentPlaceholder(1)}}
}`,
            yaml: `Outputs:
${CompletionFormatter.getIndentPlaceholder(1)}\${1:OutputName}:
${CompletionFormatter.getIndentPlaceholder(2)}Value: $2`,
        },
        [TopLevelSection.Conditions]: {
            json: `"Conditions": {
${CompletionFormatter.getIndentPlaceholder(1)}"\${1:ConditionName}": $2
}`,
            yaml: `Conditions:
${CompletionFormatter.getIndentPlaceholder(1)}\${1:ConditionName}: $2`,
        },
    };

    constructor(
        private readonly syntaxTreeManager: SyntaxTreeManager,
        private readonly documentManager: DocumentManager,
        private readonly constantsFeatureFlag: FeatureFlag,
    ) {}

    @Measure({ name: 'getCompletions' })
    getCompletions(context: Context, params: CompletionParams): CompletionItem[] | undefined {
        // Get both regular and snippet completions
        const stringCompletions = this.getTopLevelSectionCompletions();
        const snippetCompletions = this.getTopLevelSectionSnippetCompletions(context, params);

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
        return TopLevelSections.filter((section) => {
            if (section === String(TopLevelSection.Constants)) {
                return this.constantsFeatureFlag.isEnabled();
            }
            return true;
        }).map((section) => {
            const shouldBeObject = TopLevelSectionsWithLogicalIdsSet.has(section);

            const options = shouldBeObject
                ? {
                      data: { type: 'object' },
                  }
                : undefined;

            return createCompletionItem(section, CompletionItemKind.Class, options);
        });
    }

    private getTopLevelSectionSnippetCompletions(context: Context, params: CompletionParams): CompletionItem[] {
        const snippets: CompletionItem[] = [];

        // Add snippets for top level sections
        for (const [section] of Object.entries(this.sectionSnippets)) {
            if (section === String(TopLevelSection.Constants) && !this.constantsFeatureFlag.isEnabled()) {
                continue;
            }

            snippets.push(this.createSectionSnippet(section as TopLevelSection, context, params));
        }

        return snippets;
    }

    private createSectionSnippet(
        section: TopLevelSection,
        context: Context,
        params: CompletionParams,
    ): ExtendedCompletionItem {
        const snippetTemplate = this.sectionSnippets[section];

        if (!snippetTemplate) {
            throw new Error(`No snippet template defined for section: ${section}`);
        }

        let snippet = context.documentType === DocumentType.JSON ? snippetTemplate.json : snippetTemplate.yaml;

        const documentSpecificSettings = this.documentManager.getEditorSettingsForDocument(params.textDocument.uri);

        snippet = applySnippetIndentation(snippet, documentSpecificSettings, context.documentType);

        const completionItem: ExtendedCompletionItem = createCompletionItem(section, CompletionItemKind.File, {
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
