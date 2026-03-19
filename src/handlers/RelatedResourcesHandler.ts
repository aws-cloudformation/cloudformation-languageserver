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

            // Filter to only resource types with exactly one populatable relationship
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
 *
 * This mirrors the snippet provider's population logic exactly:
 * - countTopLevelParentReferences counts ALL top-level refs (including arrays)
 * - If count > 1, nothing gets populated (ambiguous)
 * - If count === 1 but it's an array, nothing gets populated
 * - Only if count === 1 AND it's not an array does it get populated
 *
 * Resources that won't get a !Ref or !GetAtt populated are excluded from the dropdown.
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

    // Count ALL top-level properties referencing the parent (including arrays)
    // This mirrors countTopLevelParentReferences in the snippet provider
    const topLevelParentRefs: { property: string; isArray: boolean }[] = [];
    for (const rel of relationships.relationships) {
        // Skip nested properties
        if (rel.property.includes('/')) {
            continue;
        }

        // Check if this property references the parent type
        const referencesParent = rel.relatedResourceTypes.some((rt) => rt.typeName === parentResourceType);
        if (!referencesParent) {
            continue;
        }

        const isArray = schema?.properties?.[rel.property]?.type === 'array';
        topLevelParentRefs.push({ property: rel.property, isArray });
    }

    // Must have exactly 1 total top-level ref (matching provider's count > 1 guard)
    if (topLevelParentRefs.length !== 1) {
        return false;
    }

    // The single ref must not be an array
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
