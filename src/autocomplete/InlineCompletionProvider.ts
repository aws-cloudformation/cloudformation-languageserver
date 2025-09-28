import { InlineCompletionItem, InlineCompletionParams } from 'vscode-languageserver-protocol';
import { Context } from '../context/Context';
import { EditorSettings } from '../settings/Settings';

export interface InlineCompletionProvider {
    getlineCompletion(
        context: Context,
        params: InlineCompletionParams,
        editorSettings: EditorSettings,
    ): Promise<InlineCompletionItem[]> | InlineCompletionItem[] | undefined;
}
