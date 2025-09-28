import { CompletionItem, CompletionParams } from 'vscode-languageserver';
import { Context } from '../context/Context';

export interface CompletionProvider {
    getCompletions(
        context: Context,
        params: CompletionParams,
    ): Promise<CompletionItem[]> | CompletionItem[] | undefined;
}
