import { DocumentSymbol, DocumentSymbolParams } from 'vscode-languageserver';
import { ServerRequestHandler } from 'vscode-languageserver/lib/common/server';
import { ServerComponents } from '../server/ServerComponents';
import { LoggerFactory } from '../telemetry/LoggerFactory';

const log = LoggerFactory.getLogger('DocumentSymbolHandler');

export function documentSymbolHandler(
    components: ServerComponents,
): ServerRequestHandler<DocumentSymbolParams, DocumentSymbol[] | null | undefined, DocumentSymbol[], void> {
    return (params, _token, _workDoneProgress, _resultProgress) => {
        log.debug({
            Handler: 'DocumentSymbol',
            Document: params.textDocument.uri,
        });

        return components.documentSymbolRouter.getDocumentSymbols(params);
    };
}
