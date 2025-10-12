import { InlineCompletionList, InlineCompletionParams, InlineCompletionItem } from 'vscode-languageserver-protocol';
import { Context } from '../context/Context';
import { ContextManager } from '../context/ContextManager';
import { DocumentManager } from '../document/DocumentManager';
import { CfnInfraCore } from '../server/CfnInfraCore';
import { RelationshipSchemaService } from '../services/RelationshipSchemaService';
import { SettingsConfigurable, ISettingsSubscriber, SettingsSubscription } from '../settings/ISettingsSubscriber';
import { CompletionSettings, DefaultSettings } from '../settings/Settings';
import { LoggerFactory } from '../telemetry/LoggerFactory';
import { Closeable } from '../utils/Closeable';
import { InlineCompletionProvider } from './InlineCompletionProvider';
import { RelatedResourcesInlineCompletionProvider } from './RelatedResourcesInlineCompletionProvider';

export type InlineCompletionProviderType = 'RelatedResources' | 'ResourceBlock' | 'PropertyBlock';
type ReturnType = InlineCompletionList | InlineCompletionItem[] | null | undefined;

export class InlineCompletionRouter implements SettingsConfigurable, Closeable {
    private completionSettings: CompletionSettings = DefaultSettings.completion;
    private settingsSubscription?: SettingsSubscription;
    private readonly log = LoggerFactory.getLogger(InlineCompletionRouter);

    constructor(
        private readonly contextManager: ContextManager,
        private readonly inlineCompletionProviderMap: Map<InlineCompletionProviderType, InlineCompletionProvider>,
        private readonly documentManager: DocumentManager,
    ) {}

    getInlineCompletions(params: InlineCompletionParams): Promise<ReturnType> | ReturnType {
        if (!this.completionSettings.enabled) return;

        const context = this.contextManager.getContext(params);

        if (!context) {
            return;
        }

        this.log.debug(
            {
                position: params.position,
                section: context.section,
                propertyPath: context.propertyPath,
            },
            'Processing inline completion request',
        );

        // Check if we are authoring a new resource
        if (this.isAuthoringNewResource(context)) {
            const relatedResourcesProvider = this.inlineCompletionProviderMap.get('RelatedResources');
            if (relatedResourcesProvider) {
                const documentSpecificSettings = this.documentManager.getEditorSettingsForDocument(
                    params.textDocument.uri,
                );

                const result = relatedResourcesProvider.getlineCompletion(context, params, documentSpecificSettings);

                if (result instanceof Promise) {
                    return result.then((items) => {
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

    static create(core: CfnInfraCore) {
        return new InlineCompletionRouter(
            core.contextManager,
            createInlineCompletionProviders(core.documentManager, RelationshipSchemaService.getInstance()),
            core.documentManager,
        );
    }
}

export function createInlineCompletionProviders(
    documentManager: DocumentManager,
    relationshipSchemaService: RelationshipSchemaService,
): Map<InlineCompletionProviderType, InlineCompletionProvider> {
    const inlineCompletionProviderMap = new Map<InlineCompletionProviderType, InlineCompletionProvider>();

    inlineCompletionProviderMap.set(
        'RelatedResources',
        new RelatedResourcesInlineCompletionProvider(relationshipSchemaService, documentManager),
    );

    return inlineCompletionProviderMap;
}
