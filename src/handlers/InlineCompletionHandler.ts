import { RequestHandler } from 'vscode-languageserver/node';
import { InlineCompletionParams, InlineCompletionList, InlineCompletionItem } from 'vscode-languageserver-protocol';
import { ServerComponents } from '../server/ServerComponents';
import { TelemetryService } from '../telemetry/TelemetryService';

export function inlineCompletionHandler(
    components: ServerComponents,
): RequestHandler<InlineCompletionParams, InlineCompletionList | InlineCompletionItem[] | null | undefined, void> {
    return (params, _token) => {
        TelemetryService.instance.get('InlineCompletionHandler').count('execute', 1, { unit: '1' });
        return components.inlineCompletionRouter.getInlineCompletions(params);
    };
}
