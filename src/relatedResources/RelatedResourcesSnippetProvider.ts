import { CodeActionKind, Range, TextEdit } from 'vscode-languageserver';
import { IntrinsicFunction, TopLevelSection } from '../context/CloudFormationEnums';
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
const GETATT_PLACEHOLDER_PREFIX = '__CFN_GETATT_';
const GETATT_PLACEHOLDER_SEPARATOR = '_DOT_';
const GETATT_PLACEHOLDER_SUFFIX = '__';

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
        providedParentLogicalId?: string,
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

            // Use provided logical ID if available, otherwise find the first match
            const parentLogicalId = providedParentLogicalId ?? this.findParentLogicalId(syntaxTree, parentResourceType);

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
                formattedText = this.replaceIntrinsicPlaceholders(formattedText);
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
            const requiredProps = new Set(schema?.required);

            if (requiredProps.size > 0) {
                resource.Properties = {};
                for (const propName of requiredProps) {
                    resource.Properties[propName] = this.getPropertyValueForRelatedResource(
                        propName,
                        resourceType,
                        parentResourceType,
                        parentLogicalId,
                        documentType,
                    );
                }
            }

            // Also add non-required properties that reference the parent type
            this.addParentReferencingProperties(
                resource,
                resourceType,
                parentResourceType,
                parentLogicalId,
                documentType,
                requiredProps,
            );

            return { [logicalId]: resource };
        } catch {
            return { [logicalId]: { Type: resourceType } };
        }
    }

    /**
     * Counts the number of top-level properties on the inserted resource type
     * that reference the parent resource type. Used to determine whether to
     * auto-populate: if multiple properties reference the same parent, we leave
     * them empty since we can't determine which one the user intends.
     */
    private countTopLevelParentReferences(resourceType: string, parentResourceType: string): number {
        const relationships = this.relationshipSchemaService.getRelationshipsForResourceType(resourceType);
        if (!relationships) {
            return 0;
        }

        let count = 0;
        for (const rel of relationships.relationships) {
            if (rel.property.includes('/')) {
                continue;
            }
            const matchesParent = rel.relatedResourceTypes.some((rt) => rt.typeName === parentResourceType);
            if (matchesParent) {
                count++;
            }
        }
        return count;
    }

    /**
     * Adds non-required properties that reference the parent resource type.
     * These properties are discovered from the relationship schema and are
     * pre-populated with !Ref or !GetAtt to the parent logical ID.
     * Only populates when exactly one top-level property references the parent.
     */
    private addParentReferencingProperties(
        resource: { Type: string; Properties?: Record<string, unknown> },
        resourceType: string,
        parentResourceType: string,
        parentLogicalId: string | undefined,
        documentType: DocumentType,
        requiredProps: Set<string>,
    ): void {
        if (!parentLogicalId) {
            return;
        }

        // Don't auto-populate if multiple top-level properties reference the parent
        if (this.countTopLevelParentReferences(resourceType, parentResourceType) > 1) {
            return;
        }

        const relationships = this.relationshipSchemaService.getRelationshipsForResourceType(resourceType);
        if (!relationships) {
            return;
        }

        const schema = this.schemaRetriever.getDefault().schemas.get(resourceType);

        for (const rel of relationships.relationships) {
            // Only match direct top-level property names (no nested paths with /)
            if (rel.property.includes('/')) {
                continue;
            }

            // Skip if already added as a required property
            if (requiredProps.has(rel.property)) {
                continue;
            }

            // Skip array properties - don't auto-populate them with references
            const propSchema = schema?.properties?.[rel.property];
            if (propSchema?.type === 'array' || propSchema?.items !== undefined) {
                continue;
            }

            const matchingType = rel.relatedResourceTypes.find((rt) => rt.typeName === parentResourceType);
            if (matchingType) {
                resource.Properties ??= {};

                resource.Properties[rel.property] = this.buildIntrinsicReference(
                    parentLogicalId,
                    matchingType.attribute,
                    parentResourceType,
                    documentType,
                );
            }
        }
    }

    /**
     * Determines the property value for a related resource property.
     * If the property references the parent resource type, returns a !Ref or !GetAtt reference.
     * Only populates when exactly one top-level property references the parent.
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

        // Skip array properties - don't auto-populate them with references
        const schema = this.schemaRetriever.getDefault().schemas.get(resourceType);
        const propSchema = schema?.properties?.[propName];
        if (propSchema?.type === 'array' || propSchema?.items !== undefined) {
            return '';
        }

        // Don't auto-populate if multiple top-level properties reference the parent
        if (this.countTopLevelParentReferences(resourceType, parentResourceType) > 1) {
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
                const matchingType = rel.relatedResourceTypes.find((rt) => rt.typeName === parentResourceType);
                if (matchingType) {
                    return this.buildIntrinsicReference(
                        parentLogicalId,
                        matchingType.attribute,
                        parentResourceType,
                        documentType,
                    );
                }
            }
        }

        return '';
    }

    /**
     * Builds the appropriate intrinsic function reference (!Ref or !GetAtt) based on
     * whether the attribute matches the parent resource's primary identifier.
     *
     * - If the attribute is the primary identifier → !Ref ParentLogicalId
     * - If the attribute is NOT the primary identifier → !GetAtt ParentLogicalId.AttributeName
     *
     * @param parentLogicalId - The logical ID of the parent resource in the template
     * @param attribute - The attribute path from the relationship schema (e.g., "/properties/Arn")
     * @param parentResourceType - The parent resource type (e.g., "AWS::IAM::Role")
     * @param documentType - YAML or JSON
     */
    private buildIntrinsicReference(
        parentLogicalId: string,
        attribute: string,
        parentResourceType: string,
        documentType: DocumentType,
    ): unknown {
        const useGetAtt = !this.isAttributePrimaryIdentifier(attribute, parentResourceType);
        const attributeName = this.extractAttributeName(attribute);

        if (useGetAtt && attributeName) {
            if (documentType === DocumentType.YAML) {
                return `${GETATT_PLACEHOLDER_PREFIX}${parentLogicalId}${GETATT_PLACEHOLDER_SEPARATOR}${attributeName}${GETATT_PLACEHOLDER_SUFFIX}`;
            } else {
                return { [IntrinsicFunction.GetAtt]: [parentLogicalId, attributeName] };
            }
        }

        // Default to !Ref
        if (documentType === DocumentType.YAML) {
            return `${REF_PLACEHOLDER_PREFIX}${parentLogicalId}${REF_PLACEHOLDER_SUFFIX}`;
        } else {
            return { Ref: parentLogicalId };
        }
    }

    /**
     * Checks if the given attribute path matches the parent resource type's primary identifier.
     * If the parent schema is not available, defaults to using !Ref (returns true).
     */
    private isAttributePrimaryIdentifier(attribute: string, parentResourceType: string): boolean {
        try {
            const parentSchema = this.schemaRetriever.getDefault().schemas.get(parentResourceType);
            if (!parentSchema?.primaryIdentifier) {
                return true; // Default to !Ref when schema is unavailable
            }
            return parentSchema.primaryIdentifier.includes(attribute);
        } catch {
            return true; // Default to !Ref on error
        }
    }

    /**
     * Extracts the attribute name from a JSON pointer path.
     * e.g., "/properties/Arn" → "Arn"
     *       "/properties/VpcId" → "VpcId"
     */
    private extractAttributeName(attribute: string): string | undefined {
        const parts = attribute.split('/');
        return parts.length > 0 ? parts[parts.length - 1] : undefined;
    }

    /**
     * Replaces intrinsic function placeholders in the serialized YAML output with
     * proper !Ref and !GetAtt syntax.
     * The YAML serializer quotes strings starting with !, so we use placeholders during
     * serialization and then replace them afterward.
     */
    private replaceIntrinsicPlaceholders(text: string): string {
        // Replace !GetAtt placeholders: '__CFN_GETATT_MyRole_DOT_Arn__' → '!GetAtt MyRole.Arn'
        const getAttRegex = new RegExp(
            `['"]?${GETATT_PLACEHOLDER_PREFIX}([a-zA-Z0-9]+)${GETATT_PLACEHOLDER_SEPARATOR}([a-zA-Z0-9]+)${GETATT_PLACEHOLDER_SUFFIX}['"]?`,
            'g',
        );
        text = text.replaceAll(getAttRegex, '!GetAtt $1.$2');

        // Replace !Ref placeholders: '__CFN_REF_MyVpc__' → '!Ref MyVpc'
        const refRegex = new RegExp(`['"]?${REF_PLACEHOLDER_PREFIX}([a-zA-Z0-9]+)${REF_PLACEHOLDER_SUFFIX}['"]?`, 'g');
        text = text.replaceAll(refRegex, '!Ref $1');

        return text;
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
