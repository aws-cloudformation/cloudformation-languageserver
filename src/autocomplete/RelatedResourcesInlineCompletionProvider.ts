import { InlineCompletionItem, InlineCompletionParams } from 'vscode-languageserver-protocol';
import { Context } from '../context/Context';
import { Document, DocumentType } from '../document/Document';
import { DocumentManager } from '../document/DocumentManager';
import { ResourceSchema } from '../schema/ResourceSchema';
import { SchemaRetriever } from '../schema/SchemaRetriever';
import { RelationshipSchemaService } from '../services/RelationshipSchemaService';
import { LoggerFactory } from '../telemetry/LoggerFactory';
import { applySnippetIndentation } from '../utils/IndentationUtils';
import { CompletionFormatter } from './CompletionFormatter';
import { InlineCompletionProvider } from './InlineCompletionProvider';

type RelatedResource = { type: string; relatedTo: string };

export class RelatedResourcesInlineCompletionProvider implements InlineCompletionProvider {
    private readonly log = LoggerFactory.getLogger(RelatedResourcesInlineCompletionProvider);
    private readonly MAX_SUGGESTIONS = 5;

    constructor(
        private readonly relationshipSchemaService: RelationshipSchemaService,
        private readonly documentManager: DocumentManager,
        private readonly schemaRetriever: SchemaRetriever,
    ) {}

