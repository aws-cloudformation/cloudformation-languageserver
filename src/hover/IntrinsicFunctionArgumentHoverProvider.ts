import { Context } from '../context/Context';
import { IntrinsicFunction } from '../context/ContextType';
import { ContextWithRelatedEntities } from '../context/ContextWithRelatedEntities';
import { formatIntrinsicArgumentHover } from './HoverFormatter';
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

        // Handle different intrinsic function types
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
}
