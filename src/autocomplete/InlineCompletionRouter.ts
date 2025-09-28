import { InlineCompletionList, InlineCompletionParams } from 'vscode-languageserver-protocol';
import { ContextManager } from '../context/ContextManager';
import { Closeable, Configurable, ServerComponents } from '../server/ServerComponents';
import {
    CompletionSettings,
    DefaultSettings,
    EditorSettings,
    ISettingsSubscriber,
    SettingsSubscription,
} from '../settings/Settings';
import { LoggerFactory } from '../telemetry/LoggerFactory';

export type InlineCompletionProviderType = 'ResourceBlock' | 'PropertyBlock' | 'TemplateSection' | 'AIGenerated';

export class InlineCompletionRouter implements Configurable, Closeable {
    private completionSettings: CompletionSettings = DefaultSettings.completion;
    private editorSettings: EditorSettings = DefaultSettings.editor;
    private settingsSubscription?: SettingsSubscription;
    private editorSettingsSubscription?: SettingsSubscription;
    private readonly log = LoggerFactory.getLogger(InlineCompletionRouter);

    constructor(private readonly contextManager: ContextManager) {}

    getInlineCompletions(
        params: InlineCompletionParams,
    ): Promise<InlineCompletionList> | InlineCompletionList | undefined {
        if (!this.completionSettings.enabled) return;

        const context = this.contextManager.getContext(params);

        if (!context) {
            return;
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

        // Get initial settings
        this.completionSettings = settingsManager.getCurrentSettings().completion;
        this.editorSettings = settingsManager.getCurrentSettings().editor;

        // Subscribe to completion settings changes
        this.settingsSubscription = settingsManager.subscribe('completion', (newCompletionSettings) => {
            this.onCompletionSettingsChanged(newCompletionSettings);
        });

        // Subscribe to editor settings changes
        this.editorSettingsSubscription = settingsManager.subscribe('editor', (newEditorSettings) => {
            this.onEditorSettingsChanged(newEditorSettings);
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

    private onCompletionSettingsChanged(settings: CompletionSettings): void {
        this.completionSettings = settings;
    }

    private onEditorSettingsChanged(settings: EditorSettings): void {
        this.editorSettings = settings;
    }

    static create(components: ServerComponents) {
        return new InlineCompletionRouter(components.contextManager);
    }
}
