import { Position } from 'vscode-languageserver-protocol';
import { Context } from '../context/Context';
import { IntrinsicFunction, ResourceAttribute, ResourceAttributesSet, TopLevelSection } from '../context/ContextType';
import { ContextWithRelatedEntities } from '../context/ContextWithRelatedEntities';
import { Resource } from '../context/semantic/Entity';
import { EntityType } from '../context/semantic/SemanticTypes';
import { SchemaRetriever } from '../schema/SchemaRetriever';
import {
    determineGetAttPosition,
    extractAttributeName,
    extractGetAttResourceLogicalId,
    getAttributeDocumentationFromSchema,
} from '../utils/GetAttUtils';
import { formatIntrinsicArgumentHover, getResourceAttributeValueDoc } from './HoverFormatter';
import { HoverProvider } from './HoverProvider';

export class IntrinsicFunctionArgumentHoverProvider implements HoverProvider {
    constructor(private readonly schemaRetriever: SchemaRetriever) {}

    getInformation(context: Context, position?: Position): string | undefined {
        // Only handle contexts that are inside intrinsic functions
        if (!context.intrinsicContext.inIntrinsic() || context.isIntrinsicFunc) {
            return undefined;
        }

        const intrinsicFunction = context.intrinsicContext.intrinsicFunction();
        if (!intrinsicFunction) {
            return undefined;
        }

        const resourceAttributeValueDoc = this.getResourceAttributeValueDoc(context);
        if (resourceAttributeValueDoc) {
            return resourceAttributeValueDoc;
        }

        switch (intrinsicFunction.type) {
            case IntrinsicFunction.Ref: {
                return this.handleRefArgument(context);
            }
            case IntrinsicFunction.GetAtt: {
                return this.handleGetAttArgument(context, position);
            }
            // Add other intrinsic function types as needed
            default: {
                return undefined;
            }
        }
    }

    private handleRefArgument(context: Context): string | undefined {
        // For !Ref, we need to find the referenced entity and provide its hover information
        if (!(context instanceof ContextWithRelatedEntities)) {
            return undefined;
        }

        // Extract logical ID (handle dot notation like "MyBucket.Arn")
        const dotIndex = context.text.indexOf('.');
        const logicalId = dotIndex === -1 ? context.text : context.text.slice(0, dotIndex);

        // Look for the referenced entity in related entities
        for (const [, section] of context.relatedEntities.entries()) {
            const relatedContext = section.get(logicalId);
            if (relatedContext) {
                return this.buildSchemaAndFormat(relatedContext);
            }
        }

        return undefined;
    }

    private handleGetAttArgument(context: Context, position?: Position): string | undefined {
        if (!(context instanceof ContextWithRelatedEntities)) {
            return undefined;
        }

        const intrinsicFunction = context.intrinsicContext.intrinsicFunction();
        if (!intrinsicFunction) {
            return undefined;
        }

        const getAttPosition = determineGetAttPosition(intrinsicFunction.args, context, position);

        if (getAttPosition === 1) {
            // Hovering over resource name
            return this.handleRefArgument(context);
        } else if (getAttPosition === 2) {
            // Hovering over attribute name
            return this.getGetAttAttributeHover(context, intrinsicFunction.args);
        }

        return undefined;
    }

    private buildSchemaAndFormat(relatedContext: Context): string | undefined {
        return formatIntrinsicArgumentHover(relatedContext.entity);
    }

    /**
     * Check if we're inside an intrinsic function that's providing a value for a resource attribute
     * and return documentation for that value if applicable.
     */
    private getResourceAttributeValueDoc(context: Context): string | undefined {
        // Find the resource attribute in the property path
        for (const pathSegment of context.propertyPath) {
            if (ResourceAttributesSet.has(pathSegment as string)) {
                const attributeName = pathSegment as ResourceAttribute;
                return getResourceAttributeValueDoc(attributeName, context.text);
            }
        }

        return undefined;
    }

    /**
     * Gets hover information for GetAtt attribute names
     */
    private getGetAttAttributeHover(context: ContextWithRelatedEntities, args: unknown): string | undefined {
        const resourceLogicalId = extractGetAttResourceLogicalId(args);
        if (!resourceLogicalId) {
            return undefined;
        }

        const resourcesSection = context.relatedEntities.get(TopLevelSection.Resources);
        if (!resourcesSection) {
            return undefined;
        }

        const resourceContext = resourcesSection.get(resourceLogicalId);
        if (!resourceContext?.entity || resourceContext.entity.entityType !== EntityType.Resource) {
            return undefined;
        }

        const resource = resourceContext.entity as Resource;
        const resourceType = resource.Type;
        if (!resourceType || typeof resourceType !== 'string') {
            return undefined;
        }

        const attributeName = extractAttributeName(args, context);
        if (!attributeName) {
            return undefined;
        }

        return this.getAttributeDocumentation(resourceType, attributeName);
    }

    /**
     * Gets documentation for a specific resource attribute from the schema
     */
    private getAttributeDocumentation(resourceType: string, attributeName: string): string | undefined {
        const description = getAttributeDocumentationFromSchema(this.schemaRetriever, resourceType, attributeName);
        return this.formatAttributeHover(resourceType, description);
    }

    /**
     * Formats the hover information for GetAtt attributes
     */
    private formatAttributeHover(resourceType: string, description: string): string {
        const lines = [`**GetAtt attribute for ${resourceType}**`, '', description];
        return lines.join('\n');
    }
}
