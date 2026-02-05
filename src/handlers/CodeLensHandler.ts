import { CodeLens, CodeLensParams, ServerRequestHandler } from 'vscode-languageserver';
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
