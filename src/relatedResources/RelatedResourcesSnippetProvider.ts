import { CodeActionKind, Range, TextEdit } from 'vscode-languageserver';
import { RelatedResourcesCodeAction } from '../protocol/RelatedResourcesProtocol';
import { ServerComponents } from '../server/ServerComponents';
import { LoggerFactory } from '../telemetry/LoggerFactory';
import {
    combineResourcesToDocumentFormat,
    generateUniqueLogicalId,
    getInsertPosition,
    getResourceSection,
} from '../utils/ResourceInsertionUtils';

const log = LoggerFactory.getLogger('RelatedResourcesSnippetProvider');

export interface RelatedResourceObject {
    [logicalId: string]: {
        Type: string;
        Properties?: Record<string, string>;
    };
}

export class RelatedResourcesSnippetProvider {
    private currentTemplateUri: string = '';

    constructor(private readonly components: ServerComponents) {}

    insertRelatedResources(
        templateUri: string,
        resourceTypes: string[],
        selectedResourceType: string,
    ): RelatedResourcesCodeAction {
        this.currentTemplateUri = templateUri;

        try {
            const document = this.components.documentManager.get(templateUri);
            if (!document) {
                throw new Error('Document not found');
            }

            const documentType = document.documentType;
            const syntaxTree = this.components.syntaxTreeManager.getSyntaxTree(templateUri);
            const editorSettings = this.components.documentManager.getEditorSettingsForDocument(templateUri);

            const resources = resourceTypes.map((resourceType) =>
                this.generateResourceObject(resourceType, selectedResourceType),
            );

            const resourceSection = syntaxTree ? getResourceSection(syntaxTree) : undefined;
            const resourceSectionExists = resourceSection !== undefined;

            const formattedText = combineResourcesToDocumentFormat(
                resources,
                documentType,
                resourceSectionExists,
                editorSettings,
            );

            const insertPosition = getInsertPosition(resourceSection, document);

            const commaPrefix = insertPosition.commaPrefixNeeded ? ',\n' : '';
            const newLineSuffix = insertPosition.newLineSuffixNeeded ? '\n' : '';

            const textEdit: TextEdit = {
                range: Range.create(insertPosition.position, insertPosition.position),
                newText: commaPrefix + formattedText + newLineSuffix,
            };

            return {
                title: `Insert ${resourceTypes.length} related resources`,
                kind: CodeActionKind.Refactor,
                edit: {
                    changes: {
                        [document.uri]: [textEdit],
                    },
                },
                data: {
                    scrollToPosition: insertPosition.position,
                    firstLogicalId: this.generateLogicalId(resourceTypes[0], selectedResourceType),
                },
            };
        } catch (error) {
            log.error({ error }, 'Error inserting related resources');
            throw error;
        }
    }

    private generateResourceObject(resourceType: string, selectedResourceType: string): RelatedResourceObject {
        const logicalId = this.generateLogicalId(resourceType, selectedResourceType);

        try {
            const schema = this.components.schemaRetriever.getDefault().schemas.get(resourceType);
            const resource: { Type: string; Properties?: Record<string, string> } = { Type: resourceType };

            if (schema?.required && schema.required.length > 0) {
                resource.Properties = {};
                for (const propName of schema.required) {
                    resource.Properties[propName] = '';
                }
            }

            return { [logicalId]: resource };
        } catch {
            return { [logicalId]: { Type: resourceType } };
        }
    }

    private generateLogicalId(resourceType: string, selectedResourceType: string): string {
        const baseId = this.generateBaseLogicalId(resourceType, selectedResourceType);
        return this.getUniqueLogicalId(baseId);
    }

    private generateBaseLogicalId(resourceType: string, selectedResourceType: string): string {
        const resourceTypeName = resourceType
            .split('::')
            .slice(1)
            .join('')
            .replaceAll(/[^a-zA-Z0-9]/g, '');
        const selectedResourceTypeName = selectedResourceType
            .split('::')
            .slice(1)
            .join('')
            .replaceAll(/[^a-zA-Z0-9]/g, '');
        return `${resourceTypeName}RelatedTo${selectedResourceTypeName}`;
    }

    private getUniqueLogicalId(baseId: string): string {
        const syntaxTree = this.components.syntaxTreeManager.getSyntaxTree(this.currentTemplateUri);
        if (!syntaxTree) {
            return baseId;
        }

        return generateUniqueLogicalId(baseId, syntaxTree);
    }
}
