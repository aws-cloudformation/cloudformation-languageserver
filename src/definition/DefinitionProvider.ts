import { DefinitionParams, Location } from 'vscode-languageserver';
import { ContextManager } from '../context/ContextManager';
import { LoggerFactory } from '../telemetry/LoggerFactory';
import { Track } from '../telemetry/TelemetryDecorator';
import { pointToPosition } from '../utils/TypeConverters';

export class DefinitionProvider {
    private readonly log = LoggerFactory.getLogger(DefinitionProvider);

    constructor(private readonly contextManager: ContextManager) {}

    @Track({ name: 'getDefinitions' })
    getDefinitions(params: DefinitionParams) {
        const context = this.contextManager.getContextAndRelatedEntities(params);
        if (!context) {
            return;
        }
        const locations = [];
        for (const section of context.relatedEntities.values()) {
            // For GetAtt expressions like "Vpc.VpcId", extract just the resource name "Vpc"
            const searchText = context.text.includes('.') ? context.text.split('.')[0] : context.text;

            const relatedContext = section.get(searchText);
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
            return;
        } else if (locations.length === 1) {
            return locations[0];
        }
        return locations;
    }
}
