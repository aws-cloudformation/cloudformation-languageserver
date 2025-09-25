import { CompletionItem, CompletionItemKind, CompletionList, InsertTextFormat } from 'vscode-languageserver';
import { Context } from '../context/Context';
import { ResourceAttributesSet, TopLevelSection, TopLevelSectionsSet } from '../context/ContextType';
import { NodeType } from '../context/syntaxtree/utils/NodeType';
import { DocumentType } from '../document/Document';
import { EditorSettings } from '../settings/Settings';
import { LoggerFactory } from '../telemetry/LoggerFactory';
import { getIndentationString } from '../utils/IndentationUtils';

export type CompletionItemData = {
    type?: 'object' | 'array' | 'simple';
    isIntrinsicFunction?: boolean;
};

export interface ExtendedCompletionItem extends CompletionItem {
    data?: CompletionItemData;
}

export class CompletionFormatter {
    private static readonly log = LoggerFactory.getLogger(CompletionFormatter);

    static format(completions: CompletionList, context: Context, editorSettings: EditorSettings): CompletionList {
        try {
            const documentType = context.documentType;

            const formattedItems = completions.items.map((item) => this.formatItem(item, documentType, editorSettings));

            return {
                ...completions,
                items: formattedItems,
            };
        } catch (error) {
            CompletionFormatter.log.warn({ error }, 'Failed to adapt completions');
            return completions;
        }
    }

    private static formatItem(
        item: CompletionItem,
        documentType: DocumentType,
        editorSettings: EditorSettings,
    ): CompletionItem {
        const formattedItem = { ...item };

        // Skip formatting for items that already have snippet format
        if (item.insertTextFormat === InsertTextFormat.Snippet) {
            return formattedItem;
        }

        const textToFormat = item.insertText ?? item.label;

        if (documentType === DocumentType.JSON) {
            formattedItem.insertText = this.formatForJson(textToFormat);
        } else {
            formattedItem.insertText = this.formatForYaml(textToFormat, item, editorSettings);
        }

        return formattedItem;
    }

    private static formatForJson(label: string): string {
        return label;
    }

    private static formatForYaml(
        label: string,
        item: CompletionItem | undefined,
        editorSettings: EditorSettings,
    ): string {
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

        const indentString = getIndentationString(editorSettings, DocumentType.YAML);

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

    private static isTopLevelSection(label: string): boolean {
        return TopLevelSectionsSet.has(label);
    }

    private static isResourceAttribute(label: string): boolean {
        return ResourceAttributesSet.has(label);
    }

    private static isObjectType(item?: CompletionItem): boolean {
        const data = item?.data as CompletionItemData | undefined;
        return data?.type === 'object';
    }

    private static isArrayType(item?: CompletionItem): boolean {
        const data = item?.data as CompletionItemData | undefined;
        return data?.type === 'array';
    }
}
