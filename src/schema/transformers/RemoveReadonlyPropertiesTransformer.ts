import type { ResourceSchema } from '../ResourceSchema';
import type { ResourceTemplateTransformer } from './ResourceTemplateTransformer';

/**
 * Transformer that removes read-only properties from CloudFormation resource properties.
 */
export class RemoveReadonlyPropertiesTransformer implements ResourceTemplateTransformer {
    public transform(resourceProperties: Record<string, unknown>, schema: ResourceSchema): void {
        this.removeReadonlyProperties(resourceProperties, schema);
    }

    private removeReadonlyProperties(propertiesObj: Record<string, unknown>, schema: ResourceSchema): void {
        const readonlyPropertyPaths = schema.readOnlyProperties;
        if (!readonlyPropertyPaths) {
            return;
        }

        for (const path of readonlyPropertyPaths) {
            this.deleteByJsonPointer(propertiesObj, path);
        }
    }

    private deleteByJsonPointer(obj: Record<string, unknown>, pointer: string): void {
        const parts = pointer.split('/').filter(Boolean).slice(1);
        const lastKey = parts.pop();

        if (!lastKey) return;

        let target: Record<string, unknown> | unknown[] = obj;

        for (const key of parts) {
            // Handle array indices (convert numeric strings to numbers)
            const arrayIndex = /^\d+$/.test(key) ? Number.parseInt(key, 10) : undefined;

            if (Array.isArray(target) && arrayIndex !== undefined) {
                if (arrayIndex >= target.length) return; // Out of bounds
                target = target[arrayIndex] as Record<string, unknown> | unknown[];
            } else if (typeof target === 'object' && target !== undefined && !Array.isArray(target)) {
                if (!(key in target)) return;
                target = target[key] as Record<string, unknown> | unknown[];
            } else {
                return; // Cannot traverse further
            }
        }

        // Handle the final deletion based on target type
        if (Array.isArray(target) && /^\d+$/.test(lastKey)) {
            const index = Number.parseInt(lastKey, 10);
            if (index < target.length) {
                target.splice(index, 1);
            }
        } else if (typeof target === 'object' && target !== undefined && !Array.isArray(target)) {
            delete target[lastKey];
        }
    }
}
