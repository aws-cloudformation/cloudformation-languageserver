import { ServerRequestHandler, ResponseError, ErrorCodes } from 'vscode-languageserver';
import { TopLevelSection } from '../context/ContextType';
import { getEntityMap } from '../context/SectionContextBuilder';
import { Parameter } from '../context/semantic/Entity';
import { parseIdentifiable } from '../protocol/LspParser';
import { Identifiable } from '../protocol/LspTypes';
import { ServerComponents } from '../server/ServerComponents';
import { LoggerFactory } from '../telemetry/LoggerFactory';
import { parseTemplateActionParams, parseGetParametersParams } from '../templates/TemplateParser';
import {
    GetParametersParams,
    GetParametersResult,
    TemplateActionParams,
    TemplateActionResult,
    TemplateStatusResult,
} from '../templates/TemplateRequestType';
import { extractErrorMessage } from '../utils/Errors';
import { parseWithPrettyError } from '../utils/ZodErrorWrapper';

const log = LoggerFactory.getLogger('TemplateHandler');

export function templateParametersHandler(
    components: ServerComponents,
): ServerRequestHandler<GetParametersParams, GetParametersResult, never, void> {
    return (rawParams, _token, _workDoneProgress, _resultProgress) => {
        log.debug({ Handler: 'TemplateParameters', rawParams });

        try {
            const params = parseWithPrettyError(parseGetParametersParams, rawParams);
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
): ServerRequestHandler<TemplateActionParams, TemplateActionResult, never, void> {
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
): ServerRequestHandler<TemplateActionParams, TemplateActionResult, never, void> {
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
): ServerRequestHandler<Identifiable, TemplateStatusResult, never, void> {
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
): ServerRequestHandler<Identifiable, TemplateStatusResult, never, void> {
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

function handleTemplateError(error: unknown, contextMessage: string): never {
    if (error instanceof ResponseError) {
        throw error;
    }
    if (error instanceof TypeError) {
        throw new ResponseError(ErrorCodes.InvalidParams, error.message);
    }
    throw new ResponseError(ErrorCodes.InternalError, `${contextMessage}: ${extractErrorMessage(error)}`);
}
