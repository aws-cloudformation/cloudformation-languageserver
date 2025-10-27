import { RequestHandler } from 'vscode-languageserver';
import { TopLevelSection } from '../context/ContextType';
import { getEntityMap } from '../context/SectionContextBuilder';
import { Resource } from '../context/semantic/Entity';
import {
    InsertRelatedResourcesRequest,
    RelatedResourcesCodeAction,
    ResourceTypeRequest,
    TemplateUri,
} from '../protocol/RelatedResourcesProtocol';
import { RelatedResourcesSnippetProvider } from '../relatedResources/RelatedResourcesSnippetProvider';
import { ServerComponents } from '../server/ServerComponents';
import { LoggerFactory } from '../telemetry/LoggerFactory';
import { handleLspError } from '../utils/Errors';

const log = LoggerFactory.getLogger('RelatedResourcesHandler');

export function getAuthoredResourceTypesHandler(
    components: ServerComponents,
): RequestHandler<TemplateUri, string[], void> {
    return (rawParams) => {
        log.debug({ Handler: 'getAuthoredResourceTypesHandler', rawParams });

        try {
            const templateUri = rawParams;
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

            log.debug('No resources found in template');
            return [];
        } catch (error) {
            handleLspError(error, 'Failed to get authored resource types');
        }
    };
}

export function getRelatedResourceTypesHandler(
    components: ServerComponents,
): RequestHandler<ResourceTypeRequest, string[], void> {
    return (rawParams) => {
        log.debug({ Handler: 'getRelatedResourceTypesHandler', rawParams });

        try {
            const { resourceType } = rawParams;
            const relatedTypes = components.relationshipSchemaService.getAllRelatedResourceTypes(resourceType);
            const result = [...relatedTypes];

            log.debug({ resourceType, relatedTypes: result }, 'Found related resource types');
            return result;
        } catch (error) {
            handleLspError(error, 'Failed to get related resource types');
        }
    };
}

export function insertRelatedResourcesHandler(
    components: ServerComponents,
): RequestHandler<InsertRelatedResourcesRequest, RelatedResourcesCodeAction, void> {
    return (rawParams) => {
        log.debug({ Handler: 'insertRelatedResourcesHandler', rawParams });

        try {
            const { templateUri, resourceTypes, selectedResourceType } = rawParams;
            const snippetProvider = new RelatedResourcesSnippetProvider(components);
            const result = snippetProvider.insertRelatedResources(templateUri, resourceTypes, selectedResourceType);

            log.debug({ resourceTypes }, 'Inserted related resources');
            return result;
        } catch (error) {
            handleLspError(error, 'Failed to insert related resources');
        }
    };
}
