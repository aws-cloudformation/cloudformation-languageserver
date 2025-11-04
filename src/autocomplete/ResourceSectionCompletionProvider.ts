import { CompletionItem, CompletionParams, CompletionTriggerKind } from 'vscode-languageserver';
import { Context } from '../context/Context';
import { ResourceAttributesSet } from '../context/ContextType';
import { ForEachResource, Resource } from '../context/semantic/Entity';
import { EntityType } from '../context/semantic/SemanticTypes';
import { CfnExternal } from '../server/CfnExternal';
import { CfnInfraCore } from '../server/CfnInfraCore';
import { CfnLspProviders } from '../server/CfnLspProviders';
import { LoggerFactory } from '../telemetry/LoggerFactory';
import { Measure } from '../telemetry/TelemetryDecorator';
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

    @Measure({ name: 'getCompletions' })
    getCompletions(
        context: Context,
        params: CompletionParams,
    ): Promise<CompletionItem[]> | CompletionItem[] | undefined {
        if (context.atEntityKeyLevel()) {
            return this.resourceProviders
                .get(ResourceCompletionType.Entity)
                ?.getCompletions(context, params) as CompletionItem[];
        } else if (context.entitySection === 'Type' || this.isAtResourceTypeField(context)) {
            return this.resourceProviders
                .get(ResourceCompletionType.Type)
                ?.getCompletions(context, params) as CompletionItem[];
        } else if (
            context.entitySection === 'Properties' ||
            ResourceAttributesSet.has(context.entitySection as string) ||
            this.isInPropertiesSection(context)
        ) {
            const schemaPropertyCompletions = this.resourceProviders
                .get(ResourceCompletionType.Property)
                ?.getCompletions(context, params) as CompletionItem[];

            if (params.context?.triggerKind === CompletionTriggerKind.Invoked && this.isInPropertiesSection(context)) {
                let resource: Resource | undefined;

                if (context.entity.entityType === EntityType.ForEachResource) {
                    const forEachResource = context.entity as ForEachResource;
                    resource = forEachResource.resource;
                } else {
                    resource = context.entity as Resource;
                }

                if (resource?.Type) {
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

    private isInPropertiesSection(context: Context): boolean {
        // Find 'Properties' starting after the resource structure
        const startIndex = context.entity.entityType === EntityType.ForEachResource ? 4 : 2;
        const propertiesIndex = context.propertyPath.indexOf('Properties', startIndex);
        return propertiesIndex !== -1 && context.propertyPath.length >= propertiesIndex + 1;
    }

    private isAtResourceTypeField(context: Context): boolean {
        if (context.propertyPath[context.propertyPath.length - 1] !== 'Type') {
            return false;
        }
        const startIndex = context.entity.entityType === EntityType.ForEachResource ? 4 : 2;
        const propertiesIndex = context.propertyPath.indexOf('Properties', startIndex);
        return propertiesIndex === -1;
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
