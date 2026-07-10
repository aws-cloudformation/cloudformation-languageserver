import { CompletionItem, CompletionParams } from 'vscode-languageserver';
import { ResourceAttributesSet, EntityType } from '../context/CloudFormationEnums';
import { Context } from '../context/Context';
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
            return this.resourceProviders.get(ResourceCompletionType.Entity)?.getCompletions(context, params);
        } else if (context.entitySection === 'Type' || this.isAtResourceTypeField(context)) {
            return this.resourceProviders.get(ResourceCompletionType.Type)?.getCompletions(context, params);
        } else if (
            context.entitySection === 'Properties' ||
            ResourceAttributesSet.has(context.entitySection as string) ||
            this.isInPropertiesSection(context)
        ) {
            return this.resourceProviders.get(ResourceCompletionType.Property)?.getCompletions(context, params);
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
    return new Map<ResourceCompletionType, CompletionProvider>([
        [
            ResourceCompletionType.Entity,
            new ResourceEntityCompletionProvider(external.schemaRetriever, core.documentManager),
        ],
        [ResourceCompletionType.Type, new ResourceTypeCompletionProvider(external.schemaRetriever)],
        [ResourceCompletionType.Property, new ResourcePropertyCompletionProvider(external.schemaRetriever)],
    ]);
}
