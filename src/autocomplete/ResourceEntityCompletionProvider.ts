import { CompletionItem, CompletionItemKind, CompletionParams, InsertTextFormat } from 'vscode-languageserver';
import { Context } from '../context/Context';
import { Resource } from '../context/semantic/Entity';
import { DocumentType } from '../document/Document';
import { DocumentManager } from '../document/DocumentManager';
import { ResourceSchema } from '../schema/ResourceSchema';
import { SchemaRetriever } from '../schema/SchemaRetriever';
import { getFuzzySearchFunction } from '../utils/FuzzySearchUtil';
import { applySnippetIndentation } from '../utils/IndentationUtils';
import { CompletionFormatter, ExtendedCompletionItem } from './CompletionFormatter';
import { CompletionProvider } from './CompletionProvider';
import { createCompletionItem, handleSnippetJsonQuotes } from './CompletionUtils';
import { EntityFieldCompletionProvider } from './EntityFieldCompletionProvider';

export class ResourceEntityCompletionProvider implements CompletionProvider {
    private readonly fuzzySearch = getFuzzySearchFunction();
    private readonly entityFieldProvider: EntityFieldCompletionProvider<Resource>;

    constructor(
        private readonly schemaRetriever: SchemaRetriever,
        private readonly documentManager: DocumentManager,
    ) {
        this.entityFieldProvider = new EntityFieldCompletionProvider<Resource>();
    }

    getCompletions(context: Context, params: CompletionParams): CompletionItem[] | undefined {
        const entityCompletions = this.entityFieldProvider.getCompletions(context, params);

        // Enhance the "Properties" completion with a snippet
        if (entityCompletions) {
            const propertiesIndex = entityCompletions.findIndex((item) => item.label === 'Properties');

            if (propertiesIndex !== -1) {
                const resource = context.entity as Resource;
                if (resource.Type) {
                    const schema = this.schemaRetriever.getDefault().schemas.get(resource.Type);
                    if (schema) {
                        entityCompletions[propertiesIndex] = this.createPropertiesSnippetCompletion(
                            schema,
                            context,
                            params,
                        );
                    }
                }
            }
        }

        if (context.text.length > 0) {
            return this.fuzzySearch(entityCompletions, context.text);
        }
        return entityCompletions;
    }

    private createPropertiesSnippetCompletion(
        schema: ResourceSchema,
        context: Context,
        params: CompletionParams,
    ): ExtendedCompletionItem {
        const snippet = this.generateRequiredPropertiesSnippet(schema, context.documentType, params);

        const completionItem: ExtendedCompletionItem = createCompletionItem('Properties', CompletionItemKind.File, {
            insertText: snippet,
            data: { type: 'object' },
        });
        completionItem.insertTextFormat = InsertTextFormat.Snippet;

        if (context.documentType === DocumentType.JSON) {
            handleSnippetJsonQuotes(
                completionItem,
                context,
                params,
                this.documentManager,
                ResourceEntityCompletionProvider.name,
            );
        }

        return completionItem;
    }

    private generateRequiredPropertiesSnippet(
        schema: ResourceSchema,
        documentType: DocumentType,
        params: CompletionParams,
    ): string {
        let snippet: string;
        const indent1 = CompletionFormatter.getIndentPlaceholder(1);

        if (!schema.required || schema.required.length === 0) {
            snippet =
                documentType === DocumentType.JSON ? `"Properties": {\n${indent1}$1\n}` : `Properties:\n${indent1}$1`;
        } else {
            const requiredProps = schema.required
                .map((propName, index) => {
                    if (documentType === DocumentType.JSON) {
                        return `"${propName}": $${index + 1}`;
                    } else {
                        return `${propName}: $${index + 1}`;
                    }
                })
                .join(documentType === DocumentType.JSON ? `,\n${indent1}` : `\n${indent1}`);

            snippet =
                documentType === DocumentType.JSON
                    ? `"Properties": {\n${indent1}${requiredProps}\n}`
                    : `Properties:\n${indent1}${requiredProps}`;
        }

        const documentSpecificSettings = this.documentManager.getEditorSettingsForDocument(params.textDocument.uri);

        return applySnippetIndentation(snippet, documentSpecificSettings, documentType);
    }
}
