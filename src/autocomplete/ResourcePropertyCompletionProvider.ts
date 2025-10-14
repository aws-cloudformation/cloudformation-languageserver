import { CompletionItem, CompletionItemKind, CompletionParams } from 'vscode-languageserver';
import { Context } from '../context/Context';
import { Resource } from '../context/semantic/Entity';
import { CfnValue } from '../context/semantic/SemanticTypes';
import { NodeType } from '../context/syntaxtree/utils/NodeType';
import { CommonNodeTypes } from '../context/syntaxtree/utils/TreeSitterTypes';
import { propertyTypesToMarkdown } from '../hover/HoverFormatter';
import { PropertyType, ResourceSchema } from '../schema/ResourceSchema';
import { SchemaRetriever } from '../schema/SchemaRetriever';
import { getFuzzySearchFunction } from '../utils/FuzzySearchUtil';
import { templatePathToJsonPointerPath } from '../utils/PathUtils';
import { CompletionItemData, ExtendedCompletionItem } from './CompletionFormatter';
import { CompletionProvider } from './CompletionProvider';
import { createCompletionItem, createMarkupContent } from './CompletionUtils';

export class ResourcePropertyCompletionProvider implements CompletionProvider {
    private readonly fuzzySearch = getFuzzySearchFunction();

    constructor(private readonly schemaRetriever: SchemaRetriever) {}

    getCompletions(context: Context, _params: CompletionParams): CompletionItem[] | undefined {
        // Use unified property completion method for all scenarios
        const propertyCompletions = this.getPropertyCompletions(context);

        if (context.text.length > 0 && !context.atBlockMappingLevel()) {
            return this.fuzzySearch(propertyCompletions, context.text);
        }

        return propertyCompletions;
    }

    /**
     * Unified property completion method that handles both root-level properties and nested subproperties
     * Also handles enum value completions when appropriate
     * Uses robust schema resolution approach from hover provider
     */
    private getPropertyCompletions(context: Context): CompletionItem[] {
        const resource = context.entity as Resource;

        if (!resource.Type) {
            return [];
        }

        const schema = this.schemaRetriever.getDefault().schemas.get(resource.Type);
        if (!schema) {
            return [];
        }

        let completions: CompletionItem[] = [];

        if (context.isKey()) {
            const schemaPath = this.getSchemaPath(context);
            const resolvedSchemas = schema.resolveJsonPointerPath(schemaPath, {
                excludeReadOnly: true,
                requireFullyResolved: true,
            });
            completions = [...completions, ...this.getPropertyCompletionsFromSchemas(resolvedSchemas, context, schema)];
        }

        if (context.isValue()) {
            const enumSchemaPath = this.getSchemaPath(context);
            const enumResolvedSchemas = schema.resolveJsonPointerPath(enumSchemaPath, {
                excludeReadOnly: true,
                requireFullyResolved: true,
            });
            completions = [...completions, ...this.getEnumCompletions(enumResolvedSchemas, context)];
        }

        return completions;
    }

    private getSchemaPath(context: Context): string {
        let segments = context.propertyPath.slice(3);

        // For SYNTHETIC_KEY_OR_VALUE, both key and value need the same path (current property)
        if (
            NodeType.isNodeType(context['node'], CommonNodeTypes.SYNTHETIC_KEY_OR_VALUE) ||
            (context.isKey() && context.isValue())
        ) {
            return templatePathToJsonPointerPath(segments);
        }

        // For key completions, we need to determine the correct path
        if (context.isKey() && segments.length > 0) {
            // Special case: if we're in an array item (last segment is a number),
            // keep the full path to get array item schema
            const lastSegment = segments[segments.length - 1];
            if (typeof lastSegment === 'number') {
                return templatePathToJsonPointerPath(segments);
            } else {
                // Regular case: remove last segment to get parent properties
                segments = segments.slice(0, -1);
            }
        }

        return templatePathToJsonPointerPath(segments);
    }

    /**
     * Extracts property completions from resolved schemas
     */
    private getPropertyCompletionsFromSchemas(
        resolvedSchemas: PropertyType[],
        context: Context,
        schema: ResourceSchema,
    ): CompletionItem[] {
        // Collect all properties from all resolved schemas
        const allProperties = new Map<string, PropertyType>();
        const requiredProperties = new Set<string>();

        for (const resolvedSchema of resolvedSchemas) {
            if (resolvedSchema.properties) {
                for (const [propertyName, propertyDef] of Object.entries(resolvedSchema.properties)) {
                    // Use the first schema that defines this property
                    if (!allProperties.has(propertyName)) {
                        allProperties.set(propertyName, propertyDef);
                    }
                }
            }

            // Collect required properties from all schemas
            if (resolvedSchema.required) {
                for (const requiredProp of resolvedSchema.required) {
                    requiredProperties.add(requiredProp);
                }
            }
        }

        // Get existing property names at the current level to avoid duplicates
        const existingProperties = this.getExistingProperties(context);

        // Filter properties based on requirements
        return this.filterProperties(
            allProperties,
            requiredProperties,
            existingProperties,
            context.text.length === 0,
            schema,
            context,
        );
    }

