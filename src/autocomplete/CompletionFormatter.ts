import {
    CompletionItem,
    CompletionItemKind,
    CompletionList,
    InsertTextFormat,
    Range,
    Position,
    TextEdit,
} from 'vscode-languageserver';
import {
    ResourceAttributesSet,
    TopLevelSection,
    TopLevelSectionsSet,
} from '../context/CloudFormationEnums';
import { Context } from '../context/Context';
import { NodeType } from '../context/syntaxtree/utils/NodeType';
import { DocumentType } from '../document/Document';
import { EditorSettings } from '../settings/Settings';
import { LoggerFactory } from '../telemetry/LoggerFactory';
import { getIndentationString } from '../utils/IndentationUtils';

const WHITESPACE = new RegExp(/^\s*/);

export type CompletionItemData = {
    type?: 'object' | 'array' | 'simple';
    isIntrinsicFunction?: boolean;
    location?: 'key' | 'value';
    keyForValue?: string;
};

export interface ExtendedCompletionItem extends CompletionItem {
    data?: CompletionItemData;
}

export class CompletionFormatter {
    // In CompletionFormatter class

    private static readonly log = LoggerFactory.getLogger(CompletionFormatter);
    private static instance: CompletionFormatter;

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

    format(
        completions: CompletionList,
        context: Context,
        editorSettings: EditorSettings,
        lineContent?: string,
    ): CompletionList {
        try {
            const documentType = context.documentType;
            const formattedItems = completions.items.map((item) =>
                this.formatItem(item, documentType, editorSettings, context, lineContent),
            );
            return {
                ...completions,
                items: formattedItems,
            };
        } catch (error) {
            CompletionFormatter.log.warn(error, 'Failed to adapt completions');
            return completions;
        }
    }

    private formatItem(
        item: CompletionItem,
        documentType: DocumentType,
        editorSettings: EditorSettings,
        context: Context,
        lineContent?: string,
    ): CompletionItem {
        // Skip formatting for items that already have snippet format
        if (item.insertTextFormat === InsertTextFormat.Snippet) {
            return item;
        }

        if (documentType === DocumentType.JSON) {
            return this.formatForJson(
                editorSettings,
                item,
                context,
                lineContent,
            );
        } else {
            const formattedItem = { ...item };
            const textToFormat = item.insertText ?? item.label;
            formattedItem.insertText = this.formatForYaml(textToFormat, item, editorSettings);
            return formattedItem;
        }
    }

    private formatForJson(
        editorSettings: EditorSettings,
        itemWithInsertText: CompletionItem,
        context: Context,
        lineContent?: string,
    ): CompletionItem {
        const label = itemWithInsertText.insertText ?? itemWithInsertText.label;
        const { insertText, ...item } = itemWithInsertText;

        const currentIndentation = lineContent?.match(WHITESPACE)?.[0] || ' '.repeat(context.startPosition.column);
        const additionalIndentation = getIndentationString(editorSettings, DocumentType.JSON);

        const range = Range.create(
            Position.create(context.startPosition.row, 0),
            Position.create(context.endPosition.row, context.endPosition.column),
        );

        if (item.data?.type === 'string' || item.data?.type === 'simple') {
          const line = `${currentIndentation}"${label}": "$0"`;
          return {
            ...item,
            insertTextFormat: InsertTextFormat.Snippet,
            textEdit: TextEdit.replace(range, line),
          };
        }

        if (item.data?.type === 'array') {
          const line = `${currentIndentation}"${label}": [\n${currentIndentation}${additionalIndentation}$0\n${currentIndentation}]`;
          return {
            ...item,
            insertTextFormat: InsertTextFormat.Snippet,
            textEdit: TextEdit.replace(range, line),
          };
        }

        if (item.data?.type === 'object') {
          const line = `${currentIndentation}"${label}": {\n${currentIndentation}${additionalIndentation}$0\n${currentIndentation}}`;
          return {
            ...item,
            insertTextFormat: InsertTextFormat.Snippet,
            textEdit: TextEdit.replace(range, line),
          };
        }

        if (item.data?.location === 'value') {
            const line = `${currentIndentation}"${item.data?.keyForValue}": "${label}"`;
            return {
              ...item,
              textEdit: TextEdit.replace(range, line),
            };
        }

        const line = `${currentIndentation}"${label}": $0`;
        return {
          ...item,
          insertTextFormat: InsertTextFormat.Snippet,
          textEdit: TextEdit.replace(range, line),
        };
    }

    private formatForYaml(label: string, item: CompletionItem | undefined, editorSettings: EditorSettings): string {
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
            item?.kind === CompletionItemKind.Constant ||
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
