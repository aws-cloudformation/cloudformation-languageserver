import { CompletionItem, CompletionItemKind, CompletionParams } from 'vscode-languageserver';
import {
    supportsCreationPolicy,
    CREATION_POLICY_SCHEMA,
    CreationPolicyPropertySchema,
} from '../artifacts/resourceAttributes/CreationPolicyPropertyDocs';
import {
    deletionPolicyValueDocsMap,
    DELETION_POLICY_VALUES,
    supportsSnapshot,
} from '../artifacts/resourceAttributes/DeletionPolicyPropertyDocs';
import {
    supportsUpdatePolicy,
    UPDATE_POLICY_SCHEMA,
    UpdatePolicyPropertySchema,
} from '../artifacts/resourceAttributes/UpdatePolicyPropertyDocs';
import {
    updateReplacePolicyValueDocsMap,
    UPDATE_REPLACE_POLICY_VALUES,
    supportsSnapshotOnReplace,
} from '../artifacts/resourceAttributes/UpdateReplacePolicyPropertyDocs-1';
import { Context } from '../context/Context';
import { ResourceAttribute, TopLevelSection, ResourceAttributesSet } from '../context/ContextType';
import { Resource } from '../context/semantic/Entity';
import { CfnValue, EntityType } from '../context/semantic/SemanticTypes';
import { NodeType } from '../context/syntaxtree/utils/NodeType';
import { CommonNodeTypes } from '../context/syntaxtree/utils/TreeSitterTypes';
import { propertyTypesToMarkdown } from '../hover/HoverFormatter';
import { PropertyType, ResourceSchema } from '../schema/ResourceSchema';
import { SchemaRetriever } from '../schema/SchemaRetriever';
import { Measure } from '../telemetry/TelemetryDecorator';
import { getFuzzySearchFunction } from '../utils/FuzzySearchUtil';
import { templatePathToJsonPointerPath } from '../utils/PathUtils';
import { CompletionItemData, ExtendedCompletionItem } from './CompletionFormatter';
import { CompletionProvider } from './CompletionProvider';
import { createCompletionItem, createMarkupContent } from './CompletionUtils';
type PropertyCompletionsResult = {
    completions: CompletionItem[];
    skipFuzzySearch: boolean;
};
type GetBooleanTypeInfoResult = {
    isBooleanType: boolean;
    resolvedSchemas: PropertyType[];
};

export class ResourcePropertyCompletionProvider implements CompletionProvider {
    private readonly fuzzySearch = getFuzzySearchFunction();

    constructor(private readonly schemaRetriever: SchemaRetriever) {}

    @Measure({ name: 'getCompletions', extractContextAttributes: true })
    getCompletions(context: Context, _params: CompletionParams): CompletionItem[] | undefined {
        // Use unified property completion method for all scenarios
        const { completions: propertyCompletions, skipFuzzySearch } = this.getPropertyCompletions(context);

        if (context.text.length > 0 && !context.atBlockMappingLevel() && !skipFuzzySearch) {
            return this.fuzzySearch(propertyCompletions, context.text);
        }

        return propertyCompletions;
    }

    /**
     * Unified property completion method that handles both root-level properties and nested subproperties
     * Also handles enum value completions when appropriate
     * Uses robust schema resolution approach from hover provider
     */
    private getPropertyCompletions(context: Context): PropertyCompletionsResult {
        const resource = context.getResourceEntity();
        if (!resource) {
            return { completions: [], skipFuzzySearch: false };
        }
        let completions: CompletionItem[] = [];
        let skipFuzzySearch = false;

        if (!resource.Type) {
            return {
                completions,
                skipFuzzySearch,
            };
        }

        if (context.isResourceAttributeProperty() || this.isAtResourceAttributeLevel(context)) {
            return {
                completions: this.getResourceAttributePropertyCompletions(context, resource),
                skipFuzzySearch,
            };
        }
        const schema = this.schemaRetriever.getDefault().schemas.get(resource.Type);
        if (!schema) {
            return {
                completions,
                skipFuzzySearch,
            };
        }

        const { isBooleanType, resolvedSchemas: booleanResolvedSchemas } = this.getBooleanTypeInfo(context, schema);
        const schemaPath = this.getSchemaPath(context);
        const resolvedSchemas = schema.resolveJsonPointerPath(schemaPath, {
            excludeReadOnly: true,
            requireFullyResolved: true,
        });

        if (context.isKey() && !isBooleanType) {
            const propertyCompletions = this.getPropertyCompletionsFromSchemas(resolvedSchemas, context, schema);
            completions = [...completions, ...propertyCompletions];
        }

        if (isBooleanType) {
            completions = [...completions, ...this.getEnumCompletions(booleanResolvedSchemas, context)];
            skipFuzzySearch = true;
        } else if (context.isValue()) {
            completions = [...completions, ...this.getEnumCompletions(resolvedSchemas, context)];
        }

        return {
            completions,
            skipFuzzySearch,
        };
    }

