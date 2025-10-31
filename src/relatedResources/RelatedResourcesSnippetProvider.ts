import { CodeActionKind, Range, TextEdit } from 'vscode-languageserver';
import { SyntaxTree } from '../context/syntaxtree/SyntaxTree';
import { SyntaxTreeManager } from '../context/syntaxtree/SyntaxTreeManager';
import { DocumentManager } from '../document/DocumentManager';
import { RelatedResourcesCodeAction } from '../protocol/RelatedResourcesProtocol';
import { SchemaRetriever } from '../schema/SchemaRetriever';
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

    constructor(
        private readonly documentManager: DocumentManager,
        private readonly syntaxTreeManager: SyntaxTreeManager,
        private readonly schemaRetriever: SchemaRetriever,
    ) {}

    insertRelatedResources(
        templateUri: string,
        relatedResourceTypes: string[],
        parentResourceType: string,
    ): RelatedResourcesCodeAction {
        this.currentTemplateUri = templateUri;

        try {
            const document = this.documentManager.get(templateUri);
            if (!document) {
                throw new Error('Document not found');
            }

            const documentType = document.documentType;
            const syntaxTree: SyntaxTree | undefined = this.syntaxTreeManager.getSyntaxTree(templateUri);
            const editorSettings = this.documentManager.getEditorSettingsForDocument(templateUri);

            const resources = relatedResourceTypes.map((resourceType) =>
                this.generateResourceObject(resourceType, parentResourceType),
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
                title: `Insert ${relatedResourceTypes.length} related resources`,
                kind: CodeActionKind.Refactor,
                edit: {
                    changes: {
                        [document.uri]: [textEdit],
                    },
                },
                data: {
                    scrollToPosition: insertPosition.position,
                    firstLogicalId: this.generateLogicalId(relatedResourceTypes[0], parentResourceType),
                },
            };
        } catch (error) {
            log.error({ error }, 'Error inserting related resources');
            throw error;
        }
    }

    private generateResourceObject(resourceType: string, parentResourceType: string): RelatedResourceObject {
        const logicalId = this.generateLogicalId(resourceType, parentResourceType);

        try {
            const schema = this.schemaRetriever.getDefault().schemas.get(resourceType);
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

    private generateLogicalId(resourceType: string, parentResourceType: string): string {
        const baseId = this.generateBaseLogicalId(resourceType, parentResourceType);
        return this.getUniqueLogicalId(baseId);
    }

    private generateBaseLogicalId(resourceType: string, parentResourceType: string): string {
        const resourceTypeName = resourceType
            .split('::')
            .slice(1)
            .join('')
            .replaceAll(/[^a-zA-Z0-9]/g, '');
        const parentResourceTypeName = parentResourceType
            .split('::')
            .slice(1)
            .join('')
            .replaceAll(/[^a-zA-Z0-9]/g, '');
        return `${resourceTypeName}RelatedTo${parentResourceTypeName}`;
    }

    private getUniqueLogicalId(baseId: string): string {
        const syntaxTree: SyntaxTree | undefined = this.syntaxTreeManager.getSyntaxTree(this.currentTemplateUri);
        if (!syntaxTree) {
            return baseId;
        }

        return generateUniqueLogicalId(baseId, syntaxTree);
    }
}
