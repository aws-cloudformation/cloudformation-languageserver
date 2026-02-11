import { CompletionItem, CompletionItemKind, CompletionParams, TextEdit } from 'vscode-languageserver';
import { Context } from '../context/Context';
import { SchemaRetriever } from '../schema/SchemaRetriever';
import { Measure } from '../telemetry/TelemetryDecorator';
import { getFuzzySearchFunction } from '../utils/FuzzySearchUtil';
import { CompletionProvider } from './CompletionProvider';
import { createCompletionItem, createReplacementRange } from './CompletionUtils';

export class ResourceTypeCompletionProvider implements CompletionProvider {
    private readonly fuzzySearch = getFuzzySearchFunction();

    constructor(private readonly schemaRetriever: SchemaRetriever) {}

    @Measure({ name: 'getCompletions' })
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

        return resourceTypes.map((resourceType) => createCompletionItem(
          resourceType,
          CompletionItemKind.Class,
          { data: { location: 'value', keyForValue: 'Type' } },
        ));
    }
}
