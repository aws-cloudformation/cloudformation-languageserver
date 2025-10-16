import { resourceAttributeDocsMap } from '../artifacts/ResourceAttributeDocs';
import { creationPolicyPropertyDocsMap } from '../artifacts/resourceAttributes/CreationPolicyPropertyDocs';
import { deletionPolicyValueDocsMap } from '../artifacts/resourceAttributes/DeletionPolicyPropertyDocs';
import { updatePolicyPropertyDocsMap } from '../artifacts/resourceAttributes/UpdatePolicyPropertyDocs';
import { updateReplacePolicyValueDocsMap } from '../artifacts/resourceAttributes/UpdateReplacePolicyPropertyDocs-1';
import { Context } from '../context/Context';
import { ResourceAttribute, TopLevelSection } from '../context/ContextType';
import { Resource } from '../context/semantic/Entity';
import { ResourceSchema } from '../schema/ResourceSchema';
import { SchemaRetriever } from '../schema/SchemaRetriever';
import { templatePathToJsonPointerPath } from '../utils/PathUtils';
import { propertyTypesToMarkdown, formatResourceHover, getResourceAttributeValueDoc } from './HoverFormatter';
import { HoverProvider } from './HoverProvider';

export class ResourceSectionHoverProvider implements HoverProvider {
    constructor(private readonly schemaRetriever: SchemaRetriever) {}

    getInformation(context: Context) {
        const resource = context.entity as Resource;

        if (context.text === context.logicalId) {
            return formatResourceHover(resource);
        }

        const resourceType = resource.Type;
        if (!resourceType) {
            return;
        }
        const schema = this.schemaRetriever.getDefault()?.schemas.get(resourceType);
        if (!schema) {
            return;
        }
        if (context.isResourceType) {
            return this.getFormattedSchemaDoc(schema);
        }
        if (context.isResourceAttributeProperty()) {
            return this.getResourceAttributePropertyDoc(context, resource);
        }
        if (context.isResourceAttributeValue()) {
            return this.getResourceAttributeValueDoc(context);
        }
        if (context.isResourceAttribute && resource[context.text] !== undefined) {
            return this.getResourceAttributeDoc(context.text);
        }
        if (
            context.matchPathWithLogicalId(TopLevelSection.Resources, 'Properties') &&
            context.propertyPath.length >= 3
        ) {
            return this.getPropertyDefinitionDoc(schema, context);
        }
    }

    private getFormattedSchemaDoc(schema: ResourceSchema): string {
        const doc: Array<string> = [];
        doc.push(`### ${schema.typeName}`, '\n', schema.description, '\n');
        if (schema.required !== undefined && schema.required?.length > 0) {
            doc.push('#### Required Properties:');
            for (const property of schema.required) {
                doc.push(`- ${property}`);
            }
            doc.push('\n');
        }

        if (schema.isAws) {
            const resource = schema.typeName.toLowerCase().split('::').splice(1).join('-');
            doc.push(
                `[Source Documentation](https://docs.aws.amazon.com/AWSCloudFormation/latest/TemplateReference/aws-resource-${resource}.html)`,
            );
        }

        return doc.join('\n');
    }

    private getPropertyDefinitionDoc(schema: ResourceSchema, context: Context): string | undefined {
        if (!context.isKey()) {
            return undefined;
        }

        // Extract the property path from the context, starting after "Properties"
        // Expected path: ['Resources', 'LogicalId', 'Properties', ...propertySegments]
        const propertyPathSegments = context.propertyPath.slice(3);

        // Convert template path to JSON Pointer path and resolve schema
        const jsonPointerPath = templatePathToJsonPointerPath(propertyPathSegments);
        const resolvedSchemas = schema.resolveJsonPointerPath(jsonPointerPath, { excludeReadOnly: true });

        if (resolvedSchemas.length === 0) {
            return this.getPropertyNotFoundDoc(context.text, schema, jsonPointerPath);
        }

        return propertyTypesToMarkdown(context.text, resolvedSchemas);
    }

    private getPropertyNotFoundDoc(propertyName: string, schema: ResourceSchema, jsonPointerPath: string): string {
        return `Property \`${propertyName}\` at path \`${jsonPointerPath}\` is not defined in \`${schema.typeName}\` schema.`;
    }

    private getResourceAttributeDoc(attributeName: string): string | undefined {
        return resourceAttributeDocsMap.get(attributeName as ResourceAttribute);
    }

    private getResourceAttributePropertyDoc(context: Context, _resource: Resource): string | undefined {
        const propertyPath = context.getResourceAttributePropertyPath();
        if (propertyPath.length < 2) {
            return undefined;
        }

        const attributeType = propertyPath[0] as ResourceAttribute;
        switch (attributeType) {
            case ResourceAttribute.CreationPolicy: {
                return this.getCreationPolicyPropertyDoc(propertyPath);
            }
            case ResourceAttribute.DeletionPolicy: {
                return this.getDeletionPolicyPropertyDoc(propertyPath);
            }
            case ResourceAttribute.UpdatePolicy: {
                return this.getUpdatePolicyPropertyDoc(propertyPath);
            }
            case ResourceAttribute.UpdateReplacePolicy: {
                return this.getUpdateReplacePolicyPropertyDoc(propertyPath);
            }
            default: {
                return undefined;
            }
        }
    }

    private getCreationPolicyPropertyDoc(propertyPath: ReadonlyArray<string>): string | undefined {
        const propertyPathString = propertyPath.join('.');
        return creationPolicyPropertyDocsMap.get(propertyPathString);
    }

    private getDeletionPolicyPropertyDoc(propertyPath: ReadonlyArray<string>): string | undefined {
        if (propertyPath.length === 2) {
            const deletionPolicyValue = propertyPath[1];
            return deletionPolicyValueDocsMap.get(deletionPolicyValue);
        }
        return undefined;
    }

    private getUpdatePolicyPropertyDoc(propertyPath: ReadonlyArray<string>): string | undefined {
        const propertyPathString = propertyPath.join('.');
        return updatePolicyPropertyDocsMap.get(propertyPathString);
    }

    private getUpdateReplacePolicyPropertyDoc(propertyPath: ReadonlyArray<string>): string | undefined {
        if (propertyPath.length === 2) {
            const updateReplacePolicyValue = propertyPath[1];
            return updateReplacePolicyValueDocsMap.get(updateReplacePolicyValue);
        }
        return undefined;
    }

    private getResourceAttributeValueDoc(context: Context): string | undefined {
        const attributeName = context.propertyPath[2] as ResourceAttribute;
        return getResourceAttributeValueDoc(attributeName, context.text);
    }
}
