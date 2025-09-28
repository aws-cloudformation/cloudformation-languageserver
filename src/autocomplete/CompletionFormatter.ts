import { CompletionItem, CompletionItemKind, CompletionList, InsertTextFormat } from 'vscode-languageserver';
import { Context } from '../context/Context';
import { ResourceAttributesSet, TopLevelSection, TopLevelSectionsSet } from '../context/ContextType';
import { NodeType } from '../context/syntaxtree/utils/NodeType';
import { DocumentType } from '../document/Document';
import { Closeable, Configurable } from '../server/ServerComponents';
import { DefaultSettings, EditorSettings, ISettingsSubscriber, SettingsSubscription } from '../settings/Settings';
import { LoggerFactory } from '../telemetry/LoggerFactory';
import { getIndentationString } from '../utils/IndentationUtils';

export type CompletionItemData = {
    type?: 'object' | 'array' | 'simple';
    isIntrinsicFunction?: boolean;
};

export interface ExtendedCompletionItem extends CompletionItem {
    data?: CompletionItemData;
}

export class CompletionFormatter implements Configurable, Closeable {
    private static readonly log = LoggerFactory.getLogger(CompletionFormatter);
    private static instance: CompletionFormatter;
    private editorSettings: EditorSettings = DefaultSettings.editor;
    private editorSettingsSubscription?: SettingsSubscription;

    private constructor() {}

    static getInstance(): CompletionFormatter {
        if (!CompletionFormatter.instance) {
            CompletionFormatter.instance = new CompletionFormatter();
        }
        return CompletionFormatter.instance;
    }

    /**
     * Generates an indent placeholder for snippets
     * @param numberOfIndents The number of indentation levels (1 = {INDENT1}, 2 = {INDENT2}, etc.)
     * @returns The indent placeholder string
     */
    static getIndentPlaceholder(numberOfIndents: number): string {
        return `{INDENT${numberOfIndents}}`;
    }

    format(completions: CompletionList, context: Context): CompletionList {
        try {
            const documentType = context.documentType;

            const formattedItems = completions.items.map((item) => this.formatItem(item, documentType));

            return {
                ...completions,
                items: formattedItems,
            };
        } catch (error) {
            CompletionFormatter.log.warn({ error }, 'Failed to adapt completions');
            return completions;
        }
    }

    configure(settingsManager: ISettingsSubscriber): void {
        if (this.editorSettingsSubscription) {
            this.editorSettingsSubscription.unsubscribe();
        }

        this.editorSettingsSubscription = settingsManager.subscribe('editor', (newEditorSettings) => {
            this.editorSettings = newEditorSettings;
        });
    }

    close(): void {
        if (this.editorSettingsSubscription) {
            this.editorSettingsSubscription.unsubscribe();
            this.editorSettingsSubscription = undefined;
        }
    }

    private formatItem(item: CompletionItem, documentType: DocumentType): CompletionItem {
        const formattedItem = { ...item };

        // Skip formatting for items that already have snippet format
        if (item.insertTextFormat === InsertTextFormat.Snippet) {
            return formattedItem;
        }

        const textToFormat = item.insertText ?? item.label;

        if (documentType === DocumentType.JSON) {
            formattedItem.insertText = this.formatForJson(textToFormat);
        } else {
            formattedItem.insertText = this.formatForYaml(textToFormat, item);
        }

        return formattedItem;
    }

    private formatForJson(label: string): string {
        return label;
    }

    private formatForYaml(label: string, item: CompletionItem | undefined): string {
        // Intrinsic functions should not be formatted with colons
        if (
            item?.data &&
            typeof item.data === 'object' &&
            'isIntrinsicFunction' in item.data &&
            (item.data as { isIntrinsicFunction: boolean }).isIntrinsicFunction
        ) {
            return label;
        }

        if (
            item?.kind === CompletionItemKind.EnumMember ||
            item?.kind === CompletionItemKind.Reference ||
            item?.kind === CompletionItemKind.Event
        ) {
            return label;
        }

        const indentString = getIndentationString(this.editorSettings, DocumentType.YAML);

        if (this.isTopLevelSection(label)) {
            if (label === String(TopLevelSection.AWSTemplateFormatVersion)) {
                return `${label}: "2010-09-09"`;
            } else if (label === String(TopLevelSection.Description) || label === String(TopLevelSection.Transform)) {
                return `${label}: `;
            } else {
                return `${label}:\n${indentString}`;
            }
        } else if (this.isResourceAttribute(label)) {
            return `${label}: `;
        } else if (NodeType.isResourceType(label)) {
            return label;
        } else if (this.isObjectType(item)) {
            return `${label}:`;
        } else if (this.isArrayType(item)) {
            return `${label}:\n${indentString}`;
        } else if (label === 'Properties') {
            return `${label}:\n${indentString}`;
        } else {
            return `${label}: `;
        }
    }

    private isTopLevelSection(label: string): boolean {
        return TopLevelSectionsSet.has(label);
    }

    private isResourceAttribute(label: string): boolean {
        return ResourceAttributesSet.has(label);
    }

    private isObjectType(item?: CompletionItem): boolean {
        const data = item?.data as CompletionItemData | undefined;
        return data?.type === 'object';
    }

    private isArrayType(item?: CompletionItem): boolean {
        const data = item?.data as CompletionItemData | undefined;
        return data?.type === 'array';
    }
}
