import { CodeActionParams, CodeAction, Command } from 'vscode-languageserver';
import { ServerRequestHandler } from 'vscode-languageserver/lib/common/server';
import { ServerComponents } from '../server/ServerComponents';
import { LoggerFactory } from '../telemetry/LoggerFactory';
import { extractErrorMessage } from '../utils/Errors';

const log = LoggerFactory.getLogger('CodeActionHandler');

export function codeActionHandler(
    components: ServerComponents,
): ServerRequestHandler<CodeActionParams, (Command | CodeAction)[] | undefined | null, (Command | CodeAction)[], void> {
    return (params, _token, _workDoneProgress, _resultProgress) => {
        log.debug({
            Handler: 'CodeAction',
            Document: params.textDocument.uri,
            Range: params.range,
            Context: params.context,
        });

        try {
            // Generate code actions using the service
            return components.codeActionService.generateCodeActions(params);
        } catch (error) {
            log.error(`Error in CodeAction handler: ${extractErrorMessage(error)}`);
            return [];
        }
    };
}
