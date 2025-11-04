import { CompletionItem, CompletionItemKind, CompletionParams } from 'vscode-languageserver';
import { Context } from '../context/Context';
import { PARAMETER_TYPES } from '../context/semantic/parameter/ParameterType';
import { LoggerFactory } from '../telemetry/LoggerFactory';
import { Measure } from '../telemetry/TelemetryDecorator';
import { getFuzzySearchFunction } from '../utils/FuzzySearchUtil';
import { CompletionProvider } from './CompletionProvider';
import { createCompletionItem } from './CompletionUtils';

export class ParameterTypeValueCompletionProvider implements CompletionProvider {
    private readonly log = LoggerFactory.getLogger(ParameterTypeValueCompletionProvider);
    private readonly fuzzySearch = getFuzzySearchFunction({
        keys: [{ name: 'label', weight: 1 }],
        threshold: 0.3,
        distance: 10,
        minMatchCharLength: 1,
        shouldSort: true,
        ignoreLocation: false,
    });

    @Measure({ name: 'getCompletions' })
    public getCompletions(context: Context, _: CompletionParams): CompletionItem[] | undefined {
        const items = this.getParameterTypesAsCompletionItems();

        if (context.text.length > 0) {
            return this.fuzzySearch(items, context.text);
        }

        return items;
    }

    private getParameterTypesAsCompletionItems(): CompletionItem[] {
        return PARAMETER_TYPES.map((type) => createCompletionItem(type, CompletionItemKind.Value));
    }
}
