import { CompletionItem, CompletionParams, CompletionTriggerKind } from 'vscode-languageserver';
import { Context } from '../context/Context';
import { Resource } from '../context/semantic/Entity';
import { ServerComponents } from '../server/ServerComponents';
import { LoggerFactory } from '../telemetry/LoggerFactory';
import { CompletionProvider } from './CompletionProvider';
import { ResourceEntityCompletionProvider } from './ResourceEntityCompletionProvider';
import { ResourcePropertyCompletionProvider } from './ResourcePropertyCompletionProvider';
import { ResourceStateCompletionProvider } from './ResourceStateCompletionProvider';
import { ResourceTypeCompletionProvider } from './ResourceTypeCompletionProvider';

enum ResourceCompletionType {
    Entity = 'Entity',
    Type = 'Type',
    Property = 'Property',
    State = 'State',
}

export class ResourceSectionCompletionProvider implements CompletionProvider {
    private readonly log = LoggerFactory.getLogger(ResourceSectionCompletionProvider);

    constructor(
        components: ServerComponents,
        private readonly resourceProviders = createResourceCompletionProviders(components),
    ) {}

    getCompletions(
        context: Context,
        params: CompletionParams,
    ): Promise<CompletionItem[]> | CompletionItem[] | undefined {
        this.log.debug(
            {
                provider: 'Resource Completion',
                position: params.position,
            },
            'Processing resource completion request',
        );

        if (context.atEntityKeyLevel()) {
            return this.resourceProviders
                .get(ResourceCompletionType.Entity)
                ?.getCompletions(context, params) as CompletionItem[];
        } else if (context.entitySection === 'Type') {
            return this.resourceProviders
                .get(ResourceCompletionType.Type)
                ?.getCompletions(context, params) as CompletionItem[];
        } else if (context.entitySection === 'Properties' || context.isInSchemaDefinedObject()) {
            const schemaPropertyCompletions = this.resourceProviders
                .get(ResourceCompletionType.Property)
                ?.getCompletions(context, params) as CompletionItem[];

            if (params.context?.triggerKind === CompletionTriggerKind.Invoked && context.propertyPath.length === 3) {
                const resource = context.entity as Resource;
                if (resource.Type) {
                    const stateCompletionPromise = this.resourceProviders
                        .get(ResourceCompletionType.State)
                        ?.getCompletions(context, params) as Promise<CompletionItem[]>;

                    return stateCompletionPromise
                        .then((stateCompletion) => {
                            return [...stateCompletion, ...schemaPropertyCompletions];
                        })
                        .catch((error) => {
                            this.log.debug(error, 'Received error from resource state autocomplete');
                            // Fallback to just property completions if state completions fail
                            return schemaPropertyCompletions;
                        });
                }
            }
            return schemaPropertyCompletions;
        }
        return [];
    }
}

export function createResourceCompletionProviders(
    components: ServerComponents,
): Map<ResourceCompletionType, CompletionProvider> {
    const resourceProviderMap = new Map<ResourceCompletionType, CompletionProvider>();
    resourceProviderMap.set(
        ResourceCompletionType.Entity,
        new ResourceEntityCompletionProvider(components.schemaRetriever, components.documentManager),
    );
    resourceProviderMap.set(
        ResourceCompletionType.Type,
        new ResourceTypeCompletionProvider(components.schemaRetriever),
    );
    resourceProviderMap.set(
        ResourceCompletionType.Property,
        new ResourcePropertyCompletionProvider(components.schemaRetriever),
    );
    resourceProviderMap.set(
        ResourceCompletionType.State,
        new ResourceStateCompletionProvider(
            components.resourceStateManager,
            components.documentManager,
            components.schemaRetriever,
        ),
    );
    return resourceProviderMap;
}
