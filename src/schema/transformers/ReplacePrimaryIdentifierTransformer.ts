import { ResourceSchema } from '../ResourceSchema';
import { PlaceholderConstants } from './PlaceholderConstants';
import { ResourceTemplateTransformer } from './ResourceTemplateTransformer';

export class ReplacePrimaryIdentifierTransformer implements ResourceTemplateTransformer {
    transform(resourceProperties: Record<string, unknown>, schema: ResourceSchema, logicalId?: string): void {
        if (!schema.primaryIdentifier || schema.primaryIdentifier.length === 0) {
            return;
        }

        for (const identifierPath of schema.primaryIdentifier) {
            if (this.isPrimaryIdentifierRequired(identifierPath, schema)) {
                if (logicalId) {
                    this.replacePrimaryIdentifierProperty(resourceProperties, identifierPath, logicalId);
                }
            } else {
                this.removePrimaryIdentifierProperty(resourceProperties, identifierPath);
            }
        }
    }

    private isPrimaryIdentifierRequired(identifierPath: string, schema: ResourceSchema): boolean {
        if (!schema.required || schema.required.length === 0) {
            return false;
        }

        const pathParts = identifierPath.split('/').filter((part) => part !== '' && part !== 'properties');
        if (pathParts.length === 0) {
            return false;
        }

        const propertyName = pathParts[pathParts.length - 1];
        return schema.required.includes(propertyName);
    }

    private removePrimaryIdentifierProperty(properties: Record<string, unknown>, propertyPath: string): void {
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

        // Remove the final property
        const finalProperty = pathParts[pathParts.length - 1];
        delete current[finalProperty];
    }

    private replacePrimaryIdentifierProperty(
        properties: Record<string, unknown>,
        propertyPath: string,
        logicalId: string,
    ): void {
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
            current[finalProperty] = PlaceholderConstants.createPlaceholder(
                PlaceholderConstants.CLONE_INPUT_REQUIRED,
                logicalId,
            );
        }
    }
}
