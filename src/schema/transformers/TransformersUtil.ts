import { ResourceStatePurpose } from '../../resourceState/ResourceStateTypes';
import { AddWriteOnlyRequiredPropertiesTransformer } from './AddWriteOnlyRequiredPropertiesTransformer';
import { RemoveMutuallyExclusivePropertiesTransformer } from './RemoveMutuallyExclusivePropertiesTransformer';
import { RemoveReadonlyPropertiesTransformer } from './RemoveReadonlyPropertiesTransformer';
import { RemoveRequiredXorPropertiesTransformer } from './RemoveRequiredXorPropertiesTransformer';
import { RemoveSystemTagsTransformer } from './RemoveSystemTagsTransformer';
import { ReplacePrimaryIdentifierTransformer } from './ReplacePrimaryIdentifierTransformer';
import { ResourceEdgeCaseTransformer } from './ResourceEdgeCaseTransformer';
import type { ResourceTemplateTransformer } from './ResourceTemplateTransformer';

export class TransformersUtil {
    public static createTransformers(purpose: ResourceStatePurpose): ResourceTemplateTransformer[] {
        if (purpose === ResourceStatePurpose.IMPORT) {
            return [
                new RemoveReadonlyPropertiesTransformer(),
                new RemoveMutuallyExclusivePropertiesTransformer(),
                new RemoveSystemTagsTransformer(),
                new RemoveRequiredXorPropertiesTransformer(),
                new AddWriteOnlyRequiredPropertiesTransformer(),
                new ResourceEdgeCaseTransformer(),
            ];
        } else if (purpose === ResourceStatePurpose.CLONE) {
            return [
                new RemoveReadonlyPropertiesTransformer(),
                new RemoveMutuallyExclusivePropertiesTransformer(),
                new RemoveSystemTagsTransformer(),
                new ReplacePrimaryIdentifierTransformer(),
                new RemoveRequiredXorPropertiesTransformer(),
                new AddWriteOnlyRequiredPropertiesTransformer(),
                new ResourceEdgeCaseTransformer(),
            ];
        }
        return [];
    }
}
