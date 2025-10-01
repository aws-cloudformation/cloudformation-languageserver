import { ResourceStatePurpose } from '../../resourceState/ResourceStateTypes';
import { RemoveMutuallyExclusivePropertiesTransformer } from './RemoveMutuallyExclusivePropertiesTransformer';
import { RemoveReadonlyPropertiesTransformer } from './RemoveReadonlyPropertiesTransformer';
import { RemoveSystemTagsTransformer } from './RemoveSystemTagsTransformer';
import { ReplacePrimaryIdentifierTransformer } from './ReplacePrimaryIdentifierTransformer';
import type { ResourceTemplateTransformer } from './ResourceTemplateTransformer';

export class TransformersUtil {
    public static createTransformers(purpose: ResourceStatePurpose): ResourceTemplateTransformer[] {
        if (purpose === ResourceStatePurpose.IMPORT) {
            return [
                new RemoveReadonlyPropertiesTransformer(),
                new RemoveMutuallyExclusivePropertiesTransformer(),
                new RemoveSystemTagsTransformer(),
            ];
        } else if (purpose === ResourceStatePurpose.CLONE) {
            return [
                new RemoveReadonlyPropertiesTransformer(),
                new RemoveMutuallyExclusivePropertiesTransformer(),
                new RemoveSystemTagsTransformer(),
                new ReplacePrimaryIdentifierTransformer(),
            ];
        }
        return [];
    }
}
