import { ResponseError, ErrorCodes, RequestHandler } from 'vscode-languageserver';
import { TopLevelSection } from '../context/ContextType';
import { getEntityMap } from '../context/SectionContextBuilder';
import { Parameter } from '../context/semantic/Entity';
import { parseIdentifiable } from '../protocol/LspParser';
import { Identifiable } from '../protocol/LspTypes';
import { ServerComponents } from '../server/ServerComponents';
import { analyzeCapabilities } from '../stackActions/CapabilityAnalyzer';
import { parseStackActionParams, parseTemplateMetadataParams } from '../stackActions/StackActionParser';
import {
    GetCapabilitiesResult,
    TemplateMetadataParams,
    GetParametersResult,
    StackActionParams,
    StackActionResult,
    StackActionStatusResult,
} from '../stackActions/StackActionRequestType';
import { LoggerFactory } from '../telemetry/LoggerFactory';
import { extractErrorMessage } from '../utils/Errors';
import { parseWithPrettyError } from '../utils/ZodErrorWrapper';

const log = LoggerFactory.getLogger('StackActionHandler');

export function stackActionParametersHandler(
    components: ServerComponents,
): RequestHandler<TemplateMetadataParams, GetParametersResult, void> {
    return (rawParams) => {
        log.debug({ Handler: 'StackActionParameters', rawParams });

        try {
            const params = parseWithPrettyError(parseTemplateMetadataParams, rawParams);
            const syntaxTree = components.syntaxTreeManager.getSyntaxTree(params.uri);
            if (syntaxTree) {
                const parametersMap = getEntityMap(syntaxTree, TopLevelSection.Parameters);
                if (parametersMap) {
                    const parameters = [...parametersMap.values()].map((context) => context.entity as Parameter);
                    return {
                        parameters,
                    };
                }
            }

            return {
                parameters: [],
            };
        } catch (error) {
            handleStackActionError(error, 'Failed to get parameters');
        }
    };
}

export function stackActionValidationCreateHandler(
    components: ServerComponents,
): RequestHandler<StackActionParams, StackActionResult, void> {
    return async (rawParams) => {
        log.debug({ Handler: 'StackActionValidationCreate', rawParams });

        try {
            const params = parseWithPrettyError(parseStackActionParams, rawParams);
            return await components.validationWorkflowService.start(params);
        } catch (error) {
            handleStackActionError(error, 'Failed to start validation workflow');
        }
    };
}

export function stackActionDeploymentCreateHandler(
    components: ServerComponents,
): RequestHandler<StackActionParams, StackActionResult, void> {
    return async (rawParams) => {
        log.debug({ Handler: 'StackActionDeploymentCreate', rawParams });

        try {
            const params = parseWithPrettyError(parseStackActionParams, rawParams);
            return await components.deploymentWorkflowService.start(params);
        } catch (error) {
            handleStackActionError(error, 'Failed to start deployment workflow');
        }
    };
}

export function stackActionValidationStatusHandler(
    components: ServerComponents,
): RequestHandler<Identifiable, StackActionStatusResult, void> {
    return (rawParams) => {
        log.debug({ Handler: 'StackActionValidationStatus', rawParams });

        try {
            const params = parseWithPrettyError(parseIdentifiable, rawParams);
            return components.validationWorkflowService.getStatus(params);
        } catch (error) {
            handleStackActionError(error, 'Failed to get validation status');
        }
    };
}

export function stackActionDeploymentStatusHandler(
    components: ServerComponents,
): RequestHandler<Identifiable, StackActionStatusResult, void> {
    return (rawParams) => {
        log.debug({ Handler: 'StackActionDeploymentStatus', rawParams });

        try {
            const params = parseWithPrettyError(parseIdentifiable, rawParams);
            return components.deploymentWorkflowService.getStatus(params);
        } catch (error) {
            handleStackActionError(error, 'Failed to get deployment status');
        }
    };
}

export function templateCapabilitiesHandler(
    components: ServerComponents,
): RequestHandler<TemplateMetadataParams, GetCapabilitiesResult, void> {
    return async (rawParams) => {
        log.debug({ Handler: 'TemplateCapabilities', rawParams });

        try {
            const params = parseWithPrettyError(parseTemplateMetadataParams, rawParams);
            const document = components.documentManager.get(params.uri);
            if (!document) {
                throw new ResponseError(ErrorCodes.InvalidRequest, 'Template body document not available');
            }

            const capabilities = await analyzeCapabilities(document, components.cfnService);

            return { capabilities };
        } catch (error) {
            handleStackActionError(error, 'Failed to analyze template capabilities');
        }
    };
}

function handleStackActionError(error: unknown, contextMessage: string): never {
    if (error instanceof ResponseError) {
        throw error;
    }
    if (error instanceof TypeError) {
        throw new ResponseError(ErrorCodes.InvalidParams, error.message);
    }
    throw new ResponseError(ErrorCodes.InternalError, `${contextMessage}: ${extractErrorMessage(error)}`);
}
