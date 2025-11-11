import {
    CompletionItem,
    CompletionItemKind,
    CompletionList,
    InsertTextFormat,
    Range,
    Position,
    TextEdit,
} from 'vscode-languageserver';
import { Context } from '../context/Context';
import { ResourceAttributesSet, TopLevelSection, TopLevelSectionsSet } from '../context/ContextType';
import { Resource } from '../context/semantic/Entity';
import { EntityType } from '../context/semantic/SemanticTypes';
import { NodeType } from '../context/syntaxtree/utils/NodeType';
import { DocumentType } from '../document/Document';
import { SchemaRetriever } from '../schema/SchemaRetriever';
import { EditorSettings } from '../settings/Settings';
import { LoggerFactory } from '../telemetry/LoggerFactory';
import { getIndentationString } from '../utils/IndentationUtils';
import { RESOURCE_ATTRIBUTE_TYPES } from './CompletionUtils';

export type CompletionItemData = {
    type?: 'object' | 'array' | 'simple';
    isIntrinsicFunction?: boolean;
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
        schemaRetriever?: SchemaRetriever,
    ): CompletionList {
        try {
            const documentType = context.documentType;
            const formattedItems = completions.items.map((item) =>
                this.formatItem(item, documentType, editorSettings, context, lineContent, schemaRetriever),
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
        schemaRetriever?: SchemaRetriever,
    ): CompletionItem {
        const formattedItem = { ...item };

        // Skip formatting for items that already have snippet format
        if (item.insertTextFormat === InsertTextFormat.Snippet) {
            return formattedItem;
        }

        // Set filterText for ALL items (including snippets) when in JSON with quotes
        const isInJsonString = documentType === DocumentType.JSON && context.syntaxNode.type === 'string';
        if (isInJsonString) {
            formattedItem.filterText = `"${context.text}"`;
        }

        const textToFormat = item.insertText ?? item.label;

        if (documentType === DocumentType.JSON) {
            const result = this.formatForJson(
                editorSettings,
                textToFormat,
                item,
                context,
                lineContent,
                schemaRetriever,
            );
            formattedItem.textEdit = TextEdit.replace(result.range, result.text);
            if (result.isSnippet) {
                formattedItem.insertTextFormat = InsertTextFormat.Snippet;
            }
            delete formattedItem.insertText;
        } else {
            formattedItem.insertText = this.formatForYaml(textToFormat, item, editorSettings);
        }

        return formattedItem;
    }

    private formatForJson(
        editorSettings: EditorSettings,
        label: string,
        item: CompletionItem,
        context: Context,
        lineContent?: string,
        schemaRetriever?: SchemaRetriever,
    ): { text: string; range: Range; isSnippet: boolean } {
        const shouldFormat = context.syntaxNode.type === 'string' && !context.isValue() && lineContent;

        const itemData = item.data as CompletionItemData | undefined;

        let formatAsObject = itemData?.type === 'object';
        let formatAsArray = itemData?.type === 'array';
        let formatAsString = false;

        if (this.isTopLevelSection(label)) {
            if (label === String(TopLevelSection.Description)) {
                formatAsString = true;
            } else {
                formatAsObject = true;
            }
        }
        // If type is not in item.data and we have schemaRetriever, look it up from schema
        if ((!itemData?.type || itemData?.type === 'simple') && schemaRetriever && context.entity) {
            const propertyType = this.getPropertyTypeFromSchema(schemaRetriever, context, label);

            switch (propertyType) {
                case 'object': {
                    formatAsObject = true;
                    break;
                }
                case 'array': {
                    formatAsArray = true;

                    break;
                }
                case 'string': {
                    formatAsString = true;

                    break;
                }
                // No default
            }
        }

        const indentation = ' '.repeat(context.startPosition.column);
        const indentString = getIndentationString(editorSettings, DocumentType.JSON);

        let replacementText = `${indentation}"${label}":`;
        let isSnippet = false;

        if (shouldFormat) {
            isSnippet = true;
            if (formatAsObject) {
                replacementText = `${indentation}"${label}": {\n${indentation}${indentString}$0\n${indentation}}`;
            } else if (formatAsArray) {
                replacementText = `${indentation}"${label}": [\n${indentation}${indentString}$0\n${indentation}]`;
            } else if (formatAsString) {
                replacementText = `${indentation}"${label}": "$0"`;
            }
        }

        const range = Range.create(
            Position.create(context.startPosition.row, 0),
            Position.create(context.endPosition.row, context.endPosition.column + 1),
        );

        return {
            text: replacementText,
            range: range,
            isSnippet: isSnippet,
        };
    }

    /**
     * Get the type of a property from the CloudFormation schema
     * @param schemaRetriever - SchemaRetriever instance to get schemas
     * @param context - Current context with entity and property path information
     * @param propertyName - Name of the property to look up
     * @returns The first type found in the schema ('object', 'array', 'string', etc.) or undefined
     */
    private getPropertyTypeFromSchema(
        schemaRetriever: SchemaRetriever,
        context: Context,
        propertyName: string,
    ): string | undefined {
        let resourceSchema;

        if (ResourceAttributesSet.has(propertyName)) {
            return RESOURCE_ATTRIBUTE_TYPES[propertyName];
        }

        const entity = context.entity;
        if (!entity || context.getEntityType() !== EntityType.Resource) {
            return undefined;
        }

        const resourceType = (entity as Resource).Type;
        if (!resourceType) {
            return undefined;
        }
        
        try {
            const combinedSchemas = schemaRetriever.getDefault();

            resourceSchema = combinedSchemas.schemas.get(resourceType);
            if (!resourceSchema) {
                return undefined;
            }
        } catch (error){
          return undefined;
        }

        const propertiesIndex = context.propertyPath.indexOf('Properties');
        let propertyPath: string[];

        if (propertiesIndex === -1) {
            propertyPath = [propertyName];
        } else {
            const pathAfterProperties = context.propertyPath.slice(propertiesIndex + 1).map(String);

            if (
                pathAfterProperties.length > 0 &&
                pathAfterProperties[pathAfterProperties.length - 1] === context.text
            ) {
                propertyPath = [...pathAfterProperties.slice(0, -1), propertyName];
            } else if (pathAfterProperties[pathAfterProperties.length - 1] === propertyName) {
                propertyPath = pathAfterProperties;
            } else {
                propertyPath = [...pathAfterProperties, propertyName];
            }
        }

            // Build JSON pointer path using wildcard notation for array indices
            // CloudFormation schemas use /properties/Tags/*/Key format for array item properties
            const schemaPath = propertyPath.map((part) => (Number.isNaN(Number(part)) ? part : '*'));
            const jsonPointerParts = ['properties', ...schemaPath];

            const jsonPointerPath = '/' + jsonPointerParts.join('/');
            
        try {
            const propertyDefinitions = resourceSchema.resolveJsonPointerPath(jsonPointerPath);

            if (propertyDefinitions.length === 0) {
                return undefined;
            }

            const propertyDef = propertyDefinitions[0];

            if (propertyDef && 'type' in propertyDef) {
                const type = propertyDef.type;
                if (Array.isArray(type)) {
                    return type[0];
                } else if (typeof type === 'string') {
                    return type;
                }
            }

            return undefined;
        } catch (error) {
            return undefined;
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
