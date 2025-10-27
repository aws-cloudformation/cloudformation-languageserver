/**
 * Constants for placeholder text used during resource transformation.
 * These will be replaced with actual snippet tab stops at the end of processing.
 */
export const PlaceholderConstants = {
    /** Common prefix for all placeholders */
    PREFIX: '__PLACEHOLDER__',

    /** Placeholder purposes */
    WRITE_ONLY_REQUIRED: 'WRITE_ONLY_REQUIRED',
    CLONE_INPUT_REQUIRED: 'CLONE_INPUT_REQUIRED',

    /** Generate placeholder text with logical ID */
    createPlaceholder(purpose: string, logicalId: string): string {
        return `${this.PREFIX}${purpose}__${logicalId}`;
    },

    /** Check if text contains any placeholder */
    hasPlaceholders(text: string): boolean {
        return text.includes(this.PREFIX);
    },
} as const;

/**
 * Utility to replace placeholder constants with snippet tab stops.
 */
export const PlaceholderReplacer = {
    /**
     * Replace all placeholder constants with sequential snippet tab stops.
     * @param text The text containing placeholder constants
     * @returns Text with tab stops (${1:...}, ${2:...}, etc.)
     */
    replaceWithTabStops(text: string): string {
        let tabStopCounter = 1;
        let result = text;

        // Find all placeholders in the text
        const placeholderRegex = /__PLACEHOLDER__(\w+)__(\w+)/g;
        const placeholders: Array<{ match: string; purpose: string; logicalId: string }> = [];

        let match;
        while ((match = placeholderRegex.exec(text)) !== null) {
            placeholders.push({
                match: match[0],
                purpose: match[1],
                logicalId: match[2],
            });
        }

        // Replace each placeholder sequentially using local counter
        for (const placeholder of placeholders) {
            const purposeText =
                placeholder.purpose === PlaceholderConstants.WRITE_ONLY_REQUIRED
                    ? 'write only required property'
                    : 'enter new identifier';

            const tabStopText = `\${${tabStopCounter++}:${purposeText} for ${placeholder.logicalId}}`;
            result = result.replace(placeholder.match, tabStopText);
        }

        return result;
    },

    /**
     * Check if text contains any placeholder constants.
     */
    hasPlaceholders(text: string): boolean {
        return PlaceholderConstants.hasPlaceholders(text);
    },
} as const;
