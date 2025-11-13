import { CompletionItem, CompletionParams } from 'vscode-languageserver';
import { Context } from '../context/Context';
import { ResourceAttributesSet } from '../context/ContextType';
import { EntityType } from '../context/semantic/SemanticTypes';
import { CfnExternal } from '../server/CfnExternal';
import { CfnInfraCore } from '../server/CfnInfraCore';
import { CfnLspProviders } from '../server/CfnLspProviders';
import { Measure } from '../telemetry/TelemetryDecorator';
import { CompletionProvider } from './CompletionProvider';
import { ResourceEntityCompletionProvider } from './ResourceEntityCompletionProvider';
import { ResourcePropertyCompletionProvider } from './ResourcePropertyCompletionProvider';
import { ResourceTypeCompletionProvider } from './ResourceTypeCompletionProvider';

enum ResourceCompletionType {
    Entity = 'Entity',
    Type = 'Type',
    Property = 'Property',
}

export class ResourceSectionCompletionProvider implements CompletionProvider {
    constructor(
        core: CfnInfraCore,
        external: CfnExternal,
        _providers: CfnLspProviders,
        private readonly resourceProviders = createResourceCompletionProviders(core, external),
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
            return this.resourceProviders
                .get(ResourceCompletionType.Property)
                ?.getCompletions(context, params) as CompletionItem[];
        }
        return [];
    }

    private isInPropertiesSection(context: Context): boolean {
        // Find 'Properties' starting after the resource structure
        const startIndex = context.getEntityType() === EntityType.ForEachResource ? 4 : 2;
        const propertiesIndex = context.propertyPath.indexOf('Properties', startIndex);
        return propertiesIndex !== -1 && context.propertyPath.length >= propertiesIndex + 1;
    }

    private isAtResourceTypeField(context: Context): boolean {
        const propertyPathLength = context.getEntityType() === EntityType.ForEachResource ? 5 : 3;

        return (
            context.propertyPath.length === propertyPathLength &&
            context.propertyPath[context.propertyPath.length - 1] === 'Type'
        );
    }
}

export function createResourceCompletionProviders(
    core: CfnInfraCore,
    external: CfnExternal,
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
    return resourceProviderMap;
}
