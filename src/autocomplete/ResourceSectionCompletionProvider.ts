import { CompletionItem, CompletionParams, CompletionTriggerKind } from 'vscode-languageserver';
import { Context } from '../context/Context';
import { ResourceAttributesSet, TopLevelSection } from '../context/ContextType';
import { Resource } from '../context/semantic/Entity';
import { CfnExternal } from '../server/CfnExternal';
import { CfnInfraCore } from '../server/CfnInfraCore';
import { CfnLspProviders } from '../server/CfnLspProviders';
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
        core: CfnInfraCore,
        external: CfnExternal,
        providers: CfnLspProviders,
        private readonly resourceProviders = createResourceCompletionProviders(core, external, providers),
    ) {}

    getCompletions(
        context: Context,
        params: CompletionParams,
    ): Promise<CompletionItem[]> | CompletionItem[] | undefined {
        if (context.atEntityKeyLevel()) {
            return this.resourceProviders
                .get(ResourceCompletionType.Entity)
                ?.getCompletions(context, params) as CompletionItem[];
        } else if (context.entitySection === 'Type') {
            return this.resourceProviders
                .get(ResourceCompletionType.Type)
                ?.getCompletions(context, params) as CompletionItem[];
        } else if (
            context.entitySection === 'Properties' ||
            ResourceAttributesSet.has(context.entitySection as string) ||
            (context.matchPathWithLogicalId(TopLevelSection.Resources, 'Properties') && context.propertyPath.length > 3)
        ) {
            const schemaPropertyCompletions = this.resourceProviders
                .get(ResourceCompletionType.Property)
                ?.getCompletions(context, params) as CompletionItem[];

            if (
                params.context?.triggerKind === CompletionTriggerKind.Invoked &&
                context.matchPathWithLogicalId(TopLevelSection.Resources, 'Properties')
            ) {
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
                            this.log.warn(error, 'Received error from resource state autocomplete');
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
    core: CfnInfraCore,
    external: CfnExternal,
    providers: CfnLspProviders,
): Map<ResourceCompletionType, CompletionProvider> {
    const resourceProviderMap = new Map<ResourceCompletionType, CompletionProvider>();
    resourceProviderMap.set(
        ResourceCompletionType.Entity,
        new ResourceEntityCompletionProvider(external.schemaRetriever, core.documentManager),
    );
    resourceProviderMap.set(ResourceCompletionType.Type, new ResourceTypeCompletionProvider(external.schemaRetriever));
    resourceProviderMap.set(
        ResourceCompletionType.Property,
        new ResourcePropertyCompletionProvider(external.schemaRetriever),
    );
    resourceProviderMap.set(
        ResourceCompletionType.State,
        new ResourceStateCompletionProvider(
            providers.resourceStateManager,
            core.documentManager,
            external.schemaRetriever,
        ),
    );
    return resourceProviderMap;
}
