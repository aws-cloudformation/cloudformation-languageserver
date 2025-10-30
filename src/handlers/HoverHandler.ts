import { Hover, HoverParams, MarkupKind } from 'vscode-languageserver';
import { ServerRequestHandler } from 'vscode-languageserver/lib/common/server';
import { ServerComponents } from '../server/ServerComponents';

export function hoverHandler(
    components: ServerComponents,
): ServerRequestHandler<HoverParams, Hover | undefined | null, never, void> {
    return (params, _token, _workDoneProgress, _resultProgress) => {
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
