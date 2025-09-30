import { ResponseError, ErrorCodes, RequestHandler } from 'vscode-languageserver';
import { TopLevelSection } from '../context/ContextType';
import { getEntityMap } from '../context/SectionContextBuilder';
import { Parameter } from '../context/semantic/Entity';
import { parseIdentifiable } from '../protocol/LspParser';
import { Identifiable } from '../protocol/LspTypes';
import { ServerComponents } from '../server/ServerComponents';
import { LoggerFactory } from '../telemetry/LoggerFactory';
import { analyzeCapabilities } from '../templates/CapabilityAnalyzer';
import { parseTemplateActionParams, parseTemplateMetadataParams } from '../templates/TemplateParser';
import {
    TemplateMetadataParams,
    GetParametersResult,
    GetCapabilitiesResult,
    TemplateActionParams,
    TemplateActionResult,
    TemplateStatusResult,
} from '../templates/TemplateRequestType';
import { extractErrorMessage } from '../utils/Errors';
import { parseWithPrettyError } from '../utils/ZodErrorWrapper';

const log = LoggerFactory.getLogger('TemplateHandler');

export function templateParametersHandler(
    components: ServerComponents,
): RequestHandler<TemplateMetadataParams, GetParametersResult, void> {
    return (rawParams) => {
        log.debug({ Handler: 'TemplateParameters', rawParams });

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
            handleTemplateError(error, 'Failed to get parameters');
        }
    };
}

export function templateValidationCreateHandler(
    components: ServerComponents,
): RequestHandler<TemplateActionParams, TemplateActionResult, void> {
    return async (rawParams) => {
        log.debug({ Handler: 'TemplateValidationCreate', rawParams });

        try {
            const params = parseWithPrettyError(parseTemplateActionParams, rawParams);
            return await components.validationWorkflowService.start(params);
        } catch (error) {
            handleTemplateError(error, 'Failed to start validation workflow');
        }
    };
}

export function templateDeploymentCreateHandler(
    components: ServerComponents,
): RequestHandler<TemplateActionParams, TemplateActionResult, void> {
    return async (rawParams) => {
        log.debug({ Handler: 'TemplateDeploymentCreate', rawParams });

        try {
            const params = parseWithPrettyError(parseTemplateActionParams, rawParams);
            return await components.deploymentWorkflowService.start(params);
        } catch (error) {
            handleTemplateError(error, 'Failed to start deployment workflow');
        }
    };
}

export function templateValidationStatusHandler(
    components: ServerComponents,
): RequestHandler<Identifiable, TemplateStatusResult, void> {
    return (rawParams) => {
        log.debug({ Handler: 'TemplateValidationStatus', rawParams });

        try {
            const params = parseWithPrettyError(parseIdentifiable, rawParams);
            return components.validationWorkflowService.getStatus(params);
        } catch (error) {
            handleTemplateError(error, 'Failed to get validation status');
        }
    };
}

export function templateDeploymentStatusHandler(
    components: ServerComponents,
): RequestHandler<Identifiable, TemplateStatusResult, void> {
    return (rawParams) => {
        log.debug({ Handler: 'TemplateDeploymentStatus', rawParams });

        try {
            const params = parseWithPrettyError(parseIdentifiable, rawParams);
            return components.deploymentWorkflowService.getStatus(params);
        } catch (error) {
            handleTemplateError(error, 'Failed to get deployment status');
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
            handleTemplateError(error, 'Failed to analyze template capabilities');
        }
    };
}

function handleTemplateError(error: unknown, contextMessage: string): never {
    if (error instanceof ResponseError) {
        throw error;
    }
    if (error instanceof TypeError) {
        throw new ResponseError(ErrorCodes.InvalidParams, error.message);
    }
    throw new ResponseError(ErrorCodes.InternalError, `${contextMessage}: ${extractErrorMessage(error)}`);
}
