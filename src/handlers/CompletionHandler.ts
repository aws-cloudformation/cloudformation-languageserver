import { CompletionParams, CompletionList, CompletionItem } from 'vscode-languageserver';
import { ServerRequestHandler } from 'vscode-languageserver/lib/common/server';
import { ServerComponents } from '../server/ServerComponents';
import { LoggerFactory } from '../telemetry/LoggerFactory';

const log = LoggerFactory.getLogger('CompletionHandler');

export function completionHandler(
    components: ServerComponents,
): ServerRequestHandler<
    CompletionParams,
    CompletionItem[] | CompletionList | undefined | null,
    CompletionItem[],
    void
> {
    return (params, _token, _workDoneProgress, _resultProgress) => {
        log.debug({
            Handler: 'Completion',
            Document: params.textDocument.uri,
            Position: params.position,
        });
        return components.completionRouter.getCompletions(params);
    };
}
