import { ServerRequestHandler } from 'vscode-languageserver/lib/common/server';
import { InlineCompletionParams, InlineCompletionList } from 'vscode-languageserver-protocol';
import { ServerComponents } from '../server/ServerComponents';
import { LoggerFactory } from '../telemetry/LoggerFactory';

const log = LoggerFactory.getLogger('InlineCompletionHandler');

export function inlineCompletionHandler(
    components: ServerComponents,
): ServerRequestHandler<InlineCompletionParams, InlineCompletionList | undefined | null, never, void> {
    return (params, _token, _workDoneProgress, _resultProgress) => {
        log.debug({
            Handler: 'InlineCompletion',
            Document: params.textDocument.uri,
            Position: params.position,
            TriggerKind: params.context.triggerKind,
        });
        return components.inlineCompletionRouter.getInlineCompletions(params);
    };
}
