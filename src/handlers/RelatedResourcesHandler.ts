import { RequestHandler } from 'vscode-languageserver';
import { TopLevelSection } from '../context/ContextType';
import { getEntityMap } from '../context/SectionContextBuilder';
import { Resource } from '../context/semantic/Entity';
import {
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
): RequestHandler<TemplateUri, string[], void> {
    return (rawParams) => {
        try {
            const templateUri = parseWithPrettyError(parseTemplateUriParams, rawParams);
            const syntaxTree = components.syntaxTreeManager.getSyntaxTree(templateUri);
            if (syntaxTree) {
                const resourcesMap = getEntityMap(syntaxTree, TopLevelSection.Resources);
                if (resourcesMap) {
                    const resourceTypes = [...resourcesMap.values()]
                        .map((context) => {
                            const resource = context.entity as Resource;
                            return resource?.Type;
                        })
                        .filter((type): type is string => type !== undefined && type !== null);

                    return [...new Set(resourceTypes)];
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
            return [...relatedTypes];
        } catch (error) {
            handleLspError(error, 'Failed to get related resource types');
        }
    };
}

export function insertRelatedResourcesHandler(
    components: ServerComponents,
): RequestHandler<InsertRelatedResourcesParams, RelatedResourcesCodeAction, void> {
    return (rawParams) => {
        try {
            const { templateUri, relatedResourceTypes, parentResourceType } = parseWithPrettyError(
                parseInsertRelatedResourcesParams,
                rawParams,
            );
            return components.relatedResourcesSnippetProvider.insertRelatedResources(
                templateUri,
                relatedResourceTypes,
                parentResourceType,
            );
        } catch (error) {
            handleLspError(error, 'Failed to insert related resources');
        }
    };
}
