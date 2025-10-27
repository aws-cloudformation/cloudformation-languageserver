import { InlineCompletionParams } from 'vscode-languageserver-protocol';
import { Context } from '../context/Context';
import { ContextManager } from '../context/ContextManager';
import { SyntaxTreeManager } from '../context/syntaxtree/SyntaxTreeManager';
import { DocumentManager } from '../document/DocumentManager';
import { SchemaRetriever } from '../schema/SchemaRetriever';
import { CfnExternal } from '../server/CfnExternal';
import { CfnInfraCore } from '../server/CfnInfraCore';
import { RelationshipSchemaService } from '../services/RelationshipSchemaService';
import { SettingsConfigurable, ISettingsSubscriber, SettingsSubscription } from '../settings/ISettingsSubscriber';
import { CompletionSettings, DefaultSettings } from '../settings/Settings';
import { LoggerFactory } from '../telemetry/LoggerFactory';
import { Track } from '../telemetry/TelemetryDecorator';
import { Closeable } from '../utils/Closeable';
import { InlineCompletionProvider } from './InlineCompletionProvider';
import { RelatedResourcesInlineCompletionProvider } from './RelatedResourcesInlineCompletionProvider';

export type InlineCompletionProviderType = 'RelatedResources' | 'ResourceBlock' | 'PropertyBlock';

export class InlineCompletionRouter implements SettingsConfigurable, Closeable {
    private completionSettings: CompletionSettings = DefaultSettings.completion;
    private settingsSubscription?: SettingsSubscription;
    private readonly log = LoggerFactory.getLogger(InlineCompletionRouter);

    constructor(
        private readonly contextManager: ContextManager,
        private readonly inlineCompletionProviderMap: Map<InlineCompletionProviderType, InlineCompletionProvider>,
        private readonly schemaService: RelationshipSchemaService,
    ) {}

    @Track({ name: 'getInlineCompletions' })
    async getInlineCompletions(params: InlineCompletionParams) {
        if (!this.completionSettings.enabled) return;

        const context = this.contextManager.getContext(params);

        if (!context) {
            return;
        }

        // Check if we are authoring a new resource
        if (this.isAuthoringNewResource(context)) {
            const relatedResourcesProvider = this.inlineCompletionProviderMap.get('RelatedResources');
            if (relatedResourcesProvider) {
                const result = relatedResourcesProvider.getInlineCompletion(context, params);

                if (result instanceof Promise) {
                    return await result.then((items) => {
                        return { items };
                    });
                } else if (result && Array.isArray(result)) {
                    return { items: result };
                }
            }
        }

        return;
    }

    configure(settingsManager: ISettingsSubscriber): void {
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

    private isAuthoringNewResource(context: Context): boolean {
        // Only provide suggestions in Resources section when positioned for a new resource
        return (
            String(context.section) === 'Resources' &&
            (context.propertyPath.length === 1 ||
                (context.propertyPath.length === 2 &&
                    context.hasLogicalId &&
                    context.isKey() &&
                    !context.atEntityKeyLevel()))
        );
    }

    static create(core: CfnInfraCore, external: CfnExternal, relationshipSchemaService: RelationshipSchemaService) {
        return new InlineCompletionRouter(
            core.contextManager,
            createInlineCompletionProviders(
                core.documentManager,
                relationshipSchemaService,
                external.schemaRetriever,
                core.syntaxTreeManager,
            ),
            relationshipSchemaService,
        );
    }
}

export function createInlineCompletionProviders(
    documentManager: DocumentManager,
    relationshipSchemaService: RelationshipSchemaService,
    schemaRetriever: SchemaRetriever,
    syntaxTreeManager: SyntaxTreeManager,
): Map<InlineCompletionProviderType, InlineCompletionProvider> {
    const inlineCompletionProviderMap = new Map<InlineCompletionProviderType, InlineCompletionProvider>();

    inlineCompletionProviderMap.set(
        'RelatedResources',
        new RelatedResourcesInlineCompletionProvider(
            relationshipSchemaService,
            documentManager,
            schemaRetriever,
            syntaxTreeManager,
        ),
    );

    return inlineCompletionProviderMap;
}
