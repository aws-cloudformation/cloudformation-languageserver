import { CodeLens, CodeLensParams } from 'vscode-languageserver';
import { ServerRequestHandler } from 'vscode-languageserver/lib/common/server';
import { ServerComponents } from '../server/ServerComponents';
import { LoggerFactory } from '../telemetry/LoggerFactory';

const log = LoggerFactory.getLogger('CodeLensHandler');

export function codeLensHandler(
    components: ServerComponents,
): ServerRequestHandler<CodeLensParams, CodeLens[] | undefined | null, CodeLens[], void> {
    return (params, _token, _workDoneProgress, _resultProgress) => {
        log.debug({
            Handler: 'CodeLens',
            Document: params.textDocument.uri,
        });

        return components.codeLensProvider.getCodeLenses(params.textDocument.uri);
    };
}
