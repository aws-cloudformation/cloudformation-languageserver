import { CompletionParams, CompletionList, CompletionItem } from 'vscode-languageserver';
import { ServerRequestHandler } from 'vscode-languageserver/lib/common/server';
import { ServerComponents } from '../server/ServerComponents';
import { TelemetryService } from '../telemetry/TelemetryService';

export function completionHandler(
    components: ServerComponents,
): ServerRequestHandler<
    CompletionParams,
    CompletionItem[] | CompletionList | undefined | null,
    CompletionItem[],
    void
> {
    return (params, _token, _workDoneProgress, _resultProgress) => {
        TelemetryService.instance.get('CompletionHandler').count('count', 1);
        return components.completionRouter.getCompletions(params);
    };
}
