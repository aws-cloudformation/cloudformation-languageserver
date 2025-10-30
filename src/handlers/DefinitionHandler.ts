import { DefinitionParams, Location, Definition, DefinitionLink } from 'vscode-languageserver';
import { ServerRequestHandler } from 'vscode-languageserver/lib/common/server';
import { ServerComponents } from '../server/ServerComponents';
import { TelemetryService } from '../telemetry/TelemetryService';

export function definitionHandler(
    components: ServerComponents,
): ServerRequestHandler<
    DefinitionParams,
    Definition | DefinitionLink[] | undefined | null,
    Location[] | DefinitionLink[],
    void
> {
    return (params, _token, _workDoneProgress, _resultProgress) => {
        TelemetryService.instance.get('DefinitionHandler').count('count', 1);
        return components.definitionProvider.getDefinitions(params);
    };
}
