import { Position } from 'vscode-languageserver-protocol';
import { Context } from '../context/Context';
import { SchemaRetriever } from '../schema/SchemaRetriever';
import { LoggerFactory } from '../telemetry/LoggerFactory';

const log = LoggerFactory.getLogger('GetAttUtils');

/**
 * Determines the position in GetAtt arguments (1 for resource, 2 for attribute)
 */
export function determineGetAttPosition(args: unknown, context: Context, cursorPosition?: Position): number {
    if (typeof args === 'string') {
        const dotIndex = args.indexOf('.');
        if (dotIndex === -1) {
            return 1;
        }

        // If we have cursor position, use it to determine which part is being hovered
        if (cursorPosition) {
            const nodeStart = context.startPosition;
            const relativeChar = cursorPosition.character - nodeStart.column;

            if (relativeChar <= dotIndex) {
                return 1; // resource part
            }
            return 2; // attribute part
        }

        const resourcePart = args.slice(0, dotIndex);

        if (context.text === resourcePart) {
            return 1;
        }

        if (context.text.length > 0 && resourcePart.startsWith(context.text)) {
            return 1;
        }

        return 2;
    }

    if (!Array.isArray(args)) {
        return 0;
    }

    if (args.length === 0) {
        return 1;
    }

    // For array format [resource, attribute], check exact matches
    if (args.length > 0 && args[0] === context.text) {
        return 1; // Hovering over resource name
    }

    if (args.length >= 2 && args[1] === context.text) {
        return 2; // Hovering over attribute name
    }

    // If no exact match, determine based on array position and context
    // This handles cases where we're in the middle of typing
    if (args.length === 1) {
        return 1; // Only resource specified, must be position 1
    }

    return 2;
}

/**
 * Extracts the resource logical ID from GetAtt arguments
 */
export function extractGetAttResourceLogicalId(args: unknown): string | undefined {
    if (typeof args === 'string') {
        const dotIndex = args.indexOf('.');
        if (dotIndex !== -1) {
            return args.slice(0, Math.max(0, dotIndex));
        }
        return args;
    }

    if (Array.isArray(args) && args.length > 0 && typeof args[0] === 'string') {
        return args[0];
    }

    return undefined;
}

/**
 * Extracts the attribute name from GetAtt arguments
 */
export function extractAttributeName(args: unknown, context: Context): string | undefined {
    if (typeof args === 'string') {
        const dotIndex = args.indexOf('.');
        if (dotIndex !== -1) {
            return args.slice(dotIndex + 1);
        }
        return undefined;
    }

    if (Array.isArray(args) && args.length >= 2) {
        return args[1] as string;
    }

    return context.text;
}

/**
 * Gets documentation for a resource attribute from the schema.
 * Returns the attribute description if found in the schema, otherwise returns a default description.
 */
export function getAttributeDocumentationFromSchema(
    schemaRetriever: SchemaRetriever,
    resourceType: string,
    attributeName: string,
): string {
    const schema = schemaRetriever.getDefault().schemas.get(resourceType);

    // Provide fallback description even when schema is not available
    let description = `**${attributeName}** attribute of **${resourceType}**\n\nReturns the value of this attribute when used with the GetAtt intrinsic function.`;

    if (schema) {
        const jsonPointerPath = `/properties/${attributeName.replaceAll('.', '/')}`;

        try {
            const resolvedSchemas = schema.resolveJsonPointerPath(jsonPointerPath);

            if (resolvedSchemas.length > 0) {
                const firstSchema = resolvedSchemas[0];

                if (firstSchema.description) {
                    description = firstSchema.description;
                }
            }
        } catch (error) {
            log.warn(error, `Error resolving attribute documentation ${resourceType} ${attributeName}`);
        }
    }

    return description;
}
