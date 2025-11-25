import { Hover, HoverParams, MarkupKind } from 'vscode-languageserver';
import { ServerRequestHandler } from 'vscode-languageserver/lib/common/server';
import { ServerComponents } from '../server/ServerComponents';
import { TelemetryService } from '../telemetry/TelemetryService';
import { EventType } from '../usageTracker/UsageTracker';

export function hoverHandler(
    components: ServerComponents,
): ServerRequestHandler<HoverParams, Hover | undefined | null, never, void> {
    return (params, _token, _workDoneProgress, _resultProgress) => {
        TelemetryService.instance.get('HoverHandler').count('count', 1);
        const doc = components.hoverRouter.getHoverDoc(params);
        if (doc === undefined) {
            return {
                contents: [],
            };
        }

        components.usageTracker.track(EventType.MeaningfulHover);
        return {
            contents: {
                kind: MarkupKind.Markdown,
                value: doc,
            },
        };
    };
}
