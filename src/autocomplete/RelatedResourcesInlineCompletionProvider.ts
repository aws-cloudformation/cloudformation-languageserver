import { InlineCompletionItem, InlineCompletionParams } from 'vscode-languageserver-protocol';
import { Context } from '../context/Context';
import { DocumentType } from '../document/Document';
import { DocumentManager } from '../document/DocumentManager';
import { ResourceSchema } from '../schema/ResourceSchema';
import { SchemaRetriever } from '../schema/SchemaRetriever';
import { RelationshipSchemaService } from '../services/RelationshipSchemaService';
import { LoggerFactory } from '../telemetry/LoggerFactory';
import { applySnippetIndentation } from '../utils/IndentationUtils';
import { CompletionFormatter } from './CompletionFormatter';
import { InlineCompletionProvider } from './InlineCompletionProvider';

export class RelatedResourcesInlineCompletionProvider implements InlineCompletionProvider {
    private readonly log = LoggerFactory.getLogger(RelatedResourcesInlineCompletionProvider);

    constructor(
        private readonly relationshipSchemaService: RelationshipSchemaService,
        private readonly documentManager: DocumentManager,
        private readonly schemaRetriever: SchemaRetriever,
    ) {}

    getlineCompletion(
        context: Context,
        params: InlineCompletionParams,
    ): Promise<InlineCompletionItem[]> | InlineCompletionItem[] | undefined {
        this.log.debug(
            {
                provider: 'RelatedResourcesInlineCompletion',
                position: params.position,
                section: context.section,
                propertyPath: context.propertyPath,
            },
            'Processing related resources inline completion request',
        );

        try {
            const document = this.documentManager.get(params.textDocument.uri);
            if (!document) {
                return undefined;
            }

            const existingResourceTypes = this.relationshipSchemaService.extractResourceTypesFromTemplate(
                document.getText(),
            );

            if (existingResourceTypes.length === 0) {
                return undefined;
            }

            const relatedResourceTypes = this.getRelatedResourceTypes(existingResourceTypes);

            if (relatedResourceTypes.length === 0) {
                return undefined;
            }

            return this.generateInlineCompletionItems(relatedResourceTypes, params, context);
        } catch (error) {
            this.log.error({ error: String(error) }, 'Error generating related resources inline completion');
            return undefined;
        }
    }

    private getRelatedResourceTypes(existingResourceTypes: string[]): string[] {
        const existingRelationships = new Map<string, Set<string>>();
        const allRelatedTypes = new Set<string>();

        for (const resourceType of existingResourceTypes) {
            const relatedTypes = this.relationshipSchemaService.getAllRelatedResourceTypes(resourceType);
            existingRelationships.set(resourceType, relatedTypes);
            for (const type of relatedTypes) {
                allRelatedTypes.add(type);
            }
        }

        const existingTypesSet = new Set(existingResourceTypes);
        const suggestedTypes = [...allRelatedTypes].filter((type) => !existingTypesSet.has(type));

        return this.rankSuggestionsByFrequency(suggestedTypes, existingRelationships);
    }

    private rankSuggestionsByFrequency(
        suggestedTypes: string[],
        existingRelationships: Map<string, Set<string>>,
    ): string[] {
        const frequencyMap = new Map<string, number>();

        for (const suggestedType of suggestedTypes) {
            let frequency = 0;
            for (const relatedTypes of existingRelationships.values()) {
                if (relatedTypes.has(suggestedType)) {
                    frequency++;
                }
            }
            frequencyMap.set(suggestedType, frequency);
        }

        return suggestedTypes.sort((a, b) => {
            const freqA = frequencyMap.get(a) ?? 0;
            const freqB = frequencyMap.get(b) ?? 0;

            if (freqA !== freqB) {
                return freqB - freqA;
            }

            return a.localeCompare(b);
        });
    }

    private generateInlineCompletionItems(
        relatedResourceTypes: string[],
        params: InlineCompletionParams,
        context: Context,
    ): InlineCompletionItem[] {
        const completionItems: InlineCompletionItem[] = [];

        const topSuggestions = relatedResourceTypes.slice(0, 5);

        for (const resourceType of topSuggestions) {
            const insertText = this.generatePropertySnippet(resourceType, context.documentType, params);

            completionItems.push({
                insertText,
                range: {
                    start: params.position,
                    end: params.position,
                },
                filterText: `${resourceType}`,
            });
        }

        return completionItems;
    }

    private generatePropertySnippet(
        resourceType: string,
        documentType: DocumentType,
        params: InlineCompletionParams,
    ): string {
        const logicalId = 'relatedResourceLogicalId';
        const indent1 = CompletionFormatter.getIndentPlaceholder(1);

        try {
            const schema = this.schemaRetriever.getDefault().schemas.get(resourceType);

            if (!schema) {
                // Fallback to simple format if schema not found
                return this.formatSnippetForDocumentType(
                    `${logicalId}:\n${indent1}Type: ${resourceType}`,
                    documentType,
                    params,
                );
            }

            const propertiesSnippet = this.generateRequiredPropertiesSnippet(schema, documentType);

            let snippet: string;
            if (propertiesSnippet) {
                snippet =
                    documentType === DocumentType.JSON
                        ? `"${logicalId}": {\n${indent1}"Type": "${resourceType}",\n${indent1}"Properties": {\n${propertiesSnippet}\n${indent1}}\n}`
                        : `${logicalId}:\n${indent1}Type: ${resourceType}\n${indent1}Properties:\n${propertiesSnippet}`;
            } else {
                snippet =
                    documentType === DocumentType.JSON
                        ? `"${logicalId}": {\n${indent1}"Type": "${resourceType}"\n}`
                        : `${logicalId}:\n${indent1}Type: ${resourceType}`;
            }

            return this.formatSnippetForDocumentType(snippet, documentType, params);
        } catch (error) {
            this.log.warn(
                { error: String(error), resourceType },
                'Error generating property snippet, falling back to simple format',
            );
            return this.formatSnippetForDocumentType(
                `${logicalId}:\n${indent1}Type: ${resourceType}`,
                documentType,
                params,
            );
        }
    }

    private generateRequiredPropertiesSnippet(schema: ResourceSchema, documentType: DocumentType): string {
        if (!schema.required || schema.required.length === 0) {
            return '';
        }

        const indent2 = CompletionFormatter.getIndentPlaceholder(2);

        const requiredProps = schema.required
            .map((propName, index) => {
                const placeholderValue = `\${${index + 1}}`;
                if (documentType === DocumentType.JSON) {
                    return `"${propName}": ${placeholderValue}`;
                } else {
                    return `${propName}: ${placeholderValue}`;
                }
            })
            .join(documentType === DocumentType.JSON ? `,\n${indent2}` : `\n${indent2}`);

        return `${indent2}${requiredProps}`;
    }

    private formatSnippetForDocumentType(
        snippet: string,
        documentType: DocumentType,
        params: InlineCompletionParams,
    ): string {
        const documentSpecificSettings = this.documentManager.getEditorSettingsForDocument(params.textDocument.uri);
        return applySnippetIndentation(snippet, documentSpecificSettings, documentType);
    }
}
