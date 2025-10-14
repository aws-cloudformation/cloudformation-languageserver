import { Context } from '../context/Context';
import { IntrinsicFunction, ResourceAttribute, ResourceAttributesSet } from '../context/ContextType';
import { ContextWithRelatedEntities } from '../context/ContextWithRelatedEntities';
import { formatIntrinsicArgumentHover, getResourceAttributeValueDoc } from './HoverFormatter';
import { HoverProvider } from './HoverProvider';

export class IntrinsicFunctionArgumentHoverProvider implements HoverProvider {
    constructor() {}

    getInformation(context: Context): string | undefined {
        // Only handle contexts that are inside intrinsic functions
        if (!context.intrinsicContext.inIntrinsic()) {
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
                return this.handleGetAttArgument(context);
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

        // Look for the referenced entity in related entities
        for (const [, section] of context.relatedEntities.entries()) {
            const relatedContext = section.get(context.text);
            if (relatedContext) {
                return this.buildSchemaAndFormat(relatedContext);
            }
        }

        return undefined;
    }

    private handleGetAttArgument(context: Context): string | undefined {
        // For !GetAtt, we might want to handle resource.attribute references
        // This could be implemented similarly to handleRefArgument but with
        // additional logic for attribute-specific information
        return this.handleRefArgument(context); // For now, use same logic as Ref
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
}
