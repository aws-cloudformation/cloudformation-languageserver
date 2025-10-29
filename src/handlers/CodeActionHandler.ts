import { CodeActionParams, CodeAction, Command } from 'vscode-languageserver';
import { ServerRequestHandler } from 'vscode-languageserver/lib/common/server';
import { ServerComponents } from '../server/ServerComponents';
import { LoggerFactory } from '../telemetry/LoggerFactory';

const log = LoggerFactory.getLogger('CodeActionHandler');

export function codeActionHandler(
    components: ServerComponents,
): ServerRequestHandler<CodeActionParams, (Command | CodeAction)[] | undefined | null, (Command | CodeAction)[], void> {
    return (params, _token, _workDoneProgress, _resultProgress) => {
        try {
            return components.codeActionService.generateCodeActions(params);
        } catch (error) {
            log.error(error, `Error in CodeAction handler`);
            return [];
        }
    };
}
