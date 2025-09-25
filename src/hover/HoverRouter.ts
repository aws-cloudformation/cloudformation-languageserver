import { TextDocumentPositionParams } from 'vscode-languageserver-protocol/lib/common/protocol';
import { Context } from '../context/Context';
import { ContextManager } from '../context/ContextManager';
import { TopLevelSection } from '../context/ContextType';
import { ContextWithRelatedEntities } from '../context/ContextWithRelatedEntities';
import { EntityType } from '../context/semantic/SemanticTypes';
import { SchemaRetriever } from '../schema/SchemaRetriever';
import { ServerComponents, Configurable, Closeable } from '../server/ServerComponents';
import { DefaultSettings, HoverSettings, SettingsSubscription, ISettingsSubscriber } from '../settings/Settings';
import { LoggerFactory } from '../telemetry/LoggerFactory';
import { ConditionHoverProvider } from './ConditionHoverProvider';
import { HoverProvider } from './HoverProvider';
import { IntrinsicFunctionArgumentHoverProvider } from './IntrinsicFunctionArgumentHoverProvider';
import { IntrinsicFunctionHoverProvider } from './IntrinsicFunctionHoverProvider';
import { MappingHoverProvider } from './MappingHoverProvider';
import { ParameterHoverProvider } from './ParameterHoverProvider';
import { PseudoParameterHoverProvider } from './PseudoParameterHoverProvider';
import { ResourceSectionHoverProvider } from './ResourceSectionHoverProvider';
import { TemplateSectionHoverProvider } from './TemplateSectionHoverProvider';

export class HoverRouter implements Configurable, Closeable {
    private readonly hoverProviderMap: Map<HoverType, HoverProvider>;
    private readonly log = LoggerFactory.getLogger(HoverRouter);
    private settings: HoverSettings = DefaultSettings.hover;
    private settingsSubscription?: SettingsSubscription;

    constructor(
        private readonly contextManager: ContextManager,
        schemaRetriever: SchemaRetriever,
    ) {
        this.hoverProviderMap = this.createHoverProviders(schemaRetriever);
    }

    configure(settingsManager: ISettingsSubscriber): void {
        if (this.settingsSubscription) {
            this.settingsSubscription.unsubscribe();
        }

        this.settings = settingsManager.getCurrentSettings().hover;

        this.settingsSubscription = settingsManager.subscribe('hover', (newHoverSettings) => {
            this.onSettingsChanged(newHoverSettings);
        });
    }

    close(): void {
        if (this.settingsSubscription) {
            this.settingsSubscription.unsubscribe();
            this.settingsSubscription = undefined;
        }
    }

    private onSettingsChanged(settings: HoverSettings): void {
        this.settings = settings;
    }

    getHoverDoc(textDocPosParams: TextDocumentPositionParams): string | undefined {
        if (!this.settings.enabled) {
            return undefined;
        }
        const context = this.contextManager.getContextAndRelatedEntities(textDocPosParams);
        this.log.debug(
            {
                Router: 'Hover',
                Position: textDocPosParams.position,
                Context: context?.record(),
            },
            'Processing hover request',
        );

        if (!context) {
            return undefined;
        }

        // Check for intrinsic function arguments first
        if (context.intrinsicContext.inIntrinsic()) {
            const doc = this.hoverProviderMap.get(HoverType.IntrinsicFunctionArgument)?.getInformation(context);
            if (doc) {
                return doc;
            }
        }

        if (context.isTopLevel) {
            return this.hoverProviderMap.get(HoverType.TopLevelSection)?.getInformation(context);
        } else if (context.isIntrinsicFunc) {
            return this.hoverProviderMap.get(HoverType.IntrinsicFunction)?.getInformation(context);
        } else if (context.isPseudoParameter) {
            return this.hoverProviderMap.get(HoverType.PseudoParameter)?.getInformation(context);
        } else if (context.section === TopLevelSection.Resources) {
            const doc = this.hoverProviderMap.get(HoverType.ResourceSection)?.getInformation(context);
            if (doc) {
                return doc;
            }
        } else if (context.section === TopLevelSection.Parameters) {
            const doc = this.hoverProviderMap.get(HoverType.Parameter)?.getInformation(context);
            if (doc) {
                return doc;
            }
        }

        return this.getTopLevelReference(context);
    }

    private createHoverProviders(schemaRetriever: SchemaRetriever): Map<HoverType, HoverProvider> {
        const hoverProviderMap = new Map<HoverType, HoverProvider>();
        hoverProviderMap.set(HoverType.TopLevelSection, new TemplateSectionHoverProvider());
        hoverProviderMap.set(HoverType.ResourceSection, new ResourceSectionHoverProvider(schemaRetriever));
        hoverProviderMap.set(HoverType.Parameter, new ParameterHoverProvider());
        hoverProviderMap.set(HoverType.PseudoParameter, new PseudoParameterHoverProvider());
        hoverProviderMap.set(HoverType.Condition, new ConditionHoverProvider());
        hoverProviderMap.set(HoverType.Mapping, new MappingHoverProvider());
        hoverProviderMap.set(HoverType.IntrinsicFunction, new IntrinsicFunctionHoverProvider());
        hoverProviderMap.set(HoverType.IntrinsicFunctionArgument, new IntrinsicFunctionArgumentHoverProvider());
        return hoverProviderMap;
    }

    private getTopLevelReference(context: ContextWithRelatedEntities): string | undefined {
        for (const section of context.relatedEntities.values()) {
            const relatedContext = section.get(context.text);
            if (relatedContext) {
                return this.getInfoForReference(relatedContext);
            }
        }

        return undefined;
    }

    private getInfoForReference(context: Context): string | undefined {
        switch (context.entity.entityType) {
            case EntityType.Parameter: {
                return this.hoverProviderMap.get(HoverType.Parameter)?.getInformation(context);
            }
            case EntityType.Condition: {
                return this.hoverProviderMap.get(HoverType.Condition)?.getInformation(context);
            }
            case EntityType.Mapping: {
                return this.hoverProviderMap.get(HoverType.Mapping)?.getInformation(context);
            }
            case EntityType.Resource: {
                return this.hoverProviderMap.get(HoverType.ResourceSection)?.getInformation(context);
            }
        }

        return undefined;
    }

    static create(components: ServerComponents) {
        return new HoverRouter(components.contextManager, components.schemaRetriever);
    }
}

enum HoverType {
    TopLevelSection,
    ResourceSection,
    IntrinsicFunction,
    IntrinsicFunctionArgument,
    Parameter,
    PseudoParameter,
    Condition,
    Mapping,
}
