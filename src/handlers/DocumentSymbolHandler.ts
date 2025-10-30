import { DocumentSymbol, DocumentSymbolParams } from 'vscode-languageserver';
import { ServerRequestHandler } from 'vscode-languageserver/lib/common/server';
import { ServerComponents } from '../server/ServerComponents';
import { TelemetryService } from '../telemetry/TelemetryService';

export function documentSymbolHandler(
    components: ServerComponents,
): ServerRequestHandler<DocumentSymbolParams, DocumentSymbol[] | null | undefined, DocumentSymbol[], void> {
    return (params, _token, _workDoneProgress, _resultProgress) => {
        TelemetryService.instance.get('DocumentSymbolHandler').count('count', 1);
        return components.documentSymbolRouter.getDocumentSymbols(params);
    };
}
