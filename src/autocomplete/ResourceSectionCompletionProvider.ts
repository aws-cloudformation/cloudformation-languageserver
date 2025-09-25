import { CompletionItem, CompletionParams, CompletionTriggerKind } from 'vscode-languageserver';
import { Context } from '../context/Context';
import { Resource } from '../context/semantic/Entity';
import { DocumentManager } from '../document/DocumentManager';
import { ResourceStateManager } from '../resourceState/ResourceStateManager';
import { SchemaRetriever } from '../schema/SchemaRetriever';
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
        schemaRetriever: SchemaRetriever,
        documentManager: DocumentManager,
        resourceStateManager: ResourceStateManager,
        private readonly resourceProviders = createResourceCompletionProviders(
            schemaRetriever,
            documentManager,
            resourceStateManager,
        ),
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
        } else if (context.entitySection === 'Properties') {
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
    schemaRetriever: SchemaRetriever,
    documentManager: DocumentManager,
    resourceStateManager: ResourceStateManager,
): Map<ResourceCompletionType, CompletionProvider> {
    const resourceProviderMap = new Map<ResourceCompletionType, CompletionProvider>();
    resourceProviderMap.set(
        ResourceCompletionType.Entity,
        new ResourceEntityCompletionProvider(schemaRetriever, documentManager),
    );
    resourceProviderMap.set(ResourceCompletionType.Type, new ResourceTypeCompletionProvider(schemaRetriever));
    resourceProviderMap.set(ResourceCompletionType.Property, new ResourcePropertyCompletionProvider(schemaRetriever));
    resourceProviderMap.set(
        ResourceCompletionType.State,
        new ResourceStateCompletionProvider(resourceStateManager, documentManager, schemaRetriever),
    );
    return resourceProviderMap;
}
