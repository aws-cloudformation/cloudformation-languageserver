import { InlineCompletionList, InlineCompletionParams, InlineCompletionItem } from 'vscode-languageserver-protocol';
import { Context } from '../context/Context';
import { ContextManager } from '../context/ContextManager';
import { DocumentManager } from '../document/DocumentManager';
import { Closeable, Configurable, ServerComponents } from '../server/ServerComponents';
import { RelationshipSchemaService } from '../services/RelationshipSchemaService';
import {
    CompletionSettings,
    DefaultSettings,
    EditorSettings,
    ISettingsSubscriber,
    SettingsSubscription,
} from '../settings/Settings';
import { LoggerFactory } from '../telemetry/LoggerFactory';
import { InlineCompletionProvider } from './InlineCompletionProvider';
import { RelatedResourcesInlineCompletionProvider } from './RelatedResourcesInlineCompletionProvider';

export type InlineCompletionProviderType = 'RelatedResources' | 'ResourceBlock' | 'PropertyBlock';
type ReturnType = InlineCompletionList | InlineCompletionItem[] | null | undefined;

export class InlineCompletionRouter implements Configurable, Closeable {
    private completionSettings: CompletionSettings = DefaultSettings.completion;
    private editorSettings: EditorSettings = DefaultSettings.editor;
    private settingsSubscription?: SettingsSubscription;
    private editorSettingsSubscription?: SettingsSubscription;
    private readonly log = LoggerFactory.getLogger(InlineCompletionRouter);

    constructor(
        private readonly contextManager: ContextManager,
        private readonly inlineCompletionProviderMap: Map<InlineCompletionProviderType, InlineCompletionProvider>,
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
                const result = relatedResourcesProvider.getlineCompletion(context, params, this.editorSettings);

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
        if (this.editorSettingsSubscription) {
            this.editorSettingsSubscription.unsubscribe();
        }

        // Subscribe to completion settings changes
        this.settingsSubscription = settingsManager.subscribe('completion', (newCompletionSettings) => {
            this.completionSettings = newCompletionSettings;
        });

        // Subscribe to editor settings changes
        this.editorSettingsSubscription = settingsManager.subscribe('editor', (newEditorSettings) => {
            this.editorSettings = newEditorSettings;
        });
    }

    close(): void {
        if (this.settingsSubscription) {
            this.settingsSubscription.unsubscribe();
            this.settingsSubscription = undefined;
        }
        if (this.editorSettingsSubscription) {
            this.editorSettingsSubscription.unsubscribe();
            this.editorSettingsSubscription = undefined;
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

    static create(components: ServerComponents) {
        return new InlineCompletionRouter(
            components.contextManager,
            createInlineCompletionProviders(components.documentManager, RelationshipSchemaService.getInstance()),
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
