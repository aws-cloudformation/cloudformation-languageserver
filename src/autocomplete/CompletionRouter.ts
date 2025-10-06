import { CompletionList, CompletionParams } from 'vscode-languageserver';
import { Context } from '../context/Context';
import { ContextManager } from '../context/ContextManager';
import { IntrinsicFunction, IntrinsicsUsingConditionKeyword, TopLevelSection } from '../context/ContextType';
import { isCondition } from '../context/ContextUtils';
import { Entity, Output, Parameter } from '../context/semantic/Entity';
import { EntityType } from '../context/semantic/SemanticTypes';
import { DocumentType } from '../document/Document';
import { Closeable, Configurable, ServerComponents } from '../server/ServerComponents';
import { CompletionSettings, DefaultSettings, ISettingsSubscriber, SettingsSubscription } from '../settings/Settings';
import { LoggerFactory } from '../telemetry/LoggerFactory';
import { CompletionFormatter } from './CompletionFormatter';
import { CompletionProvider } from './CompletionProvider';
import { ConditionCompletionProvider } from './ConditionCompletionProvider';
import { EntityFieldCompletionProvider } from './EntityFieldCompletionProvider';
import { IntrinsicFunctionArgumentCompletionProvider } from './IntrinsicFunctionArgumentCompletionProvider';
import { IntrinsicFunctionCompletionProvider } from './IntrinsicFunctionCompletionProvider';
import { ParameterTypeValueCompletionProvider } from './ParameterTypeValueCompletionProvider';
import { ResourceSectionCompletionProvider } from './ResourceSectionCompletionProvider';

export type CompletionProviderType =
    | 'TopLevelSection'
    | 'IntrinsicFunction'
    | 'IntrinsicFunctionArgument'
    | 'ParameterTypeValue'
    | EntityType;
const Condition = 'Condition';

export class CompletionRouter implements Configurable, Closeable {
    private completionSettings: CompletionSettings = DefaultSettings.completion;
    private settingsSubscription?: SettingsSubscription;
    private readonly log = LoggerFactory.getLogger(CompletionRouter);
    private readonly formatter = CompletionFormatter.getInstance();

    constructor(
        private readonly contextManager: ContextManager,
        private readonly completionProviderMap: Map<CompletionProviderType, CompletionProvider>,
        private readonly entityFieldCompletionProviderMap = createEntityFieldProviders(),
    ) {}

    getCompletions(params: CompletionParams): Promise<CompletionList> | CompletionList | undefined {
        if (!this.completionSettings.enabled) return;

        const context = this.contextManager.getContext(params);
        this.log.debug(
            {
                Router: 'Completion',
                Position: params.position,
                Context: context?.record(),
            },
            'Processing completion request',
        );
        if (!context) {
            return;
        }

        let provider: CompletionProvider | undefined;
        const triggerChar = params.context?.triggerCharacter ?? '';

        // Check for intrinsic function argument completions first
        if (context.intrinsicContext.inIntrinsic()) {
            const doc = this.completionProviderMap.get('IntrinsicFunctionArgument')?.getCompletions(context, params);

            if (doc && !(doc instanceof Promise) && doc.length > 0) {
                return this.formatter.format({ isIncomplete: false, items: doc }, context);
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
            provider = this.entityFieldCompletionProviderMap.get(context.entity.entityType);
        }

        const completions = provider?.getCompletions(context, params) ?? [];

        if (completions instanceof Promise) {
            return completions.then((result) => {
                return this.formatter.format(
                    {
                        isIncomplete: false,
                        items: result.slice(0, this.completionSettings.maxCompletions),
                    },
                    context,
                );
            });
        } else if (completions) {
            const completionList = {
                isIncomplete: false,
                items: completions.slice(0, this.completionSettings.maxCompletions),
            };

            return this.formatter.format(completionList, context);
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
        if (context.matchPathWithLogicalId(TopLevelSection.Resources, 'UpdatePolicy', Condition)) {
            return true;
        }

        // Resource Metadata Condition: ['Resources', 'LogicalId', 'Metadata', this.CONDITION]
        if (context.matchPathWithLogicalId(TopLevelSection.Resources, 'Metadata', Condition)) {
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

    static create(components: ServerComponents) {
        return new CompletionRouter(components.contextManager, createCompletionProviders(components));
    }
}

export function createCompletionProviders(
    components: ServerComponents,
): Map<CompletionProviderType, CompletionProvider> {
    const completionProviderMap = new Map<CompletionProviderType, CompletionProvider>();
    completionProviderMap.set('TopLevelSection', components.topLevelSectionCompletionProvider);
    completionProviderMap.set(EntityType.Resource, new ResourceSectionCompletionProvider(components));
    completionProviderMap.set(EntityType.Condition, new ConditionCompletionProvider(components.syntaxTreeManager));
    completionProviderMap.set('IntrinsicFunction', new IntrinsicFunctionCompletionProvider());
    completionProviderMap.set(
        'IntrinsicFunctionArgument',
        new IntrinsicFunctionArgumentCompletionProvider(
            components.syntaxTreeManager,
            components.schemaRetriever,
            components.documentManager,
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
