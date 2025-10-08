import { CodeLens, CodeLensParams } from 'vscode-languageserver';
import { ServerRequestHandler } from 'vscode-languageserver/lib/common/server';
import { getStackActionsCodeLenses } from '../codeLens/StackActionsCodeLens';
import { ServerComponents } from '../server/ServerComponents';
import { LoggerFactory } from '../telemetry/LoggerFactory';

const log = LoggerFactory.getLogger('CodeLensHandler');

export function codeLensHandler(
    components: ServerComponents,
): ServerRequestHandler<CodeLensParams, CodeLens[], never, void> {
    return (params, _token, _workDoneProgress, _resultProgress) => {
        log.debug({
            Handler: 'CodeLens',
            Document: params.textDocument.uri,
        });

        const document = components.documents.documents.get(params.textDocument.uri);
        if (!document) {
            return [];
        }

        const stackActions = getStackActionsCodeLenses(params.textDocument.uri);
        const managedResourceActions = components.managedResourceCodeLens.getCodeLenses(
            params.textDocument.uri,
            document,
        );

        return [...stackActions, ...managedResourceActions];
    };
}
