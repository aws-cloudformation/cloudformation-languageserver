import { CompletionItem, CompletionParams } from 'vscode-languageserver';
import { Context } from '../context/Context';
import { EditorSettings } from '../settings/Settings';

export interface CompletionProvider {
    getCompletions(
        context: Context,
        params: CompletionParams,
        editorSettings?: EditorSettings,
    ): Promise<CompletionItem[]> | CompletionItem[] | undefined;
}
