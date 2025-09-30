import { ServerRequestHandler, ResponseError, ErrorCodes } from 'vscode-languageserver';
import { TopLevelSection } from '../context/ContextType';
import { getEntityMap } from '../context/SectionContextBuilder';
import { Parameter } from '../context/semantic/Entity';
import { parseIdentifiable } from '../protocol/LspParser';
import { Identifiable } from '../protocol/LspTypes';
import { ServerComponents } from '../server/ServerComponents';
import { parseStackActionParams, parseGetParametersParams } from '../stackActions/StackActionParser';
import {
    GetParametersParams,
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
): ServerRequestHandler<GetParametersParams, GetParametersResult, never, void> {
    return (rawParams, _token, _workDoneProgress, _resultProgress) => {
        log.debug({ Handler: 'StackActionParameters', rawParams });

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
            handleStackActionError(error, 'Failed to get parameters');
        }
    };
}

export function stackActionValidationCreateHandler(
    components: ServerComponents,
): ServerRequestHandler<StackActionParams, StackActionResult, never, void> {
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
): ServerRequestHandler<StackActionParams, StackActionResult, never, void> {
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
): ServerRequestHandler<Identifiable, StackActionStatusResult, never, void> {
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
): ServerRequestHandler<Identifiable, StackActionStatusResult, never, void> {
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

function handleStackActionError(error: unknown, contextMessage: string): never {
    if (error instanceof ResponseError) {
        throw error;
    }
    if (error instanceof TypeError) {
        throw new ResponseError(ErrorCodes.InvalidParams, error.message);
    }
    throw new ResponseError(ErrorCodes.InternalError, `${contextMessage}: ${extractErrorMessage(error)}`);
}
