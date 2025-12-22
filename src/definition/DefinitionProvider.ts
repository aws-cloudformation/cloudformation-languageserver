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
            let searchText = context.text.includes('.') ? context.text.split('.')[0] : context.text;

            // When cursor is inside a Sub string like "${Variable}", context.text may be empty
            // or contain the full "${...}" pattern - extract the variable name from parent nodes
            if (!searchText || searchText.includes('${')) {
                const subVar = this.extractSubVariable(context.entityRootNode?.text);
                if (subVar) {
                    searchText = subVar;
                }
            }

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

    private extractSubVariable(text: string | undefined): string | undefined {
        if (!text) {
            return undefined;
        }

        const match = /\$\{([^}]+)}/.exec(text);
        if (match) {
            return match[1].split('.')[0]; // Return base name for GetAtt-style refs like ${Resource.Attr}
        }
    }
}
