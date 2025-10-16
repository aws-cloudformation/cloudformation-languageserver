import { InlineCompletionItem, InlineCompletionParams } from 'vscode-languageserver-protocol';
import { Context } from '../context/Context';

export interface InlineCompletionProvider {
    getInlineCompletion(
        context: Context,
        params: InlineCompletionParams,
    ): Promise<InlineCompletionItem[]> | InlineCompletionItem[] | undefined;
}
