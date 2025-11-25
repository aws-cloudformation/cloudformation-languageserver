import { CompletionItem, CompletionParams } from 'vscode-languageserver';
import { Context } from '../context/Context';
import { ContextManager } from '../context/ContextManager';
import {
    IntrinsicFunction,
    IntrinsicsUsingConditionKeyword,
    ResourceAttribute,
    TopLevelSection,
} from '../context/ContextType';
import { isCondition } from '../context/ContextUtils';
import { Entity, Output, Parameter } from '../context/semantic/Entity';
import { EntityType } from '../context/semantic/SemanticTypes';
import { DocumentType } from '../document/Document';
import { DocumentManager } from '../document/DocumentManager';
import { SchemaRetriever } from '../schema/SchemaRetriever';
import { CfnExternal } from '../server/CfnExternal';
import { CfnInfraCore } from '../server/CfnInfraCore';
import { CfnLspProviders } from '../server/CfnLspProviders';
import { SettingsConfigurable, ISettingsSubscriber, SettingsSubscription } from '../settings/ISettingsSubscriber';
import { CompletionSettings, DefaultSettings } from '../settings/Settings';
import { LoggerFactory } from '../telemetry/LoggerFactory';
import { Track } from '../telemetry/TelemetryDecorator';
import { EventType, UsageTracker } from '../usageTracker/UsageTracker';
import { Closeable } from '../utils/Closeable';
import { CompletionFormatter } from './CompletionFormatter';
import { CompletionProvider } from './CompletionProvider';
import { ConditionCompletionProvider } from './ConditionCompletionProvider';
import { EntityFieldCompletionProvider } from './EntityFieldCompletionProvider';
import { IntrinsicFunctionArgumentCompletionProvider } from './IntrinsicFunctionArgumentCompletionProvider';
import { IntrinsicFunctionCompletionProvider } from './IntrinsicFunctionCompletionProvider';
import { ParameterTypeValueCompletionProvider } from './ParameterTypeValueCompletionProvider';
import { ResourceSectionCompletionProvider } from './ResourceSectionCompletionProvider';
import { TopLevelSectionCompletionProvider } from './TopLevelSectionCompletionProvider';

export type CompletionProviderType =
    | 'TopLevelSection'
    | 'IntrinsicFunction'
    | 'IntrinsicFunctionArgument'
    | 'ParameterTypeValue'
    | EntityType;
const Condition = 'Condition';

export class CompletionRouter implements SettingsConfigurable, Closeable {
    private completionSettings: CompletionSettings = DefaultSettings.completion;
    private settingsSubscription?: SettingsSubscription;
    private readonly log = LoggerFactory.getLogger(CompletionRouter);
    private readonly formatter = CompletionFormatter.getInstance();

    constructor(
        private readonly contextManager: ContextManager,
        private readonly completionProviderMap: Map<CompletionProviderType, CompletionProvider>,
        private readonly documentManager: DocumentManager,
        private readonly schemaRetriever: SchemaRetriever,
        private readonly entityFieldCompletionProviderMap = createEntityFieldProviders(),
        private readonly usageTracker: UsageTracker,
    ) {}

