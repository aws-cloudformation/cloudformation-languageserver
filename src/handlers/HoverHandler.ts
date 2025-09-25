import { Hover, HoverParams, MarkupKind } from 'vscode-languageserver';
import { ServerRequestHandler } from 'vscode-languageserver/lib/common/server';
import { ServerComponents } from '../server/ServerComponents';
import { LoggerFactory } from '../telemetry/LoggerFactory';

const log = LoggerFactory.getLogger('HoverHandler');

export function hoverHandler(
    components: ServerComponents,
): ServerRequestHandler<HoverParams, Hover | undefined | null, never, void> {
    return (params, _token, _workDoneProgress, _resultProgress) => {
        log.debug({
            Handler: 'Hover',
            Document: params.textDocument.uri,
            Position: params.position,
        });

        const doc = components.hoverRouter.getHoverDoc(params);
        if (doc === undefined) {
            return {
                contents: [],
            };
        }

        return {
            contents: {
                kind: MarkupKind.Markdown,
                value: doc,
            },
        };
    };
}
