import { CompletionItem, CompletionItemKind, CompletionParams, TextEdit } from 'vscode-languageserver';
import { Context } from '../context/Context';
import { SchemaRetriever } from '../schema/SchemaRetriever';
import { getFuzzySearchFunction } from '../utils/FuzzySearchUtil';
import { CompletionProvider } from './CompletionProvider';
import { createCompletionItem, createReplacementRange } from './CompletionUtils';

export class ResourceTypeCompletionProvider implements CompletionProvider {
    private readonly fuzzySearch = getFuzzySearchFunction();

    constructor(private readonly schemaRetriever: SchemaRetriever) {}

    getCompletions(context: Context, _params: CompletionParams): CompletionItem[] | undefined {
        const resourceTypeCompletions = this.getResourceTypeCompletions(context);
        return this.fuzzySearch(resourceTypeCompletions, context.text);
    }

    private getResourceTypeCompletions(context: Context): CompletionItem[] {
        const schemas = this.schemaRetriever.getDefault().schemas;
        let resourceTypes = [...schemas.keys()];

        // Filter out AWS::Serverless types if SAM transform is not present
        if (!context.transformContext.hasSamTransform()) {
            resourceTypes = resourceTypes.filter((type) => !type.startsWith('AWS::Serverless::'));
        }

        return resourceTypes.map((resourceType) => {
            const item: CompletionItem = createCompletionItem(resourceType, CompletionItemKind.Class);

            // Add textEdit if we have context with position information
            if (context && context.text.length > 0) {
                const range = createReplacementRange(context);
                if (range) {
                    item.textEdit = TextEdit.replace(range, resourceType);
                    delete item.insertText;
                }
            }

            return item;
        });
    }
}