    @Track({ name: 'getCompletions', trackObjectKey: 'items' })
    async getCompletions(params: CompletionParams) {
        if (!this.completionSettings.enabled) return;

        const context = this.contextManager.getContext(params);
        if (!context) {
            return;
        }

        let provider: CompletionProvider | undefined;
        const triggerChar = params.context?.triggerCharacter ?? '';

        // Check for intrinsic function argument completions first
        if (context.intrinsicContext.inIntrinsic() && !this.shouldUseIntrinsicFunctionProvider(context)) {
            const doc = this.completionProviderMap.get('IntrinsicFunctionArgument')?.getCompletions(context, params);

            if (doc && !(doc instanceof Promise) && doc.length > 0) {
                const editorSettings = this.documentManager.getEditorSettingsForDocument(params.textDocument.uri);
                return this.formatter.format({ isIncomplete: false, items: doc }, context, editorSettings);
            }
        }

        if (context.isTopLevel && context.section === 'Unknown' && triggerChar !== ':') {
            provider = this.completionProviderMap.get('TopLevelSection');
        } else if (this.shouldUseIntrinsicFunctionProvider(context)) {
            provider = this.completionProviderMap.get('IntrinsicFunction');
        } else if (this.shouldUseConditionCompletionProvider(context)) {
            provider = this.completionProviderMap.get(EntityType.Condition);
        } else if (this.isAtParameterTypeValue(context)) {
            provider = this.completionProviderMap.get('ParameterTypeValue');
        } else if (context.section === TopLevelSection.Resources) {
            provider = this.completionProviderMap.get(EntityType.Resource);
        } else if (context.atEntityKeyLevel()) {
            provider = this.entityFieldCompletionProviderMap.get(context.getEntityType());
        }

        const completions = provider?.getCompletions(context, params) ?? [];
        const editorSettings = this.documentManager.getEditorSettingsForDocument(params.textDocument.uri);
        const lineContent = this.documentManager.getLine(params.textDocument.uri, context.startPosition.row);

        if (completions instanceof Promise) {
            return await completions.then((result) => {
                trackCompletion(this.usageTracker, provider, result);
                return this.formatter.format(
                    {
                        isIncomplete: result.length > this.completionSettings.maxCompletions,
                        items: result.slice(0, this.completionSettings.maxCompletions),
                    },
                    context,
                    editorSettings,
                    lineContent,
                    this.schemaRetriever,
                );
            });
        } else if (completions) {
            trackCompletion(this.usageTracker, provider, completions);
            const completionList = {
                isIncomplete: completions.length > this.completionSettings.maxCompletions,
                items: completions.slice(0, this.completionSettings.maxCompletions),
            };

            return this.formatter.format(completionList, context, editorSettings, lineContent, this.schemaRetriever);
        }
        return;
    }

    private shouldUseConditionCompletionProvider(context: Context): boolean {
        return (
            context.entitySection === Condition ||
            this.isAtConditionKey(context) ||
            this.conditionUsageWithinIntrinsic(context)
        );
    }

    private isAtConditionKey(context: Context): boolean {
        const propertyPath = context.propertyPath;
        if (propertyPath.length === 0) {
            return false;
        }

        const lastPathElement = propertyPath[propertyPath.length - 1];

        if (lastPathElement === Condition) {
            return this.isInConditionUsageContext(context);
        }

        return false;
    }

    private isInConditionUsageContext(context: Context): boolean {
        // Resource Condition attribute: ['Resources', 'LogicalId', this.CONDITION]
        if (context.matchPathWithLogicalId(TopLevelSection.Resources, Condition)) {
            return true;
        }

        // Resource UpdatePolicy Condition: ['Resources', 'LogicalId', 'UpdatePolicy', this.CONDITION]
        if (context.matchPathWithLogicalId(TopLevelSection.Resources, ResourceAttribute.UpdatePolicy, Condition)) {
            return true;
        }

        // Resource Metadata Condition: ['Resources', 'LogicalId', 'Metadata', this.CONDITION]
        if (context.matchPathWithLogicalId(TopLevelSection.Resources, ResourceAttribute.Metadata, Condition)) {
            return true;
        }

        // Output Condition attribute: ['Outputs', 'LogicalId', this.CONDITION]
        return context.matchPathWithLogicalId(TopLevelSection.Outputs, Condition);
    }

    private conditionUsageWithinIntrinsic(context: Context): boolean {
        const intrinsicContext = context.intrinsicContext;

        if (!intrinsicContext.inIntrinsic()) {
            return false;
        }

        const intrinsicFunction = intrinsicContext.intrinsicFunction();
        if (!intrinsicFunction) {
            return false;
        }

        // Check for Fn::If - first argument should be a condition
        if (intrinsicFunction.type === IntrinsicFunction.If) {
            return this.isFirstArgOfFnIf(context);
        }

        // Check for logical intrinsics that use Condition keyword (Fn::And, Fn::Or, Fn::Not, Fn::Equals)

        if (IntrinsicsUsingConditionKeyword.includes(intrinsicFunction.type as IntrinsicFunction)) {
            return this.isAfterConditionKeywordWithinIntrinsic(context);
        }

        return false;
    }

    private isFirstArgOfFnIf(context: Context): boolean {
        const intrinsicFunction = context.intrinsicContext.intrinsicFunction();

        if (!intrinsicFunction?.args || !Array.isArray(intrinsicFunction.args)) {
            return false;
        }

        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
        const firstArg = intrinsicFunction.args[0];
        if (!firstArg) {
            return false;
        }

        // Check if the current text matches the first argument
        if (typeof firstArg === 'string') {
            return firstArg === context.text;
        }

        // Handle object form like { "Condition": "ConditionName" }
        if (typeof firstArg === 'object') {
            // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
            const conditionKey = Object.keys(firstArg)[0];
            if (isCondition(conditionKey)) {
                // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
                return firstArg[conditionKey] === context.text;
            }
        }

        return false;
    }

