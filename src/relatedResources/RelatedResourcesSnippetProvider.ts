import { CodeActionKind, Range, TextEdit } from 'vscode-languageserver';
import { TopLevelSection } from '../context/CloudFormationEnums';
import { getEntityMap } from '../context/SectionContextBuilder';
import { Resource } from '../context/semantic/Entity';
import { SyntaxTree } from '../context/syntaxtree/SyntaxTree';
import { SyntaxTreeManager } from '../context/syntaxtree/SyntaxTreeManager';
import { DocumentType } from '../document/Document';
import { DocumentManager } from '../document/DocumentManager';
import { RelatedResourcesCodeAction } from '../protocol/RelatedResourcesProtocol';
import { SchemaRetriever } from '../schema/SchemaRetriever';
import { RelationshipSchemaService } from '../services/RelationshipSchemaService';
import { LoggerFactory } from '../telemetry/LoggerFactory';
import {
    combineResourcesToDocumentFormat,
    generateUniqueLogicalId,
    getInsertPosition,
    getResourceSection,
} from '../utils/ResourceInsertionUtils';

const log = LoggerFactory.getLogger('RelatedResourcesSnippetProvider');

const REF_PLACEHOLDER_PREFIX = '__CFN_REF_';
const REF_PLACEHOLDER_SUFFIX = '__';

export interface RelatedResourceObject {
    [logicalId: string]: {
        Type: string;
        Properties?: Record<string, unknown>;
    };
}

export class RelatedResourcesSnippetProvider {
    private currentTemplateUri: string = '';

    constructor(
        private readonly documentManager: DocumentManager,
        private readonly syntaxTreeManager: SyntaxTreeManager,
        private readonly schemaRetriever: SchemaRetriever,
        private readonly relationshipSchemaService: RelationshipSchemaService,
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

            const parentLogicalId = this.findParentLogicalId(syntaxTree, parentResourceType);

            const resources = relatedResourceTypes.map((resourceType) =>
                this.generateResourceObject(resourceType, parentResourceType, parentLogicalId, documentType),
            );

            const resourceSection = syntaxTree ? getResourceSection(syntaxTree) : undefined;
            const resourceSectionExists = resourceSection !== undefined;

            let formattedText = combineResourcesToDocumentFormat(
                resources,
                documentType,
                resourceSectionExists,
                editorSettings,
            );

            if (documentType === DocumentType.YAML) {
                formattedText = this.replaceRefPlaceholders(formattedText);
            }

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

    private generateResourceObject(
        resourceType: string,
        parentResourceType: string,
        parentLogicalId: string | undefined,
        documentType: DocumentType,
    ): RelatedResourceObject {
        const logicalId = this.generateLogicalId(resourceType, parentResourceType);

        try {
            const schema = this.schemaRetriever.getDefault().schemas.get(resourceType);
            const resource: { Type: string; Properties?: Record<string, unknown> } = { Type: resourceType };

            if (schema?.required && schema.required.length > 0) {
                resource.Properties = {};
                for (const propName of schema.required) {
                    resource.Properties[propName] = this.getPropertyValueForRelatedResource(
                        propName,
                        resourceType,
                        parentResourceType,
                        parentLogicalId,
                        documentType,
                    );
                }
            }

            return { [logicalId]: resource };
        } catch {
            return { [logicalId]: { Type: resourceType } };
        }
    }

    /**
     * Determines the property value for a related resource property.
     * If the property references the parent resource type, returns a !Ref reference.
     * Otherwise returns an empty string.
     */
    private getPropertyValueForRelatedResource(
        propName: string,
        resourceType: string,
        parentResourceType: string,
        parentLogicalId: string | undefined,
        documentType: DocumentType,
    ): unknown {
        if (!parentLogicalId) {
            return '';
        }

        const relationships = this.relationshipSchemaService.getRelationshipsForResourceType(resourceType);
        if (!relationships) {
            return '';
        }

        for (const rel of relationships.relationships) {
            // Only match direct top-level property names
            // rel.property may contain nested paths like "VpcConfig/SecurityGroupIds"
            // We only match when the property path is exactly the propName (top-level)
            if (rel.property === propName) {
                const matchesParent = rel.relatedResourceTypes.some((rt) => rt.typeName === parentResourceType);
                if (matchesParent) {
                    if (documentType === DocumentType.YAML) {
                        // Use a placeholder that will be replaced after YAML serialization
                        return `${REF_PLACEHOLDER_PREFIX}${parentLogicalId}${REF_PLACEHOLDER_SUFFIX}`;
                    } else {
                        // For JSON, return the intrinsic function object
                        return { Ref: parentLogicalId };
                    }
                }
            }
        }

        return '';
    }

    /**
     * Replaces Ref placeholders in the serialized YAML output with proper !Ref intrinsic functions.
     * The YAML serializer quotes strings starting with !, so we use placeholders during serialization
     * and then replace them with the unquoted !Ref syntax afterward.
     */
    private replaceRefPlaceholders(text: string): string {
        // Match both quoted and unquoted placeholders
        // The YAML serializer may produce: '__CFN_REF_MyVpc__' or __CFN_REF_MyVpc__
        const placeholderRegex = new RegExp(
            `['"]?${REF_PLACEHOLDER_PREFIX}([a-zA-Z0-9]+)${REF_PLACEHOLDER_SUFFIX}['"]?`,
            'g',
        );
        return text.replaceAll(placeholderRegex, '!Ref $1');
    }

    /**
     * Finds the logical ID of the first resource in the template that matches the given resource type.
     */
    private findParentLogicalId(syntaxTree: SyntaxTree | undefined, parentResourceType: string): string | undefined {
        if (!syntaxTree) {
            return undefined;
        }

        const resourcesMap = getEntityMap(syntaxTree, TopLevelSection.Resources);
        if (!resourcesMap) {
            return undefined;
        }

        for (const [logicalId, context] of resourcesMap) {
            const resource = context.entity as Resource;
            if (resource?.Type === parentResourceType) {
                return logicalId;
            }
        }

        return undefined;
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
