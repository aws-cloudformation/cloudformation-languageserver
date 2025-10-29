import { RequestHandler } from 'vscode-languageserver/node';
import { InlineCompletionParams, InlineCompletionList, InlineCompletionItem } from 'vscode-languageserver-protocol';
import { ServerComponents } from '../server/ServerComponents';

export function inlineCompletionHandler(
    components: ServerComponents,
): RequestHandler<InlineCompletionParams, InlineCompletionList | InlineCompletionItem[] | null | undefined, void> {
    return (params, _token) => {
        return components.inlineCompletionRouter.getInlineCompletions(params);
    };
}
