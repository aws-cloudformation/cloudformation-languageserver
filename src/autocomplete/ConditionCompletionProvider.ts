import { CompletionItem, CompletionItemKind, CompletionParams } from 'vscode-languageserver';
import { IntrinsicShortForms, TopLevelSection } from '../context/CloudFormationEnums';
import { Context } from '../context/Context';
import { getEntityMap } from '../context/SectionContextBuilder';
import { SyntaxTreeManager } from '../context/syntaxtree/SyntaxTreeManager';
import { LoggerFactory } from '../telemetry/LoggerFactory';
import { Measure } from '../telemetry/TelemetryDecorator';
import { getFuzzySearchFunction } from '../utils/FuzzySearchUtil';
import { CompletionProvider } from './CompletionProvider';
import { createCompletionItem } from './CompletionUtils';

export class ConditionCompletionProvider implements CompletionProvider {
    private readonly log = LoggerFactory.getLogger(ConditionCompletionProvider);
    private readonly conditionFuzzySearch = getFuzzySearchFunction({
        keys: [{ name: 'label', weight: 1 }],
        threshold: 0.5,
        distance: 10,
        minMatchCharLength: 1,
        shouldSort: true,
        ignoreLocation: false,
    });

    public constructor(private readonly syntaxTreeManager: SyntaxTreeManager) {}

    @Measure({ name: 'getCompletions' })
    public getCompletions(context: Context, params: CompletionParams): CompletionItem[] | undefined {
        const syntaxTree = this.syntaxTreeManager.getSyntaxTree(params.textDocument.uri);
        if (!syntaxTree) {
            return;
        }

        const conditionMap = getEntityMap(syntaxTree, TopLevelSection.Conditions);
        if (!conditionMap || conditionMap.size === 0) {
            return undefined;
        }

        const conditionLogicalNameToOmit =
            context.section === TopLevelSection.Conditions && context.logicalId ? context.logicalId : '';
        const items = this.getConditionsAsCompletionItems(
            [...conditionMap.keys()].filter((k) => k !== conditionLogicalNameToOmit),
        );

        // Extract search text, handling !Condition prefix
        let searchText = context.text;
        if (searchText.startsWith(IntrinsicShortForms.Condition)) {
            searchText = searchText.slice(IntrinsicShortForms.Condition.length).trim();
        }

        if (searchText.length > 0) {
            return this.conditionFuzzySearch(items, searchText);
        }

        return items;
    }

    private getConditionsAsCompletionItems(keys: ReadonlyArray<string>): CompletionItem[] {
        return keys.map((k) => createCompletionItem(k, CompletionItemKind.Reference));
    }
}
