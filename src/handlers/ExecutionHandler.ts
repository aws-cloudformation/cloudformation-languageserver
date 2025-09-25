import { ExecuteCommandParams, MessageType } from 'vscode-languageserver';
import { ServerRequestHandler } from 'vscode-languageserver/lib/common/server';
import { ServerComponents } from '../server/ServerComponents';
import { LoggerFactory } from '../telemetry/LoggerFactory';
import { extractErrorMessage } from '../utils/Errors';
import { toString } from '../utils/String';

const log = LoggerFactory.getLogger('ExecutionHandler');

export function executionHandler(
    components: ServerComponents,
): ServerRequestHandler<ExecuteCommandParams, unknown, never, void> {
    return (params): unknown => {
        log.debug({
            Handler: 'Execution',
            Command: params.command,
            Arguments: params.arguments,
        });

        switch (params.command) {
            case DESCRIBE_TEMPLATE: {
                return executeWithError(components, async () => {
                    const message = await components.cfnAI.describeTemplate(params.arguments?.[0]);
                    return message?.content;
                });
            }
            case OPTIMIZE_TEMPLATE: {
                return executeWithError(components, async () => {
                    const message = await components.cfnAI.optimizeTemplate(params.arguments?.[0]);
                    return message?.content;
                });
            }
            case GENERATE_TEMPLATE: {
                return executeWithError(components, async () => {
                    const message = await components.cfnAI.generateTemplate(params.arguments?.[0] as string);
                    return message?.content;
                });
            }
            case ANALYZE_DIAGNOSTIC: {
                return executeWithError(components, async () => {
                    const message = await components.cfnAI.analyzeDiagnostic(
                        params.arguments?.[0] as string,
                        params.arguments?.[1],
                    );
                    if (message) {
                        await components.documents.sendDocumentPreview({
                            content: `# AI Overview: Fix Diagnostics\n${toString(message.content)}`,
                            language: 'markdown',
                            viewColumn: -2,
                            preserveFocus: true,
                        });
                    }
                });
            }
            case RECOMMEND_RELATED_RESOURCES: {
                return executeWithError(components, async () => {
                    const message = await components.cfnAI.recommendRelatedResources(params.arguments?.[0]);
                    return message?.content;
                });
            }
            case CLEAR_DIAGNOSTIC: {
                const args = params.arguments ?? [];
                if (args.length >= 2) {
                    const uri = args[0] as string;
                    const diagnosticId = args[1] as string;
                    components.diagnosticCoordinator
                        .handleClearCfnDiagnostic(uri, diagnosticId)
                        .catch((err) =>
                            components.clientMessage.error(`Error clearing diagnostic: ${extractErrorMessage(err)}`),
                        );
                }
                break;
            }
            default: {
                // do nothing
                break;
            }
        }
    };
}

async function executeWithError(components: ServerComponents, operation: () => unknown) {
    try {
        return await operation();
    } catch (error) {
        void components.clientMessage.showMessageNotification(MessageType.Error, extractErrorMessage(error));
    }
}

export const DESCRIBE_TEMPLATE = '/command/llm/template/describe';
export const GENERATE_TEMPLATE = '/command/llm/template/generate';
export const OPTIMIZE_TEMPLATE = '/command/llm/template/optimize';
export const ANALYZE_DIAGNOSTIC = '/command/llm/diagnostic/analyze';
export const RECOMMEND_RELATED_RESOURCES = '/command/llm/template/recommend-related';
export const CLEAR_DIAGNOSTIC = '/command/template/clear-diagnostic';
