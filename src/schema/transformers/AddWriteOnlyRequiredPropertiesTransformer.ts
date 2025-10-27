import type { ResourceSchema } from '../ResourceSchema';
import { PlaceholderConstants } from './PlaceholderConstants';
import type { ResourceTemplateTransformer } from './ResourceTemplateTransformer';

/**
 * Transformer that adds placeholder constants for required write-only properties.
 * Only adds placeholders at the required property level, not for nested write-only children.
 * Uses placeholder constants that will be replaced with tab stops later.
 */
export class AddWriteOnlyRequiredPropertiesTransformer implements ResourceTemplateTransformer {
    public transform(resourceProperties: Record<string, unknown>, schema: ResourceSchema, logicalId?: string): void {
        const requiredProps = schema.required ?? [];
        const writeOnlyPaths = schema.writeOnlyProperties ?? [];

        if (requiredProps.length === 0 || writeOnlyPaths.length === 0 || !logicalId) {
            return;
        }

        const requiredWriteOnlyProps = new Set<string>();

        for (const path of writeOnlyPaths) {
            const parts = this.parseJsonPointer(path);
            if (parts.length >= 2 && parts[0] === 'properties') {
                const rootProp = parts[1];
                if (requiredProps.includes(rootProp)) {
                    requiredWriteOnlyProps.add(rootProp);
                }
            }
        }

        for (const prop of requiredWriteOnlyProps) {
            if (!(prop in resourceProperties) || this.isEmpty(resourceProperties[prop])) {
                resourceProperties[prop] = PlaceholderConstants.createPlaceholder(
                    PlaceholderConstants.WRITE_ONLY_REQUIRED,
                    logicalId,
                );
            }
        }
    }

    private isEmpty(value: unknown): boolean {
        if (value === null || value === undefined) {
            return true;
        }
        if (typeof value === 'object' && !Array.isArray(value)) {
            return Object.keys(value as Record<string, unknown>).length === 0;
        }
        return false;
    }

    private parseJsonPointer(pointer: string): string[] {
        if (!pointer.startsWith('/')) {
            return [];
        }
        return pointer
            .slice(1)
            .split('/')
            .map((part) => part.replaceAll('~1', '/').replaceAll('~0', '~'));
    }
}
