import { ResourceSchema } from '../ResourceSchema';
import { ResourceTemplateTransformer } from './ResourceTemplateTransformer';

export class ReplacePrimaryIdentifierTransformer implements ResourceTemplateTransformer {
    private static readonly CLONE_PLACEHOLDER = '<CLONE INPUT REQUIRED>';

    transform(resourceProperties: Record<string, unknown>, schema: ResourceSchema): void {
        if (!schema.primaryIdentifier || schema.primaryIdentifier.length === 0) {
            return;
        }

        for (const identifierPath of schema.primaryIdentifier) {
            this.replacePrimaryIdentifierProperty(resourceProperties, identifierPath);
        }
    }

    private replacePrimaryIdentifierProperty(properties: Record<string, unknown>, propertyPath: string): void {
        // Handle nested property paths like "/properties/BucketName"
        const pathParts = propertyPath.split('/').filter((part) => part !== '' && part !== 'properties');

        if (pathParts.length === 0) {
            return;
        }

        let current = properties;

        // Navigate to the parent of the target property
        for (let i = 0; i < pathParts.length - 1; i++) {
            const part = pathParts[i];
            if (current[part] && typeof current[part] === 'object') {
                current = current[part] as Record<string, unknown>;
            } else {
                return; // Path doesn't exist
            }
        }

        // Replace the final property with placeholder
        const finalProperty = pathParts[pathParts.length - 1];
        if (finalProperty in current) {
            current[finalProperty] = ReplacePrimaryIdentifierTransformer.CLONE_PLACEHOLDER;
        }
    }
}
