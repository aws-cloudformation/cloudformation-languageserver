import { RequestHandler } from 'vscode-languageserver';
import { TopLevelSection } from '../context/CloudFormationEnums';
import { getEntityMap } from '../context/SectionContextBuilder';
import { Resource } from '../context/semantic/Entity';
import {
    AuthoredResource,
    GetRelatedResourceTypesParams,
    InsertRelatedResourcesParams,
    RelatedResourcesCodeAction,
    TemplateUri,
} from '../protocol/RelatedResourcesProtocol';
import { ServerComponents } from '../server/ServerComponents';
import { handleLspError } from '../utils/Errors';
import { parseWithPrettyError } from '../utils/ZodErrorWrapper';
import {
    parseGetRelatedResourceTypesParams,
    parseInsertRelatedResourcesParams,
    parseTemplateUriParams,
} from './RelatedResourcesParser';

export function getAuthoredResourceTypesHandler(
    components: ServerComponents,
): RequestHandler<TemplateUri, AuthoredResource[], void> {
    return (rawParams) => {
        try {
            const templateUri = parseWithPrettyError(parseTemplateUriParams, rawParams);
            const syntaxTree = components.syntaxTreeManager.getSyntaxTree(templateUri);
            if (syntaxTree) {
                const resourcesMap = getEntityMap(syntaxTree, TopLevelSection.Resources);
                if (resourcesMap) {
                    const resources: AuthoredResource[] = [];
                    for (const [logicalId, context] of resourcesMap) {
                        const resource = context.entity as Resource;
                        if (resource?.Type) {
                            resources.push({
                                logicalId,
                                type: resource.Type,
                            });
                        }
                    }
                    return resources;
                }
            }

            return [];
        } catch (error) {
            handleLspError(error, 'Failed to get authored resource types');
        }
    };
}

export function getRelatedResourceTypesHandler(
    components: ServerComponents,
): RequestHandler<GetRelatedResourceTypesParams, string[], void> {
    return (rawParams) => {
        try {
            const { parentResourceType } = parseWithPrettyError(parseGetRelatedResourceTypesParams, rawParams);
            const relatedTypes = components.relationshipSchemaService.getAllRelatedResourceTypes(parentResourceType);

            const filtered = [...relatedTypes].filter((relatedType) =>
                hasExactlyOnePopulatableRelationship(relatedType, parentResourceType, components),
            );

            return filtered;
        } catch (error) {
            handleLspError(error, 'Failed to get related resource types');
        }
    };
}

/**
 * Checks if a related resource type has exactly one top-level property
 * that references the parent resource type, and that property is not an array.
 */
function hasExactlyOnePopulatableRelationship(
    relatedType: string,
    parentResourceType: string,
    components: ServerComponents,
): boolean {
    const relationships = components.relationshipSchemaService.getRelationshipsForResourceType(relatedType);
    if (!relationships) {
        return false;
    }

    const schema = components.schemaRetriever.getDefault().schemas.get(relatedType);

    const topLevelParentRefs: { property: string; isArray: boolean }[] = [];
    for (const rel of relationships.relationships) {
        if (rel.property.includes('/')) {
            continue;
        }

        const referencesParent = rel.relatedResourceTypes.some((rt) => rt.typeName === parentResourceType);
        if (!referencesParent) {
            continue;
        }

        const isArray = schema?.properties?.[rel.property]?.type === 'array';
        topLevelParentRefs.push({ property: rel.property, isArray });

        if (topLevelParentRefs.length > 1) {
            break;
        }
    }

    if (topLevelParentRefs.length !== 1) {
        return false;
    }

    return !topLevelParentRefs[0].isArray;
}

export function insertRelatedResourcesHandler(
    components: ServerComponents,
): RequestHandler<InsertRelatedResourcesParams, RelatedResourcesCodeAction, void> {
    return (rawParams) => {
        try {
            const { templateUri, relatedResourceTypes, parentResourceType, parentLogicalId } = parseWithPrettyError(
                parseInsertRelatedResourcesParams,
                rawParams,
            );
            return components.relatedResourcesSnippetProvider.insertRelatedResources(
                templateUri,
                relatedResourceTypes,
                parentResourceType,
                parentLogicalId,
            );
        } catch (error) {
            handleLspError(error, 'Failed to insert related resources');
        }
    };
}
