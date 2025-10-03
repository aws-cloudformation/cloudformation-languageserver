import { InlineCompletionItem, InlineCompletionParams } from 'vscode-languageserver-protocol';
import { Context } from '../context/Context';
import { DocumentManager } from '../document/DocumentManager';
import { RelationshipSchemaService } from '../services/RelationshipSchemaService';
import { EditorSettings } from '../settings/Settings';
import { LoggerFactory } from '../telemetry/LoggerFactory';
import { InlineCompletionProvider } from './InlineCompletionProvider';

export class RelatedResourcesInlineCompletionProvider implements InlineCompletionProvider {
    private readonly log = LoggerFactory.getLogger(RelatedResourcesInlineCompletionProvider);

    constructor(
        private readonly relationshipSchemaService: RelationshipSchemaService,
        private readonly documentManager: DocumentManager,
    ) {}

    getlineCompletion(
        context: Context,
        params: InlineCompletionParams,
        _editorSettings: EditorSettings,
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
    ): InlineCompletionItem[] {
        const completionItems: InlineCompletionItem[] = [];

        const topSuggestions = relatedResourceTypes.slice(0, 5);

        for (const resourceType of topSuggestions) {
            const insertText = this.generatePropertySnippet(resourceType);

            completionItems.push({
                insertText,
                range: {
                    start: params.position,
                    end: params.position,
                },
                filterText: `${resourceType}`,
            });
        }

        this.log.debug(
            {
                suggestedCount: completionItems.length,
                suggestions: completionItems.map((item) => item.insertText),
            },
            'Generated related resource inline completions',
        );

        return completionItems;
    }

    private generatePropertySnippet(resourceType: string): string {
        // TODO: Convert AWS::Service::Resource to a complete resource type snippet
        return `${resourceType}:`;
    }
}
