import { ResourceSchema } from '../ResourceSchema';
import { RequiredXor, requiredXorMap } from './MutuallyExclusivePropertiesForValidation';
import { ResourceTemplateTransformer } from './ResourceTemplateTransformer';

export class RemoveRequiredXorPropertiesTransformer implements ResourceTemplateTransformer {
    transform(resourceProperties: Record<string, unknown>, schema: ResourceSchema): void {
        const resourceType = schema.typeName;
        const requiredXorData = requiredXorMap.get(resourceType);
        if (!requiredXorData) {
            return;
        }
        this.removeXorProperties(resourceProperties, requiredXorData);
    }

    private removeXorProperties(obj: Record<string, unknown>, requiredXorData: RequiredXor[]) {
        for (const keysArray of requiredXorData) {
            const firstFound = keysArray.find((key) => key in obj);

            if (firstFound) {
                // Remove all other keys in the xor array
                for (const key of keysArray) {
                    if (key !== firstFound && key in obj) {
                        delete obj[key];
                    }
                }
            }
        }

        // Recursively process nested objects
        for (const value of Object.values(obj)) {
            if (value && typeof value === 'object' && !Array.isArray(value)) {
                this.removeXorProperties(value as Record<string, unknown>, requiredXorData);
            } else if (Array.isArray(value)) {
                for (const item of value) {
                    if (item && typeof item === 'object') {
                        this.removeXorProperties(item as Record<string, unknown>, requiredXorData);
                    }
                }
            }
        }
    }
}
