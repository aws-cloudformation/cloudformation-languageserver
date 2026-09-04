import { EntityType, ResourceAttribute, TopLevelSection } from './CloudFormationEnums';
import { Context } from './Context';
import { PropertyPath } from './syntaxtree/SyntaxTree';

export type MetadataContextScope = 'resource' | 'template';

export function getMetadataContextScope(context: Context): MetadataContextScope | undefined {
    if (context.section === TopLevelSection.Metadata) {
        return 'template';
    }

    if (context.section !== TopLevelSection.Resources) {
        return undefined;
    }

    const metadataIndex = getResourceMetadataIndex(context);
    return context.propertyPath[metadataIndex] === ResourceAttribute.Metadata ? 'resource' : undefined;
}

export function getMetadataContextRelativePath(context: Context): PropertyPath | undefined {
    const scope = getMetadataContextScope(context);
    if (scope === 'template') {
        return context.propertyPath.slice(1);
    }
    if (scope === 'resource') {
        return context.propertyPath.slice(getResourceMetadataIndex(context) + 1);
    }
    return undefined;
}

function getResourceMetadataIndex(context: Context): number {
    return context.getEntityType() === EntityType.ForEachResource ? 4 : 2;
}
