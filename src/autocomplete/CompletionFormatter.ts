import { CompletionItem, CompletionItemKind, CompletionList, InsertTextFormat, Range, Position, TextEdit } from 'vscode-languageserver';
import { Context } from '../context/Context';
import { ResourceAttributesSet, TopLevelSection, TopLevelSectionsSet } from '../context/ContextType';
import { NodeType } from '../context/syntaxtree/utils/NodeType';
import { DocumentType } from '../document/Document';
import { createReplacementRange } from './CompletionUtils';
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

    format(completions: CompletionList, context: Context, editorSettings: EditorSettings, lineContent?: string): CompletionList {
        try {
            const documentType = context.documentType;

            const formattedItems = completions.items.map((item) => this.formatItem(item, documentType, editorSettings, context, lineContent));

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
        const formattedItem = { ...item };

        // Skip formatting for items that already have snippet format
        if (item.insertTextFormat === InsertTextFormat.Snippet) {
            return formattedItem;
        }

        const textToFormat = item.insertText ?? item.label;

        if (documentType === DocumentType.JSON) {
          console.log("DEBUG");
          const formattedText = this.formatForJson(textToFormat, item, context, lineContent);
          if (formattedText.range) {
              console.log("have a range")
              console.log(formattedText);
              formattedItem.textEdit = TextEdit.replace(formattedText.range, formattedText.text);
              formattedItem.insertText = undefined;
          } else {
              console.log("No range")
              formattedItem.insertText = formattedText.text;
          }
          
        } else {
            formattedItem.insertText = this.formatForYaml(textToFormat, item, editorSettings);
        }

        return formattedItem;
    }

    private formatForJson(label: string, item: CompletionItem, context: Context, lineContent?: string): {text: string, range?: Range} {
      // Check if data.type equals 'object'
      if(!lineContent){
        console.log("No lineContent");
        return {
          text: label, 
        };
      }

      console.log("Line content is " + lineContent);
      console.log("Data type is " + item.data?.type )
      if(item.data?.type == 'object'){ 
        console.log("Data type is object");
        return this.enhancedFormatForJson(label, context, lineContent);
      }

        return {
          text: label,
        };
    }


    private enhancedFormatForJson (label: string, context: Context, lineContent: string) {
      const afterCursor = lineContent.substring(context.endPosition.column).trimStart();
      const beforeCursor = lineContent.substring(0, context.startPosition.column);
    
      if (afterCursor.startsWith(': {')) {
          return {
            text: label, 
          }; // ": {" already exists
      } else if (afterCursor.startsWith(':')) {
          const restOfLine = afterCursor.substring(1).trimStart();
          if (restOfLine.startsWith('{') || restOfLine === '') {
              return {
                text: label, 
              }; // Colon exists, braces exist
          }
          return {
            text: label, 
          }; // Let existing colon handle it
      } else if (afterCursor.startsWith('{')) {
        const quoteStart = beforeCursor.lastIndexOf('"');
        const quoteEnd = afterCursor.indexOf('"') + context.endPosition.column;
        
        const range = Range.create(
            Position.create(context.startPosition.row, quoteStart),
            Position.create(context.startPosition.row, quoteEnd + 1)
        );
        
        return {
            text: `"${label}":`,
            range: range
        };
      } else {
          // Check if we're inside quotes
          const inQuotes = (beforeCursor.match(/"/g) || []).length % 2 === 1;
          const hasClosingQuote = afterCursor.trimStart().startsWith('"');
          if (inQuotes && !hasClosingQuote){
              return {
                text: `${label}": {}`, 
                range: createReplacementRange(context, true),
              } // Close quote, add colon and braces
          } else {
              return {
                text: `"${label}:" {}`, 
                range: createReplacementRange(context, false),
              } // In quotes or no quotes, do a full replace
          }
      }
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