    private getBooleanTypeInfo(context: Context, schema: ResourceSchema): GetBooleanTypeInfoResult {
        const propertySchemaPath = templatePathToJsonPointerPath(context.propertyPath.slice(3));
        const resolvedSchemas = schema.resolveJsonPointerPath(propertySchemaPath, {
            excludeReadOnly: true,
            requireFullyResolved: true,
        });

        let isBooleanType = false;
        for (const resolvedSchema of resolvedSchemas) {
            if (resolvedSchema.type === 'boolean') {
                isBooleanType = true;
                break;
            }
        }

        return {
            isBooleanType,
            resolvedSchemas,
        };
    }

    private getSchemaPath(context: Context): string {
        const propertiesIndex = context.propertyPath.indexOf('Properties');
        if (propertiesIndex === -1) {
            return '/properties';
        }

        let segments = context.propertyPath.slice(propertiesIndex + 1);

        // For key completions (except SYNTHETIC_KEY_OR_VALUE), remove last segment
        if (
            context.isKey() &&
            segments.length > 0 &&
            !NodeType.isNodeType(context['node'], CommonNodeTypes.SYNTHETIC_KEY_OR_VALUE) &&
            !(context.isKey() && context.isValue())
        ) {
            segments = segments.slice(0, -1);
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
        // resolve array to get array item properties
        const schemasToProcess: PropertyType[] = [];

        for (const resolvedSchema of resolvedSchemas) {
            if (resolvedSchema.type === 'array' && resolvedSchema.items) {
                if (resolvedSchema.items.$ref) {
                    const itemSchema = schema.resolveRef(resolvedSchema.items.$ref);
                    if (itemSchema) {
                        schemasToProcess.push(itemSchema);
                    }
                } else {
                    schemasToProcess.push(resolvedSchema.items);
                }
            } else {
                // not an array, use the schema as is
                schemasToProcess.push(resolvedSchema);
            }
        }

        // Collect all properties from all resolved schemas
        const allProperties = new Map<string, PropertyType>();
        const requiredProperties = new Set<string>();

        for (const resolvedSchema of schemasToProcess) {
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
        const enumValues: (string | number | boolean)[] = [];

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

            if (resolvedSchema.type === 'boolean') {
                if (!enumValues.includes(true)) {
                    enumValues.push(true);
                }

                if (!enumValues.includes(false)) {
                    enumValues.push(false);
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
        if (context.text.length > 0 && context.isValue()) {
            return this.fuzzySearch(completions, context.text);
        }

        return completions;
    }

    /**
     * Gets existing properties at the current context level
     */
    private getExistingProperties(context: Context): Set<string> {
        const propertyPath = context.propertyPath;
        const lastSegment = propertyPath[propertyPath.length - 1];
        const isArrayItemContext = typeof lastSegment === 'number' || lastSegment === '';

        // Find the Properties index dynamically
        const startIndex = context.getEntityType() === EntityType.ForEachResource ? 4 : 2;
        const propertiesIndex = propertyPath.indexOf('Properties', startIndex);

        if (propertiesIndex !== -1 && isArrayItemContext) {
            const resource = context.getResourceEntity();

            if (resource?.Properties) {
                const pathSegments = propertyPath.slice(propertiesIndex + 1);
                let current: Record<string, CfnValue> | CfnValue | undefined = resource.Properties;

                for (let i = 0; i < pathSegments.length - 1; i++) {
                    if (current && typeof current === 'object' && pathSegments[i] in current) {
                        current = (current as Record<string | number, CfnValue>)[pathSegments[i]];
                    } else {
                        current = undefined;
                        break;
                    }
                }

                if (Array.isArray(current) && current.length > 0) {
                    let arrayItem: CfnValue | undefined;
                    if (typeof lastSegment === 'number' && lastSegment in current) {
                        arrayItem = (current as CfnValue[])[lastSegment];
                    } else if (lastSegment === '') {
                        arrayItem = (current as CfnValue[])[0];
                    }

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

    private isAtResourceAttributeLevel(context: Context): boolean {
        if (context.section !== TopLevelSection.Resources || !context.hasLogicalId) {
            return false;
        }

        const lastSegment = context.propertyPath[context.propertyPath.length - 1];
        return ResourceAttributesSet.has(lastSegment as string);
    }

    private getResourceAttributePropertyCompletions(context: Context, resource: Resource): CompletionItem[] {
        const propertyPath = this.getResourceAttributePropertyPath(context);

        if (propertyPath.length === 0 || !resource.Type) {
            return [];
        }

        const attributeType = propertyPath[0] as ResourceAttribute;
        const existingProperties = this.getExistingProperties(context);

        switch (attributeType) {
            case ResourceAttribute.CreationPolicy: {
                return this.getCreationPolicyCompletions(propertyPath, resource.Type, context, existingProperties);
            }
            case ResourceAttribute.UpdatePolicy: {
                return this.getUpdatePolicyCompletions(propertyPath, resource.Type, context, existingProperties);
            }
            case ResourceAttribute.DeletionPolicy: {
                return this.getDeletionPolicyCompletions(resource.Type, context);
            }
            case ResourceAttribute.UpdateReplacePolicy: {
                return this.getUpdateReplacePolicyCompletions(resource.Type, context);
            }
            default: {
                return [];
            }
        }
    }

    private getResourceAttributePropertyPath(context: Context): ReadonlyArray<string> {
        let propertyPath = context.getResourceAttributePropertyPath();

        if (propertyPath.length === 0 && this.isAtResourceAttributeLevel(context)) {
            const lastSegment = context.propertyPath[context.propertyPath.length - 1];
            if (ResourceAttributesSet.has(lastSegment as string)) {
                propertyPath = [lastSegment as string];
            }
        }

        if (context.isKey() && propertyPath.length > 1) {
            const lastSegment = propertyPath[propertyPath.length - 1];

            if (lastSegment === context.text && context.text !== '') {
                propertyPath = propertyPath.slice(0, -1);
            }
        }

        return propertyPath;
    }
    private getCreationPolicyCompletions(
        propertyPath: ReadonlyArray<string>,
        resourceType: string,
        context: Context,
        existingProperties: Set<string>,
    ): CompletionItem[] {
        if (!supportsCreationPolicy(resourceType)) {
            return [];
        }

        return this.getSchemaBasedCompletions(
            CREATION_POLICY_SCHEMA,
            propertyPath,
            resourceType,
            context,
            existingProperties,
        );
    }

    private getUpdatePolicyCompletions(
        propertyPath: ReadonlyArray<string>,
        resourceType: string,
        context: Context,
        existingProperties: Set<string>,
    ): CompletionItem[] {
        if (!supportsUpdatePolicy(resourceType)) {
            return [];
        }

        return this.getSchemaBasedCompletions(
            UPDATE_POLICY_SCHEMA,
            propertyPath,
            resourceType,
            context,
            existingProperties,
        );
    }

    private getDeletionPolicyCompletions(resourceType: string, context: Context): CompletionItem[] {
        return this.getPolicyCompletions(
            DELETION_POLICY_VALUES,
            deletionPolicyValueDocsMap,
            supportsSnapshot,
            resourceType,
            context,
        );
    }

    private getUpdateReplacePolicyCompletions(resourceType: string, context: Context): CompletionItem[] {
        return this.getPolicyCompletions(
            UPDATE_REPLACE_POLICY_VALUES,
            updateReplacePolicyValueDocsMap,
            supportsSnapshotOnReplace,
            resourceType,
            context,
        );
    }

    private getPolicyCompletions(
        values: ReadonlyArray<string>,
        docsMap: ReadonlyMap<string, string>,
        supportsSnapshotFn: (resourceType: string) => boolean,
        resourceType: string,
        context: Context,
    ): CompletionItem[] {
        if (!context.isValue()) {
            return [];
        }

        return values
            .filter((value) => value !== 'Snapshot' || supportsSnapshotFn(resourceType))
            .map((value, index) => {
                const documentation = docsMap.get(value);
                return createCompletionItem(value, CompletionItemKind.EnumMember, {
                    sortText: `${index}`,
                    documentation: documentation ? createMarkupContent(documentation) : undefined,
                    data: { type: 'simple' },
                    context: context,
                });
            });
    }

    private getSchemaBasedCompletions(
        schema: Record<string, CreationPolicyPropertySchema | UpdatePolicyPropertySchema>,
        propertyPath: ReadonlyArray<string>,
        resourceType: string,
        context: Context,
        existingProperties: Set<string>,
    ): CompletionItem[] {
        const completions: CompletionItem[] = [];
        const filteredPath = propertyPath.filter((segment) => segment !== '');
        const depth = filteredPath.length;

        if (!context.isKey()) {
            return completions;
        }

        // Root level
        if (depth === 1) {
            for (const [propertyName, propertySchema] of Object.entries(schema)) {
                if (existingProperties.has(propertyName)) {
                    continue;
                }

                if (
                    propertySchema.supportedResourceTypes &&
                    !propertySchema.supportedResourceTypes.includes(resourceType)
                ) {
                    continue;
                }

                completions.push(
                    createCompletionItem(propertyName, CompletionItemKind.Property, {
                        data: { type: propertySchema.type },
                        context: context,
                    }),
                );
            }
        }
        // Nested levels
        else if (depth >= 2) {
            const parentPropertyName = filteredPath[1];
            const parentSchema = schema[parentPropertyName];

            if (parentSchema?.properties) {
                if (
                    parentSchema.supportedResourceTypes &&
                    !parentSchema.supportedResourceTypes.includes(resourceType)
                ) {
                    return completions;
                }

                let currentSchema = parentSchema.properties;
                for (let i = 2; i < depth - 1; i++) {
                    const segmentName = filteredPath[i];
                    const segmentSchema = currentSchema[segmentName];
                    if (segmentSchema?.properties) {
                        currentSchema = segmentSchema.properties;
                    } else {
                        return completions;
                    }
                }

                for (const [propertyName, propertySchema] of Object.entries(currentSchema)) {
                    if (existingProperties.has(propertyName)) {
                        continue;
                    }

                    completions.push(
                        createCompletionItem(propertyName, CompletionItemKind.Property, {
                            data: { type: propertySchema.type },
                            context: context,
                        }),
                    );
                }
            }
        }

        return completions;
    }
}
