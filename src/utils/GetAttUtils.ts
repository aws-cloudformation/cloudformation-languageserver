import { Context } from '../context/Context';

/**
 * Determines the position in GetAtt arguments (1 for resource, 2 for attribute)
 */
export function determineGetAttPosition(args: unknown, context: Context): number {
    if (typeof args === 'string') {
        const dotIndex = args.indexOf('.');
        if (dotIndex === -1) {
            return 1;
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
