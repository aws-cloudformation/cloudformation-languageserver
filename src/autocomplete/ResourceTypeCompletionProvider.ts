import { CompletionItem, CompletionItemKind, CompletionParams, TextEdit } from 'vscode-languageserver';
import { Context } from '../context/Context';
import { TopLevelSection } from '../context/ContextType';
import { SyntaxTreeManager } from '../context/syntaxtree/SyntaxTreeManager';
import { SchemaRetriever } from '../schema/SchemaRetriever';
import { getFuzzySearchFunction } from '../utils/FuzzySearchUtil';
import { CompletionProvider } from './CompletionProvider';
import { createCompletionItem, createReplacementRange } from './CompletionUtils';

export class ResourceTypeCompletionProvider implements CompletionProvider {
    private readonly fuzzySearch = getFuzzySearchFunction();
    private static readonly SAM_TRANSFORM = 'AWS::Serverless-2016-10-31';

    constructor(
        private readonly schemaRetriever: SchemaRetriever,
        private readonly syntaxTreeManager: SyntaxTreeManager,
    ) {}

    getCompletions(context: Context, params: CompletionParams): CompletionItem[] | undefined {
        const resourceTypeCompletions = this.getResourceTypeCompletions(context, params);
        return this.fuzzySearch(resourceTypeCompletions, context.text);
    }

    private getResourceTypeCompletions(context?: Context, params?: CompletionParams): CompletionItem[] {
        const schemas = this.schemaRetriever.getDefault().schemas;
        let resourceTypes = [...schemas.keys()];

        // Filter out AWS::Serverless types if SAM transform is not present
        if (!params || !this.hasSamTransform(params)) {
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

    private hasSamTransform(params: CompletionParams): boolean {
        const syntaxTree = this.syntaxTreeManager.getSyntaxTree(params.textDocument.uri);
        if (!syntaxTree) return false;

        const transformSections = syntaxTree.findTopLevelSections([TopLevelSection.Transform]);
        if (!transformSections.has(TopLevelSection.Transform)) return false;

        const transformNode = transformSections.get(TopLevelSection.Transform);
        if (!transformNode) return false;
        const valueNode = transformNode.childForFieldName('value');
        if (!valueNode) return false;

        // eslint-disable-next-line unicorn/prefer-string-replace-all
        const transformValue = valueNode.text.replace(/['"]/g, '').trim();
        return transformValue === ResourceTypeCompletionProvider.SAM_TRANSFORM;
    }
}