    private isAfterConditionKeywordWithinIntrinsic(context: Context): boolean {
        const intrinsicFunction = context.intrinsicContext.intrinsicFunction();
        if (!intrinsicFunction?.args || !Array.isArray(intrinsicFunction.args)) {
            return false;
        }

        // Look through all arguments to find Condition keyword usage
        for (const arg of intrinsicFunction.args) {
            if (typeof arg === 'object' && arg !== null) {
                // Check for { "Condition": "ConditionName" } or { "!Condition": "ConditionName" }
                // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
                const conditionKey = Object.keys(arg).find((key) => isCondition(key));
                // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
                if (conditionKey && arg[conditionKey] === context.text) {
                    return true;
                }
            }
        }

        return false;
    }

    private isAtParameterTypeValue(context: Context): boolean {
        return (
            context.section === TopLevelSection.Parameters &&
            context.matchPathWithLogicalId(TopLevelSection.Parameters, 'Type') &&
            context.isValue()
        );
    }

    private shouldUseIntrinsicFunctionProvider(context: Context): boolean {
        // YAML short form
        if (context.documentType !== DocumentType.JSON && context.text.startsWith('!')) {
            return true;
        }

        // Typing "Fn:" for function name completion
        return context.text.startsWith('Fn:');
    }

    configure(settingsManager: ISettingsSubscriber): void {
        // Clean up existing subscriptions if present
        if (this.settingsSubscription) {
            this.settingsSubscription.unsubscribe();
        }

        // Subscribe to completion settings changes
        this.settingsSubscription = settingsManager.subscribe('completion', (newCompletionSettings) => {
            this.completionSettings = newCompletionSettings;
        });
    }

    close(): void {
        if (this.settingsSubscription) {
            this.settingsSubscription.unsubscribe();
            this.settingsSubscription = undefined;
        }
    }

    static create(core: CfnInfraCore, external: CfnExternal, providers: CfnLspProviders) {
        CompletionFormatter.getInstance();
        return new CompletionRouter(
            core.contextManager,
            createCompletionProviders(core, external, providers),
            core.documentManager,
            external.schemaRetriever,
            createEntityFieldProviders(),
            core.usageTracker,
        );
    }
}

export function createCompletionProviders(
    core: CfnInfraCore,
    external: CfnExternal,
    providers: CfnLspProviders,
): Map<CompletionProviderType, CompletionProvider> {
    const completionProviderMap = new Map<CompletionProviderType, CompletionProvider>();
    completionProviderMap.set(
        'TopLevelSection',
        new TopLevelSectionCompletionProvider(
            core.syntaxTreeManager,
            core.documentManager,
            external.featureFlags.get('Constants'),
        ),
    );
    completionProviderMap.set(EntityType.Resource, new ResourceSectionCompletionProvider(core, external, providers));
    completionProviderMap.set(EntityType.Condition, new ConditionCompletionProvider(core.syntaxTreeManager));
    completionProviderMap.set('IntrinsicFunction', new IntrinsicFunctionCompletionProvider());
    completionProviderMap.set(
        'IntrinsicFunctionArgument',
        new IntrinsicFunctionArgumentCompletionProvider(
            core.syntaxTreeManager,
            external.schemaRetriever,
            core.documentManager,
            external.featureFlags.get('Constants'),
        ),
    );
    completionProviderMap.set('ParameterTypeValue', new ParameterTypeValueCompletionProvider());

    return completionProviderMap;
}

export function createEntityFieldProviders() {
    const entityFieldProviderMap = new Map<EntityType, EntityFieldCompletionProvider<Entity>>();
    entityFieldProviderMap.set(EntityType.Parameter, new EntityFieldCompletionProvider<Parameter>());
    entityFieldProviderMap.set(EntityType.Output, new EntityFieldCompletionProvider<Output>());
    return entityFieldProviderMap;
}

function trackCompletion(
    tracker: UsageTracker,
    provider: CompletionProvider | undefined,
    completions: CompletionItem[],
) {
    if (provider !== undefined && !(provider instanceof TopLevelSectionCompletionProvider) && completions.length > 0) {
        tracker.track(EventType.MeaningfulCompletion);
    }
}
