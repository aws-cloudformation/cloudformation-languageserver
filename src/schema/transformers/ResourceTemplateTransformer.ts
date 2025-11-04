import { ResourceSchema } from '../ResourceSchema';

/**
 * Interface for resource template transformers
 */
export interface ResourceTemplateTransformer {
    transform(resourceProperties: Record<string, unknown>, schema: ResourceSchema, logicalId?: string): void;
}
