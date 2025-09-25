import { RemoveMutuallyExclusivePropertiesTransformer } from './RemoveMutuallyExclusivePropertiesTransformer';
import { RemoveReadonlyPropertiesTransformer } from './RemoveReadonlyPropertiesTransformer';
import { RemoveSystemTagsTransformer } from './RemoveSystemTagsTransformer';
import type { ResourceTemplateTransformer } from './ResourceTemplateTransformer';

/**
 * Utility class for managing resource template transformers
 */
export class TransformersUtil {
    /**
     * Creates an array of transformers for resource template processing
     */
    public static createTransformers(): ResourceTemplateTransformer[] {
        return [
            new RemoveReadonlyPropertiesTransformer(),
            new RemoveMutuallyExclusivePropertiesTransformer(),
            new RemoveSystemTagsTransformer(),
        ];
    }
}
