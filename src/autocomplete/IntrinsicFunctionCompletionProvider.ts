import { CompletionItem, CompletionItemKind, CompletionParams, TextEdit } from 'vscode-languageserver';
import { Context } from '../context/Context';
import { Intrinsics } from '../context/ContextType';
import { DocumentType } from '../document/Document';
import { Measure } from '../telemetry/TelemetryDecorator';
import { getFuzzySearchFunction } from '../utils/FuzzySearchUtil';
import { CompletionProvider } from './CompletionProvider';
import { createCompletionItem, createReplacementRange } from './CompletionUtils';

export class IntrinsicFunctionCompletionProvider implements CompletionProvider {
    private readonly fuzzySearch = getFuzzySearchFunction({
        keys: [{ name: 'label', weight: 1 }],
        threshold: 0.7,
        distance: 5,
        minMatchCharLength: 1,
        shouldSort: true,
        ignoreLocation: false,
    });

    @Measure({ name: 'getCompletions' })
    getCompletions(context: Context, params: CompletionParams): CompletionItem[] | undefined {
        const triggerChar = params.context?.triggerCharacter ?? '';
        const isYaml = context.documentType !== DocumentType.JSON;
        const isYamlShortForm = (triggerChar === '!' || context.text.startsWith('!')) && isYaml;
        const isFnColonTrigger = context.text === 'Fn:' || (context.text === 'Fn' && triggerChar === ':');
        const isFnNamespaceTrigger = context.text.includes('Fn::') || context.text.startsWith('Fn::');

        const completions: CompletionItem[] = [];

        for (const fnName of Intrinsics) {
            const completion = this.createCompletion(
                fnName,
                isYamlShortForm,
                isFnColonTrigger,
                isFnNamespaceTrigger,
                context,
            );
            if (completion) {
                completions.push(completion);
            }
        }
        return this.fuzzySearch(completions, context.text);
    }

    private createCompletion(
        fnName: string,
        isYamlShortForm: boolean,
        isFnColonTrigger: boolean,
        isFnNamespaceTrigger: boolean,
        context: Context,
    ): CompletionItem | undefined {
        const isFnNamespace = fnName.startsWith('Fn::');

        if (isYamlShortForm && isFnNamespace) {
            const shortName = fnName.replace('Fn::', '');
            return this.buildCompletionItem(`!${shortName}`, shortName, true, false, context);
        }

        if ((isFnColonTrigger || isFnNamespaceTrigger) && isFnNamespace) {
            const insertText = isFnNamespaceTrigger ? fnName : fnName.replace('Fn::', '');
            return this.buildCompletionItem(fnName, insertText, false, isFnColonTrigger, context);
        }

        if ((isYamlShortForm || isFnColonTrigger || isFnNamespaceTrigger) && fnName === 'Ref') {
            const label = isYamlShortForm ? '!Ref' : 'Ref';
            return this.buildCompletionItem(label, 'Ref', isYamlShortForm, isFnColonTrigger, context);
        }

        return undefined;
    }

    private buildCompletionItem(
        label: string,
        insertText: string,
        isYamlShortForm = false,
        isFnColonTrigger = false,
        context: Context,
    ): CompletionItem {
        // For YAML short form, if the user has typed text that starts with '!',
        // preserve the '!' in the insert text
        let finalInsertText = insertText;
        if (isYamlShortForm && context.text.startsWith('!')) {
            finalInsertText = `!${insertText}`;
        }

        const item: CompletionItem = createCompletionItem(label, CompletionItemKind.Function, {
            insertText: finalInsertText,
            data: {
                isIntrinsicFunction: true,
                isYamlShortForm,
                isFnColonTrigger,
            },
        });

        if (context.text.length > 0) {
            const range = createReplacementRange(context);
            if (range) {
                item.textEdit = TextEdit.replace(range, finalInsertText);
                delete item.insertText;
            }
        }

        return item;
    }
}
