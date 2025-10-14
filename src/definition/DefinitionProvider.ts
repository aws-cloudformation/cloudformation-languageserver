import { DefinitionParams, Location, LocationLink } from 'vscode-languageserver';
import { ContextManager } from '../context/ContextManager';
import { LoggerFactory } from '../telemetry/LoggerFactory';
import { Track } from '../telemetry/TelemetryDecorator';
import { pointToPosition } from '../utils/TypeConverters';

export class DefinitionProvider {
    private readonly log = LoggerFactory.getLogger(DefinitionProvider);

    constructor(private readonly contextManager: ContextManager) {}

    @Track({ name: 'getDefinitions' })
    getDefinitions(params: DefinitionParams): Location | Location[] | LocationLink[] | undefined {
        const context = this.contextManager.getContextAndRelatedEntities(params);
        this.log.debug(
            {
                Router: 'Definition',
                Position: params.position,
            },
            'Processing go-to definition request',
        );

        if (!context) {
            return;
        }
        const locations = [];
        for (const section of context.relatedEntities.values()) {
            const relatedContext = section.get(context.text);
            if (relatedContext) {
                locations.push(
                    Location.create(params.textDocument.uri, {
                        start: pointToPosition(relatedContext.startPosition),
                        end: pointToPosition(relatedContext.endPosition),
                    }),
                );
            }
        }

        if (locations.length === 0) {
            return undefined;
        } else if (locations.length === 1) {
            return locations[0];
        }
        return locations;
    }
}
