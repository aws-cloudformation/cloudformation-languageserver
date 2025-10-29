import { DocumentSymbol, DocumentSymbolParams } from 'vscode-languageserver';
import { ServerRequestHandler } from 'vscode-languageserver/lib/common/server';
import { ServerComponents } from '../server/ServerComponents';

export function documentSymbolHandler(
    components: ServerComponents,
): ServerRequestHandler<DocumentSymbolParams, DocumentSymbol[] | null | undefined, DocumentSymbol[], void> {
    return (params, _token, _workDoneProgress, _resultProgress) => {
        return components.documentSymbolRouter.getDocumentSymbols(params);
    };
}
