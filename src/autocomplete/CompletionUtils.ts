import {
    CompletionItem,
    CompletionItemKind,
    CompletionParams,
    InsertTextFormat,
    InsertTextMode,
    Position,
    Range,
    TextEdit,
} from 'vscode-languageserver';
import { Context } from '../context/Context';
import { DocumentManager } from '../document/DocumentManager';
import { LoggerFactory } from '../telemetry/LoggerFactory';
import { ExtensionName } from '../utils/ExtensionConfig';
import { ExtendedCompletionItem } from './CompletionFormatter';

/**
 * Creates a replacement range from a context's start and end positions.
 * This is used for text edits in completion items.
 *
 * @param context The context containing position information
 * @param includeQuotes
 * @returns A Range object or undefined if creation fails
 */
export function createReplacementRange(context: Context, includeQuotes?: boolean): Range | undefined {
    try {
        const quotesLength = includeQuotes === true ? 1 : 0;
        const startPos = Position.create(context.startPosition.row, context.startPosition.column - quotesLength);
        const endPos = Position.create(context.endPosition.row, context.endPosition.column + quotesLength);
        return Range.create(startPos, endPos);
    } catch {
        return undefined;
    }
}

/**
 * Creates a base completion item with common properties.
 * This reduces duplication across different completion providers.
 *
 * @param label The label for the completion item
 * @param kind The kind of completion item
 * @param options Additional options for the completion item
 * @returns A CompletionItem with common properties set
 */
export function createCompletionItem(
    label: string,
    kind: CompletionItemKind,
    options?: {
        detail?: string | undefined;
        insertText?: string;
        insertTextFormat?: InsertTextFormat;
        insertTextMode?: InsertTextMode;
        sortText?: string;
        documentation?: string;
        data?: Record<string, unknown>;
        context?: Context;
    },
): CompletionItem {
    let textEdit: TextEdit | undefined = undefined;
    let filterText = label;
    const insertText = options?.insertText ?? label;
    if (options?.context) {
        const textInQuotes = options.context.textInQuotes();
        if (textInQuotes) {
            const range = createReplacementRange(options.context);
            filterText = `${textInQuotes}${String(label)}${textInQuotes}`;
            if (range) {
                textEdit = TextEdit.replace(range, `${textInQuotes}${insertText}${textInQuotes}`);
            }
        }
    }

    return {
        label,
        kind,
        detail: options?.detail ?? ExtensionName,
        insertText: insertText,
        insertTextFormat: options?.insertTextFormat,
        insertTextMode: options?.insertTextMode,
        textEdit: textEdit,
        filterText: filterText,
        sortText: options?.sortText,
        documentation: `${options?.documentation ? `${options?.documentation}\n` : ''}Source: ${ExtensionName}`,
        data: options?.data,
    };
}

/**
 * Handles JSON quotes for snippet completions.
 * This is used by both TopLevelSectionCompletionProvider and ResourceSectionCompletionProvider.
 *
 * @param completionItem The completion item to modify
 * @param context The context containing position information
 * @param params The completion parameters
 * @param documentManager The document manager to get line content
 * @param loggerName The name of the logger for warning messages
 */
export function handleSnippetJsonQuotes(
    completionItem: ExtendedCompletionItem,
    context: Context,
    params: CompletionParams,
    documentManager: DocumentManager,
    loggerName: string,
): void {
    const log = LoggerFactory.getLogger(loggerName);
    const uri = params.textDocument.uri;
    const lineContent = documentManager.getLine(uri, context.startPosition.row);

    const hasQuotes = lineContent?.includes('"');

    if (hasQuotes) {
        const range = createReplacementRange(context, true);

        if (range) {
            if (context.text.length === 0) {
                range.start.character += 1;
            }
            completionItem.textEdit = TextEdit.replace(range, `${completionItem.insertText}`);
            completionItem.filterText = `"${context.text}"`;
            delete completionItem.insertText;
        } else {
            log.warn(
                {
                    context: context,
                },
                `Unable to create Range for Snippet completion item`,
            );
        }
    }
}
