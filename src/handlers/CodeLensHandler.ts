import { CodeLens, CodeLensParams } from 'vscode-languageserver';
import { ServerRequestHandler } from 'vscode-languageserver/lib/common/server';
import { ServerComponents } from '../server/ServerComponents';
import { TelemetryService } from '../telemetry/TelemetryService';

export function codeLensHandler(
    components: ServerComponents,
): ServerRequestHandler<CodeLensParams, CodeLens[] | undefined | null, CodeLens[], void> {
    return (params, _token, _workDoneProgress, _resultProgress) => {
        TelemetryService.instance.get('CodeLensHandler').count('count', 1);
        return components.codeLensProvider.getCodeLenses(params.textDocument.uri);
    };
}
