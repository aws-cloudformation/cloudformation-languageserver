import { ResponseError, ErrorCodes, RequestHandler } from 'vscode-languageserver';
import { TopLevelSection } from '../context/ContextType';
import { getEntityMap } from '../context/SectionContextBuilder';
import { Parameter } from '../context/semantic/Entity';
import { parseIdentifiable } from '../protocol/LspParser';
import { Identifiable } from '../protocol/LspTypes';
import { ServerComponents } from '../server/ServerComponents';
import { analyzeCapabilities } from '../stacks/actions/CapabilityAnalyzer';
import { parseStackActionParams, parseTemplateUriParams } from '../stacks/actions/StackActionParser';
import {
    GetCapabilitiesResult,
    TemplateUri,
    GetParametersResult,
    CreateStackActionParams,
    CreateStackActionResult,
    GetStackActionStatusResult,
    DescribeValidationStatusResult,
    DescribeDeploymentStatusResult,
} from '../stacks/actions/StackActionRequestType';
import { ListStacksParams, ListStacksResult } from '../stacks/StackRequestType';
import { LoggerFactory } from '../telemetry/LoggerFactory';
import { extractErrorMessage } from '../utils/Errors';
import { parseWithPrettyError } from '../utils/ZodErrorWrapper';

const log = LoggerFactory.getLogger('StackHandler');

export function getParametersHandler(
    components: ServerComponents,
): RequestHandler<TemplateUri, GetParametersResult, void> {
    return (rawParams) => {
        log.debug({ Handler: 'getParametersHandler', rawParams });

        try {
            const params = parseWithPrettyError(parseTemplateUriParams, rawParams);
            const syntaxTree = components.syntaxTreeManager.getSyntaxTree(params);
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

export function createValidationHandler(
    components: ServerComponents,
): RequestHandler<CreateStackActionParams, CreateStackActionResult, void> {
    return async (rawParams) => {
        log.debug({ Handler: 'createValidationHandler', rawParams });

        try {
            const params = parseWithPrettyError(parseStackActionParams, rawParams);
            return await components.validationWorkflowService.start(params);
        } catch (error) {
            handleStackActionError(error, 'Failed to start validation workflow');
        }
    };
}

export function createDeploymentHandler(
    components: ServerComponents,
): RequestHandler<CreateStackActionParams, CreateStackActionResult, void> {
    return async (rawParams) => {
        log.debug({ Handler: 'createDeploymentHandler', rawParams });

        try {
            const params = parseWithPrettyError(parseStackActionParams, rawParams);
            return await components.deploymentWorkflowService.start(params);
        } catch (error) {
            handleStackActionError(error, 'Failed to start deployment workflow');
        }
    };
}

export function getValidationStatusHandler(
    components: ServerComponents,
): RequestHandler<Identifiable, GetStackActionStatusResult, void> {
    return (rawParams) => {
        log.debug({ Handler: 'getValidationStatusHandler', rawParams });

        try {
            const params = parseWithPrettyError(parseIdentifiable, rawParams);
            return components.validationWorkflowService.getStatus(params);
        } catch (error) {
            handleStackActionError(error, 'Failed to get validation status');
        }
    };
}

export function getDeploymentStatusHandler(
    components: ServerComponents,
): RequestHandler<Identifiable, GetStackActionStatusResult, void> {
    return (rawParams) => {
        log.debug({ Handler: 'getDeploymentStatusHandler', rawParams });

        try {
            const params = parseWithPrettyError(parseIdentifiable, rawParams);
            return components.deploymentWorkflowService.getStatus(params);
        } catch (error) {
            handleStackActionError(error, 'Failed to get deployment status');
        }
    };
}

export function describeValidationStatusHandler(
    components: ServerComponents,
): RequestHandler<Identifiable, DescribeValidationStatusResult, void> {
    return (rawParams) => {
        log.debug({ Handler: 'describeValidationStatusHandler', rawParams });

        try {
            const params = parseWithPrettyError(parseIdentifiable, rawParams);
            return components.validationWorkflowService.describeStatus(params);
        } catch (error) {
            handleStackActionError(error, 'Failed to describe validation status');
        }
    };
}

export function describeDeploymentStatusHandler(
    components: ServerComponents,
): RequestHandler<Identifiable, DescribeDeploymentStatusResult, void> {
    return (rawParams) => {
        log.debug({ Handler: 'describeDeploymentStatusHandler', rawParams });

        try {
            const params = parseWithPrettyError(parseIdentifiable, rawParams);
            return components.deploymentWorkflowService.describeStatus(params);
        } catch (error) {
            handleStackActionError(error, 'Failed to describe deployment status');
        }
    };
}

export function getCapabilitiesHandler(
    components: ServerComponents,
): RequestHandler<TemplateUri, GetCapabilitiesResult, void> {
    return async (rawParams) => {
        log.debug({ Handler: 'getCapabilitiesHandler', rawParams });

        try {
            const params = parseWithPrettyError(parseTemplateUriParams, rawParams);
            const document = components.documentManager.get(params);
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

export function listStacksHandler(
    components: ServerComponents,
): RequestHandler<ListStacksParams, ListStacksResult, void> {
    return async (params: ListStacksParams): Promise<ListStacksResult> => {
        try {
            if (params.statusToInclude?.length && params.statusToExclude?.length) {
                throw new Error('Cannot specify both statusToInclude and statusToExclude');
            }
            return { stacks: await components.cfnService.listStacks(params.statusToInclude, params.statusToExclude) };
        } catch (error) {
            log.error({ error: extractErrorMessage(error) }, 'Error listing stacks');
            return { stacks: [] };
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
