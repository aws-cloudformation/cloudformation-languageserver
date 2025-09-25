import { DefinitionParams, Location, Definition, DefinitionLink } from 'vscode-languageserver';
import { ServerRequestHandler } from 'vscode-languageserver/lib/common/server';
import { ServerComponents } from '../server/ServerComponents';
import { LoggerFactory } from '../telemetry/LoggerFactory';

const log = LoggerFactory.getLogger('DefinitionHandler');

export function definitionHandler(
    components: ServerComponents,
): ServerRequestHandler<
    DefinitionParams,
    Definition | DefinitionLink[] | undefined | null,
    Location[] | DefinitionLink[],
    void
> {
    return (params, _token, _workDoneProgress, _resultProgress) => {
        log.debug({
            Handler: 'Definition',
            Document: params.textDocument.uri,
            Position: params.position,
        });

        return components.definitionProvider.getDefinitions(params);
    };
}
