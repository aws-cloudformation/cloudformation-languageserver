import { CodeLens, CodeLensParams } from 'vscode-languageserver';
import { ServerRequestHandler } from 'vscode-languageserver/lib/common/server';
import { ServerComponents } from '../server/ServerComponents';

export function codeLensHandler(
    components: ServerComponents,
): ServerRequestHandler<CodeLensParams, CodeLens[] | undefined | null, CodeLens[], void> {
    return (params, _token, _workDoneProgress, _resultProgress) => {
        return components.codeLensProvider.getCodeLenses(params.textDocument.uri);
    };
}
