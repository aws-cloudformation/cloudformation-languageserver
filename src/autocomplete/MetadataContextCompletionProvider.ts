import { CompletionItem, CompletionItemKind, CompletionParams } from 'vscode-languageserver';
import { Context } from '../context/Context';
import { getMetadataContextRelativePath, getMetadataContextScope } from '../context/MetadataContext';
import { NodeType } from '../context/syntaxtree/utils/NodeType';
import {
    getMetadataContextObjectSchema,
    METADATA_CONTEXT_KEY,
    RESOURCE_METADATA_CONTEXT_SCHEMA,
    resolveMetadataContextSchema,
    TEMPLATE_METADATA_CONTEXT_SCHEMA,
} from '../schema/MetadataContextSchema';
import { PropertyType } from '../schema/ResourceSchema';
import { Measure } from '../telemetry/TelemetryDecorator';
import { getFuzzySearchFunction } from '../utils/FuzzySearchUtil';
import { CompletionProvider } from './CompletionProvider';
import { createCompletionItem, createMarkupContent } from './CompletionUtils';

export { METADATA_CONTEXT_KEY } from '../schema/MetadataContextSchema';

export class MetadataContextCompletionProvider implements CompletionProvider {
    private readonly fuzzySearch = getFuzzySearchFunction();

    static canProvide(context: Context): boolean {
        const relativePath = getMetadataContextRelativePath(context)?.filter((segment) => segment !== '');
        if (!relativePath) {
            return false;
        }
        return (
            relativePath.length === 0 ||
            relativePath[0] === METADATA_CONTEXT_KEY ||
            (relativePath.length === 1 && context.isKey())
        );
    }

    @Measure({ name: 'getCompletions', extractContextAttributes: true })
    getCompletions(context: Context, _params: CompletionParams): CompletionItem[] {
        if (!MetadataContextCompletionProvider.canProvide(context)) {
            return [];
        }

        const relativePath = getMetadataContextRelativePath(context) ?? [];
        const lookupPath = this.getLookupPath(relativePath, context);
        const existingProperties = this.getExistingProperties(context);

        if (lookupPath.length === 0) {
            if (existingProperties.has(METADATA_CONTEXT_KEY)) {
                return [];
            }

            return this.filterCompletions(
                [
                    createCompletionItem(METADATA_CONTEXT_KEY, CompletionItemKind.Property, {
                        documentation: createMarkupContent(
                            'Structured convention for preserving CloudFormation design intent and operational context.',
                        ),
                        data: { type: 'object' },
                        context,
                    }),
                ],
                context,
            );
        }

        if (lookupPath[0] !== METADATA_CONTEXT_KEY) {
            return [];
        }

        const contextSchema =
            getMetadataContextScope(context) === 'template'
                ? TEMPLATE_METADATA_CONTEXT_SCHEMA
                : RESOURCE_METADATA_CONTEXT_SCHEMA;
        const schemaPath = lookupPath.slice(1);

        if (context.isKey()) {
            const containerSchema = resolveMetadataContextSchema(contextSchema, schemaPath);
            const propertyCompletions = this.createPropertyCompletions(containerSchema, existingProperties, context);
            if (propertyCompletions.length > 0) {
                return this.filterCompletions(propertyCompletions, context);
            }
        }

        if (context.isValue()) {
            const valueSchema = resolveMetadataContextSchema(contextSchema, schemaPath);
            if (valueSchema?.enum) {
                return this.filterCompletions(
                    valueSchema.enum.map((value, index) =>
                        createCompletionItem(String(value), CompletionItemKind.EnumMember, {
                            sortText: String(index),
                            documentation: valueSchema.description
                                ? createMarkupContent(valueSchema.description)
                                : undefined,
                            data: { type: 'simple' },
                            context,
                        }),
                    ),
                    context,
                );
            }
        }

        return [];
    }

    private getLookupPath(
        relativePath: ReadonlyArray<string | number>,
        context: Context,
    ): ReadonlyArray<string | number> {
        let lookupPath = relativePath.filter((segment) => segment !== '');
        const currentSegment = lookupPath.at(-1);

        if (context.isKey() && typeof currentSegment === 'string' && currentSegment === context.text) {
            lookupPath = lookupPath.slice(0, -1);
        }

        return lookupPath;
    }

    private createPropertyCompletions(
        schema: PropertyType | undefined,
        existingProperties: ReadonlySet<string>,
        context: Context,
    ): CompletionItem[] {
        const objectSchema = getMetadataContextObjectSchema(schema);
        if (!objectSchema?.properties) {
            return [];
        }

        return Object.entries(objectSchema.properties)
            .filter(([propertyName]) => !existingProperties.has(propertyName))
            .map(([propertyName, propertySchema]) =>
                createCompletionItem(propertyName, CompletionItemKind.Property, {
                    documentation: propertySchema.description
                        ? createMarkupContent(propertySchema.description)
                        : undefined,
                    data: { type: this.getCompletionType(propertySchema) },
                    context,
                }),
            );
    }

    private getCompletionType(schema: PropertyType): 'array' | 'object' | 'simple' {
        const types = Array.isArray(schema.type) ? schema.type : [schema.type];
        if (types.includes('array')) {
            return 'array';
        }
        if (types.includes('object')) {
            return 'object';
        }
        return 'simple';
    }

    private getExistingProperties(context: Context): ReadonlySet<string> {
        if (NodeType.isMappingNode(context.syntaxNode, context.documentType)) {
            return new Set(context.getMappingKeys());
        }

        const mappingContext = context.createContextFromParent((node) =>
            NodeType.isMappingNode(node, context.documentType),
        );
        return new Set(mappingContext?.getMappingKeys());
    }

    private filterCompletions(completions: CompletionItem[], context: Context): CompletionItem[] {
        if (context.text.length === 0 || context.atBlockMappingLevel()) {
            return completions;
        }
        return this.fuzzySearch(completions, context.text);
    }
}
