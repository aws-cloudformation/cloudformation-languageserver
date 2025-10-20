/**
 * Generates meaningful, unique parameter names for CloudFormation template extraction.
 * Prioritizes context-aware naming over generic fallbacks for better template readability.
 */
export class ParameterNameGenerator {
    generateParameterName(config: {
        propertyName?: string;
        resourceName?: string;
        existingNames: Set<string>;
        fallbackPrefix: string;
    }): string {
        const { propertyName, resourceName, existingNames, fallbackPrefix } = config;
        const baseName = this.generateBaseName(propertyName, resourceName, fallbackPrefix);
        return this.ensureUniqueness(baseName, existingNames);
    }

    private generateBaseName(
        propertyName?: string,
        resourceName?: string,
        fallbackPrefix: string = 'Parameter',
    ): string {
        const sanitizedProperty = this.sanitizeAndCapitalize(propertyName);
        const sanitizedResource = this.sanitizeAndCapitalize(resourceName);

        if (sanitizedResource && sanitizedProperty) {
            return `${sanitizedResource}${sanitizedProperty}`;
        }

        if (sanitizedProperty) {
            return `${sanitizedProperty}Parameter`;
        }

        if (sanitizedResource) {
            return `${sanitizedResource}Parameter1`;
        }

        return `${fallbackPrefix}1`;
    }

    private sanitizeAndCapitalize(input?: string): string {
        if (!input || typeof input !== 'string') {
            return '';
        }

        const sanitized = input.replaceAll(/[^a-zA-Z0-9]/g, '');
        if (!sanitized) {
            return '';
        }

        return input
            .replaceAll(/[^a-zA-Z0-9]/g, ' ')
            .split(' ')
            .filter((word) => word.length > 0)
            .map((word) => this.capitalizeFirstLetter(word))
            .join('');
    }

    private capitalizeFirstLetter(word: string): string {
        if (!word || word.length === 0) {
            return '';
        }
        return word.charAt(0).toUpperCase() + word.slice(1);
    }

    private ensureUniqueness(baseName: string, existingNames: Set<string>): string {
        if (!existingNames.has(baseName)) {
            if (this.hasNumberedVariants(baseName, existingNames)) {
                return this.findNextAvailableNumber(baseName, existingNames);
            }
            return baseName;
        }

        const { nameBase, startingNumber } = this.parseNameWithNumber(baseName);
        let counter = startingNumber;
        let candidateName: string;

        do {
            candidateName = `${nameBase}${counter}`;
            counter++;
        } while (existingNames.has(candidateName));

        return candidateName;
    }

    private hasNumberedVariants(baseName: string, existingNames: Set<string>): boolean {
        for (const existingName of existingNames) {
            if (existingName.startsWith(baseName) && /^\d+$/.test(existingName.slice(baseName.length))) {
                return true;
            }
        }
        return false;
    }

    private findNextAvailableNumber(baseName: string, existingNames: Set<string>): string {
        let counter = 1;
        let candidateName: string;

        do {
            candidateName = `${baseName}${counter}`;
            counter++;
        } while (existingNames.has(candidateName));

        return candidateName;
    }

    private parseNameWithNumber(name: string): { nameBase: string; startingNumber: number } {
        const match = name.match(/^(.+?)(\d+)$/);

        if (match) {
            return {
                nameBase: match[1],
                startingNumber: Number.parseInt(match[2], 10) + 1,
            };
        } else {
            return {
                nameBase: name,
                startingNumber: 2,
            };
        }
    }
}
