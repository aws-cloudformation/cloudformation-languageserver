import { RequestHandler } from 'vscode-languageserver/node';
import { InlineCompletionParams, InlineCompletionList, InlineCompletionItem } from 'vscode-languageserver-protocol';
import { ServerComponents } from '../server/ServerComponents';
import { LoggerFactory } from '../telemetry/LoggerFactory';

const log = LoggerFactory.getLogger('InlineCompletionHandler');

export function inlineCompletionHandler(
    components: ServerComponents,
): RequestHandler<InlineCompletionParams, InlineCompletionList | InlineCompletionItem[] | null | undefined, void> {
    return (params, _token) => {
        log.debug({
            Handler: 'InlineCompletion',
            Document: params.textDocument.uri,
            Position: params.position,
            TriggerKind: params.context.triggerKind,
        });
        return components.inlineCompletionRouter.getInlineCompletions(params);
    };
}
