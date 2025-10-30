import { CompletionParams, CompletionList, CompletionItem } from 'vscode-languageserver';
import { ServerRequestHandler } from 'vscode-languageserver/lib/common/server';
import { ServerComponents } from '../server/ServerComponents';

export function completionHandler(
    components: ServerComponents,
): ServerRequestHandler<
    CompletionParams,
    CompletionItem[] | CompletionList | undefined | null,
    CompletionItem[],
    void
> {
    return (params, _token, _workDoneProgress, _resultProgress) => {
        return components.completionRouter.getCompletions(params);
    };
}
