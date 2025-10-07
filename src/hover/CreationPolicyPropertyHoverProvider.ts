import { creationPolicyPropertyDocsMap } from '../artifacts/resourceAttributes/CreationPolicyPropertyDocs';
import { Context } from '../context/Context';
import { ResourceAttribute, TopLevelSection } from '../context/ContextType';
import { Resource } from '../context/semantic/Entity';
import { HoverProvider } from './HoverProvider';

export class CreationPolicyPropertyHoverProvider implements HoverProvider {
    getInformation(context: Context): string | undefined {
        if (context.section !== TopLevelSection.Resources) {
            return undefined;
        }

        const resource = context.entity as Resource;
        const resourceType = resource.Type;

        if (!resourceType) {
            return undefined;
        }

        if (!context.isResourceAttributeProperty()) {
            return undefined;
        }

        const propertyPath = context.getResourceAttributePropertyPath();
        if (propertyPath.length < 2 || propertyPath[0] !== ResourceAttribute.CreationPolicy.toString()) {
            return undefined;
        }

        const propertyPathString = propertyPath.join('.');

        const documentation = creationPolicyPropertyDocsMap.get(propertyPathString);
        if (documentation) {
            return documentation;
        }

        return undefined;
    }
}