    getInlineCompletion(
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

            return this.generateInlineCompletionItems(relatedResourceTypes, params);
        } catch (error) {
            this.log.error({ error: String(error) }, 'Error generating related resources inline completion');
            return undefined;
        }
    }

    private getRelatedResourceTypes(existingResourceTypes: string[]): RelatedResource[] {
        const existingRelationships = new Map<string, Set<string>>();
        const allRelatedTypes = new Set<string>();
        const typeToRelatedMap = new Map<string, string>();

        for (const resourceType of existingResourceTypes) {
            const relatedTypes = this.relationshipSchemaService.getAllRelatedResourceTypes(resourceType);
            existingRelationships.set(resourceType, relatedTypes);
            for (const type of relatedTypes) {
                allRelatedTypes.add(type);
                typeToRelatedMap.set(type, typeToRelatedMap.get(type) ?? resourceType);
            }
        }

        const existingTypesSet = new Set(existingResourceTypes);
        const suggestedTypes = [...allRelatedTypes].filter((type) => !existingTypesSet.has(type));

        const rankedTypes = this.rankSuggestionsByFrequency(suggestedTypes, existingRelationships);

        return rankedTypes.map((type) => ({
            type,
            relatedTo: typeToRelatedMap.get(type) ?? type,
        }));
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
        relatedResourceTypes: RelatedResource[],
        params: InlineCompletionParams,
    ): InlineCompletionItem[] {
        const document = this.documentManager.get(params.textDocument.uri);
        const topSuggestions = relatedResourceTypes.slice(0, this.MAX_SUGGESTIONS);

        return topSuggestions.map(({ type: resourceType, relatedTo }) => {
            const insertText = this.generatePropertySnippet(resourceType, relatedTo, params, document);

            return {
                insertText,
                range: {
                    start: params.position,
                    end: params.position,
                },
                filterText: resourceType,
            };
        });
    }

    private generatePropertySnippet(
        resourceType: string,
        relatedToType: string,
        params: InlineCompletionParams,
        document: Document | undefined,
    ): string {
        const documentType = document?.documentType ?? DocumentType.YAML;
        const baseLogicalId = `RelatedTo${relatedToType
            .split('::')
            .slice(1)
            .join('')
            .replaceAll(/[^a-zA-Z0-9]/g, '')}`;
        const logicalId = this.getUniqueLogicalId(baseLogicalId, document);
        const indent0 = CompletionFormatter.getIndentPlaceholder(0);
        const indent1 = CompletionFormatter.getIndentPlaceholder(1);

        try {
            const schema = this.schemaRetriever.getDefault().schemas.get(resourceType);

            if (!schema) {
                // Fallback to simple format if schema not found
                return this.formatSnippetForDocumentType(
                    documentType === DocumentType.JSON
                        ? `"${logicalId}": {\n${indent1}"Type": "${resourceType}"\n}`
                        : `${logicalId}:\n${indent1}Type: ${resourceType}`,
                    documentType,
                    params,
                );
            }

            const propertiesSnippet = this.generateRequiredPropertiesSnippet(schema, documentType);

            let snippet: string;
            if (propertiesSnippet) {
                snippet =
                    documentType === DocumentType.JSON
                        ? `"${logicalId}": {\n${indent1}"Type": "${resourceType}",\n${indent1}"Properties": {\n${propertiesSnippet}\n${indent1}}\n${indent0}}`
                        : `${logicalId}:\n${indent1}Type: ${resourceType}\n${indent1}Properties:\n${propertiesSnippet}`;
            } else {
                snippet =
                    documentType === DocumentType.JSON
                        ? `"${logicalId}": {\n${indent1}"Type": "${resourceType}"\n${indent0}}`
                        : `${logicalId}:\n${indent1}Type: ${resourceType}`;
            }

            return this.formatSnippetForDocumentType(snippet, documentType, params);
        } catch (error) {
            this.log.warn(
                { error: String(error), resourceType },
                'Error generating property snippet, falling back to simple format',
            );
            return this.formatSnippetForDocumentType(
                documentType === DocumentType.JSON
                    ? `"${logicalId}": {\n${indent1}"Type": "${resourceType}"\n}`
                    : `${logicalId}:\n${indent1}Type: ${resourceType}`,
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
            .map((propName) => {
                if (documentType === DocumentType.JSON) {
                    return `${indent2}"${propName}": ""`;
                } else {
                    return `${indent2}${propName}: `;
                }
            })
            .join(documentType === DocumentType.JSON ? ',\n' : '\n');

        return requiredProps;
    }

    private formatSnippetForDocumentType(
        snippet: string,
        documentType: DocumentType,
        params: InlineCompletionParams,
    ): string {
        const documentSpecificSettings = this.documentManager.getEditorSettingsForDocument(params.textDocument.uri);
        const document = this.documentManager.get(params.textDocument.uri);

        if (!document) {
            return applySnippetIndentation(snippet, documentSpecificSettings, documentType);
        }

        const lines = document.getLines();
        const currentLine = lines[params.position.line] || '';

        const currentIndent = this.getCurrentLineIndentation(currentLine);
        const baseIndentSize = documentSpecificSettings.tabSize;

        return this.applyRelativeIndentation(snippet, currentIndent, baseIndentSize);
    }

    private getCurrentLineIndentation(line: string): number {
        const match = line.match(/^(\s*)/);
        return match ? match[1].length : 0;
    }

    private applyRelativeIndentation(template: string, currentIndent: number, baseIndentSize: number): string {
        const logicalIdIndent = ' '.repeat(currentIndent);
        const resourceIndent = ' '.repeat(currentIndent + baseIndentSize);
        const propertyIndent = ' '.repeat(currentIndent + baseIndentSize * 2);

        return template
            .replaceAll(/\n\s*{INDENT0}/g, `\n${logicalIdIndent}`)
            .replaceAll(/\n\s*{INDENT1}/g, `\n${resourceIndent}`)
            .replaceAll(/\n\s*{INDENT2}/g, `\n${propertyIndent}`)
            .replaceAll(/\n\s*{INDENT3}/g, `\n${' '.repeat(currentIndent + baseIndentSize * 3)}`);
    }

    private getUniqueLogicalId(baseId: string, document: Document | undefined): string {
        const logicalId = `${baseId}LogicalId`;

        if (!document) {
            return logicalId;
        }

        const templateText = document.getText();

        let counter = 0;
        let candidateId = logicalId;

        while (templateText.includes(candidateId)) {
            counter++;
            candidateId = `${baseId}${counter}LogicalId`;
        }

        return candidateId;
    }
}