    /**
     * Creates enum value completions from resolved schemas
     */
    private getEnumCompletions(resolvedSchemas: PropertyType[], context: Context): CompletionItem[] {
        const enumValues: (string | number)[] = [];

        for (const resolvedSchema of resolvedSchemas) {
            if (resolvedSchema.enum && resolvedSchema.enum.length > 0) {
                // Add enum values, avoiding duplicates
                for (const enumValue of resolvedSchema.enum) {
                    const typedEnumValue = enumValue as string | number;
                    if (!enumValues.includes(typedEnumValue)) {
                        enumValues.push(typedEnumValue);
                    }
                }
            }
        }

        if (enumValues.length === 0) {
            return [];
        }

        const completions = enumValues.map((value, index) =>
            createCompletionItem(String(value), CompletionItemKind.EnumMember, {
                sortText: `${index}`,
                context: context,
            }),
        );

        // Apply fuzzy search if there's text
        if (context.text.length > 0) {
            return this.fuzzySearch(completions, context.text);
        }

        return completions;
    }

    /**
     * Gets existing properties at the current context level
     */
    private getExistingProperties(context: Context): Set<string> {
        const propertyPath = context.propertyPath;
        if (propertyPath.length > 3 && typeof propertyPath[propertyPath.length - 1] === 'number') {
            const entity = context.entity as Resource;
            if (entity?.Properties) {
                const pathSegments = propertyPath.slice(3); // Remove ['Resources', 'LogicalId', 'Properties']
                let current: Record<string, CfnValue> | CfnValue | undefined = entity.Properties;

                for (let i = 0; i < pathSegments.length - 1; i++) {
                    if (current && typeof current === 'object' && pathSegments[i] in current) {
                        current = (current as Record<string | number, CfnValue>)[pathSegments[i]];
                    } else {
                        current = undefined;
                        break;
                    }
                }

                const arrayIndex = pathSegments[pathSegments.length - 1];
                if (current && typeof current === 'object' && arrayIndex in current) {
                    const arrayItem = (current as Record<string | number, CfnValue>)[arrayIndex];

                    if (arrayItem && typeof arrayItem === 'object' && arrayItem !== null) {
                        return new Set(Object.keys(arrayItem as Record<string, CfnValue>));
                    }
                }
            }
        }

        // if we are at a spot that we can be a key or value
        // it means we know there aren't siblings and we aren't in a mapping
        if (context.isKey() && context.isValue()) {
            return new Set();
        }
        // Find the parent mapping context
        const mappingContext = context.createContextFromParent((node) =>
            NodeType.isMappingNode(node, context.documentType),
        );

        if (mappingContext) {
            return new Set(mappingContext.getMappingKeys());
        }

        return new Set<string>();
    }

    /**
     * Filters properties, excluding those already defined in the resource
     * When text is empty and required properties exist, only shows required properties
     */
    private filterProperties(
        allProperties: Map<string, PropertyType>,
        requiredProperties: Set<string>,
        existingProperties: Set<string>,
        isEmptyText: boolean,
        schema: ResourceSchema,
        context: Context,
    ): CompletionItem[] {
        const result: CompletionItem[] = [];
        const availableRequiredProperties = [...requiredProperties].filter(
            (propName) => allProperties.has(propName) && !existingProperties.has(propName),
        );

        for (const [propertyName, propertyDef] of allProperties.entries()) {
            if (existingProperties.has(propertyName)) {
                continue;
            }

            const isRequired = requiredProperties.has(propertyName);

            if (isEmptyText && availableRequiredProperties.length > 0 && !isRequired) {
                continue;
            }

            const itemData = this.getPropertyType(schema, propertyDef);

            // Generate rich markdown documentation for the property
            let documentation;
            if (propertyDef.description || propertyDef.properties || propertyDef.type) {
                // Use the rich markdown formatter from hover system
                const markdownDoc = propertyTypesToMarkdown(propertyName, [propertyDef]);
                documentation = createMarkupContent(markdownDoc);
            } else {
                // Fallback to simple description for properties without schema details
                documentation = `${propertyName} property of ${schema.typeName}`;
            }

            const completionItem: ExtendedCompletionItem = createCompletionItem(
                propertyName,
                CompletionItemKind.Property,
                {
                    documentation: documentation,
                    data: itemData,
                    context: context,
                },
            );

            result.push(completionItem);
        }

        return result;
    }

    private getPropertyType(schema: ResourceSchema, propertyDef?: PropertyType): CompletionItemData {
        const itemData: CompletionItemData = {};

        if (propertyDef?.type === 'object' || (propertyDef?.$ref && this.isRefToObjectType(schema, propertyDef.$ref))) {
            itemData.type = 'object';
        } else if (
            propertyDef?.type === 'array' ||
            (propertyDef?.$ref && this.isRefToArrayType(schema, propertyDef.$ref))
        ) {
            itemData.type = 'array';
        } else {
            itemData.type = 'simple';
        }

        return itemData;
    }

    private isRefToObjectType(schema: ResourceSchema, ref: string): boolean {
        const refProperty = schema.resolveRef(ref);
        return refProperty?.type === 'object';
    }

    private isRefToArrayType(schema: ResourceSchema, ref: string): boolean {
        const refProperty = schema.resolveRef(ref);
        return refProperty?.type === 'array';
    }
}
