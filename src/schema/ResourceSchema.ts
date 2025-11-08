/* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-argument, @typescript-eslint/no-unsafe-call */

import { Measure } from '../telemetry/TelemetryDecorator';

/**
 * Configuration options for path navigation and schema resolution
 */
interface PathNavigationOptions {
    /** Whether to exclude read-only properties from results */
    excludeReadOnly?: boolean;
    /** Whether to only return results if the path is fully resolved */
    requireFullyResolved?: boolean;
}

/**
 * Context maintained during schema traversal
 */
interface TraversalContext {
    /** Current schema being processed */
    currentSchema: PropertyType;
    /** Stack of $ref values being resolved to detect circular references */
    refStack: string[];
    /** Processing options */
    options: PathNavigationOptions;
    /** Current path segments being processed */
    remainingSegments: string[];
    /** Accumulated results from schema resolution */
    results: PropertyType[];
    /** Current path context for tracking read-only properties */
    currentPath: string[];
}

export class ResourceSchema {
    // Core schema properties
    public readonly $schema?: string;
    public readonly $id?: string;
    public readonly typeName: string;
    public readonly description: string;
    public readonly sourceUrl?: string;
    public readonly documentationUrl?: string;
    public readonly title?: string;
    public readonly type?: string;
    public readonly additionalProperties: boolean;

    public readonly primaryIdentifier: string[];
    public readonly additionalIdentifiers?: string[][];
    public readonly readOnlyProperties?: string[];
    public readonly writeOnlyProperties?: string[];
    public readonly createOnlyProperties?: string[];
    public readonly deprecatedProperties?: string[];
    private _attributes?: Array<{ name: string; description: string }>;
    public readonly conditionalCreateOnlyProperties?: string[];
    public readonly nonPublicProperties?: string[];
    public readonly nonPublicDefinitions?: string[];
    public readonly required?: string[];
    public readonly replacementStrategy?: 'create_then_delete' | 'delete_then_create';

    public readonly properties: Record<string, PropertyType>;
    public readonly definitions?: Record<string, PropertyType>;

    public readonly taggable?: boolean;
    public readonly tagging?: TaggingConfigurationType;

    public readonly handlers?: HandlersType;
    public readonly resourceLink?: ResourceLinkType;
    public readonly propertyTransform?: Record<string, string>;
    public readonly typeConfiguration?: unknown;

    public readonly allOf?: unknown[];
    public readonly anyOf?: unknown[];
    public readonly oneOf?: unknown[];

    public readonly propertyKeys: ReadonlySet<string>;
    public readonly isAws: boolean;
    public readonly isSam: boolean;
    public readonly rootSchema: PropertyType;

    constructor(jsonString: string) {
        const schema = JSON.parse(jsonString);
        // Validate required fields
        if (!schema.typeName) throw new Error('Schema must have a typeName');
        if (!schema.properties) throw new Error('Schema must have properties');
        if (!schema.description) throw new Error('Schema must have a description');
        if (!schema.primaryIdentifier) throw new Error('Schema must have a primaryIdentifier');
        if (schema.additionalProperties === undefined) throw new Error('Schema must specify additionalProperties');

        // Core schema properties
        this.$schema = schema.$schema;
        this.$id = schema.$id;
        this.typeName = schema.typeName;
        this.description = schema.description;
        this.sourceUrl = schema.sourceUrl;
        this.documentationUrl = schema.documentationUrl;
        this.title = schema.title;
        this.type = schema.type;
        this.additionalProperties = schema.additionalProperties;

        // Resource semantics
        this.primaryIdentifier = schema.primaryIdentifier;
        this.additionalIdentifiers = schema.additionalIdentifiers;
        this.readOnlyProperties = schema.readOnlyProperties;
        this.writeOnlyProperties = schema.writeOnlyProperties;
        this.createOnlyProperties = schema.createOnlyProperties;
        this.deprecatedProperties = schema.deprecatedProperties;
        this.conditionalCreateOnlyProperties = schema.conditionalCreateOnlyProperties;
        this.nonPublicProperties = schema.nonPublicProperties;
        this.nonPublicDefinitions = schema.nonPublicDefinitions;
        this.required = schema.required;
        this.replacementStrategy = schema.replacementStrategy;
        this.isAws = this.typeName.startsWith('AWS::');
        this.isSam = this.typeName.startsWith('AWS::Serverless::');

        this.properties = this.parseProperties(schema.properties);

        if (schema.definitions) {
            this.definitions = this.parseProperties(schema.definitions);
        }

        this.taggable = schema.taggable ?? true;
        if (schema.tagging) {
            this.tagging = {
                taggable: schema.tagging.taggable ?? false,
                tagOnCreate: schema.tagging.tagOnCreate ?? false,
                tagUpdatable: schema.tagging.tagUpdatable ?? false,
                cloudFormationSystemTags: schema.tagging.cloudFormationSystemTags ?? false,
                tagProperty: schema.tagging.tagProperty ?? '/properties/Tags',
                permissions: schema.tagging.permissions,
            };
        }

        if (schema.handlers) {
            this.handlers = {
                create: schema.handlers.create ? this.parseHandler(schema.handlers.create) : undefined,
                read: schema.handlers.read ? this.parseHandler(schema.handlers.read) : undefined,
                update: schema.handlers.update ? this.parseHandler(schema.handlers.update) : undefined,
                delete: schema.handlers.delete ? this.parseHandler(schema.handlers.delete) : undefined,
                list: schema.handlers.list ? this.parseHandlerWithSchema(schema.handlers.list) : undefined,
            };
        }

        if (schema.resourceLink) {
            this.resourceLink = {
                templateUri: schema.resourceLink.templateUri,
                mappings: schema.resourceLink.mappings,
            };
        }

        this.propertyTransform = schema.propertyTransform;

        this.typeConfiguration = schema.typeConfiguration;

        this.allOf = schema.allOf;
        this.anyOf = schema.anyOf;
        this.oneOf = schema.oneOf;

        this.propertyKeys = new Set(Object.keys(this.properties));
        this.rootSchema = this.getRootSchema();
    }

    /**
     * Get a property by its JSON pointer
     * @param path - JSON pointer to the property (e.g., "/properties/BucketName")
     * @returns The property definition or undefined if not found
     */
    @Measure({ name: 'path' })
    public getByPath<T = any>(path: string): T | undefined {
        // Remove leading slash if present
        if (path.startsWith('/')) {
            path = path.slice(1);
        }

        const parts = path.split('/');
        let current: any = this as unknown as any;

        for (const part of parts) {
            if (!current || typeof current !== 'object') {
                return undefined;
            }

            current = current[part];
        }

        if (current !== undefined) {
            return current as T;
        }

        return undefined;
    }

    @Measure({ name: 'resolveRef' })
    public resolveRef(refValue: string): PropertyType | undefined {
        if (refValue.startsWith('#')) {
            refValue = refValue.slice(1);
        }

        return this.getByPath<PropertyType>(refValue);
    }

    public isReadOnly(propertyPath: string): boolean {
        return this.readOnlyProperties?.includes(propertyPath) ?? false;
    }

    public isWriteOnly(propertyPath: string): boolean {
        return this.writeOnlyProperties?.includes(propertyPath) ?? false;
    }

    public isCreateOnly(propertyPath: string): boolean {
        return this.createOnlyProperties?.includes(propertyPath) ?? false;
    }

    public isDeprecated(propertyPath: string): boolean {
        return this.deprecatedProperties?.includes(propertyPath) ?? false;
    }

    /**
     * Resolve $ref values in a schema with circular reference detection
     * @param schema - Schema that may contain $ref
     * @param refStack - Stack of $ref values being resolved to detect circular references
     * @returns Resolved schema with $ref values processed
     */
    private resolveSchemaRefs(schema: PropertyType, refStack: string[]): PropertyType {
        if (!schema.$ref) {
            return schema;
        }

        // Check for circular reference
        if (refStack.includes(schema.$ref)) {
            // Circular reference detected - return schema without $ref
            // eslint-disable-next-line @typescript-eslint/no-unused-vars
            const { $ref, ...schemaWithoutRef } = schema;
            return schemaWithoutRef;
        }

        // Add to stack (in-place modification)
        refStack.push(schema.$ref);

        try {
            // Resolve the $ref
            const referencedSchema = this.resolveRef(schema.$ref);
            if (!referencedSchema) {
                // eslint-disable-next-line @typescript-eslint/no-unused-vars
                const { $ref, ...schemaWithoutRef } = schema;
                return schemaWithoutRef;
            }

            // Recursively resolve any $ref in the referenced schema
            const resolvedReferencedSchema = this.resolveSchemaRefs(referencedSchema, refStack);

            // Merge properties (same merging logic as original)
            // eslint-disable-next-line @typescript-eslint/no-unused-vars
            const { $ref, ...localProperties } = schema;
            const filteredLocalProperties = Object.fromEntries(
                Object.entries(localProperties).filter(([, value]) => value !== undefined),
            );

            const result = { ...filteredLocalProperties };
            // Apply referenced schema properties
            for (const [key, value] of Object.entries(resolvedReferencedSchema)) {
                if (value !== undefined) {
                    result[key] = value;
                }
            }

            return result;
        } finally {
            // Always remove from stack when done
            refStack.pop();
        }
    }

    /**
     * Resolve $ref values in properties and items of a schema
     * For properties: Only resolve to get type information
     * For items: Fully resolve to get complete structure including property names and requirements
     * @param schema - Schema to resolve properties and items for
     * @returns Schema with resolved properties and items
     */
    private resolvePropertiesAndItems(schema: PropertyType): PropertyType {
        const result = { ...schema };

        // Resolve $ref values in properties (only need type info)
        if (result.properties) {
            const resolvedProperties: Record<string, PropertyType> = {};
            for (const [key, prop] of Object.entries(result.properties)) {
                if (prop.$ref) {
                    resolvedProperties[key] = this.resolveSchemaRefs(prop, []);
                } else {
                    resolvedProperties[key] = prop;
                }
            }
            result.properties = resolvedProperties;
        }

        // Resolve $ref values in items (need full structure for arrays)
        if (result.items) {
            if (result.items.$ref) {
                const resolvedItems = this.resolveSchemaRefs(result.items, []);
                // For items, we also need to resolve nested properties to get complete structure
                result.items = this.resolvePropertiesAndItems(resolvedItems);
            } else {
                // Even if no $ref, still resolve nested properties in items
                result.items = this.resolvePropertiesAndItems(result.items);
            }
        }

        return result;
    }

    /**
     * Parse a JSON Pointer path into path segments
     * @param jsonPointerPath - Absolute JSON Pointer path (e.g., "/properties/BucketName")
     * @returns Array of path segments for schema traversal
     */
    private parseJsonPointerPath(jsonPointerPath: string): string[] {
        // Remove leading slash and split by '/'
        const path = jsonPointerPath.startsWith('/') ? jsonPointerPath.slice(1) : jsonPointerPath;
        const segments = path.split('/');

        // Remove 'properties' prefix if present
        if (segments.length > 0 && segments[0] === 'properties') {
            return segments.slice(1);
        }

        return segments;
    }

    /**
     * Resolve a JSON Pointer path with wildcard support to get property definitions
     *
     * This method navigates through the resource schema following the provided JSON Pointer path,
     * handling wildcards (*) as array element placeholders, resolving $ref values, and
     * processing JSON Schema composition keywords (oneOf/anyOf/allOf).
     *
     * @param jsonPointerPath - Absolute JSON Pointer path (e.g., "/properties/BucketName")
     * @param options - Configuration options for schema resolution
     * @param options.excludeReadOnly - Whether to filter out read-only properties from results
     * @returns Array of all possible schema definitions that match the path
     */
    @Measure({ name: 'resolveJsonPointer' })
    public resolveJsonPointerPath(jsonPointerPath: string, options?: PathNavigationOptions): PropertyType[] {
        const resolvedOptions: PathNavigationOptions = {
            excludeReadOnly: options?.excludeReadOnly ?? false,
            requireFullyResolved: options?.requireFullyResolved ?? false,
        };

        try {
            if (!jsonPointerPath || jsonPointerPath === '') {
                return [];
            }

            // Check if the requested path is read-only and should be excluded
            if (resolvedOptions.excludeReadOnly && this.isPathReadOnly(jsonPointerPath)) {
                return [];
            }

            // Parse JSON Pointer path to segments
            const pathSegments = this.parseJsonPointerPath(jsonPointerPath);

            // Create root schema once for reuse
            const rootSchema = this.getRootSchema();

            // Handle root path (empty segments or single empty string)
            if (pathSegments.length === 0 || (pathSegments.length === 1 && pathSegments[0] === '')) {
                if (this.hasCompositionKeywords(rootSchema)) {
                    const context: TraversalContext = {
                        currentSchema: rootSchema,
                        refStack: [],
                        options: resolvedOptions,
                        remainingSegments: [],
                        results: [],
                        currentPath: [],
                    };
                    this.expandCompositionKeywords(context, rootSchema);
                    return this.applyReadOnlyFiltering(context.results, jsonPointerPath, resolvedOptions);
                } else {
                    // No composition keywords at root, return the root schema
                    return this.applyReadOnlyFiltering([rootSchema], jsonPointerPath, resolvedOptions);
                }
            }

            const context: TraversalContext = {
                currentSchema: rootSchema,
                refStack: [],
                options: resolvedOptions,
                remainingSegments: pathSegments,
                results: [],
                currentPath: [],
            };

            this.traverseSchemaPath(context);

            // Apply read-only filtering as post-processing if requested
            if (resolvedOptions.excludeReadOnly) {
                return context.results.map((schema) =>
                    this.removeReadOnlyPropertiesFromSchema(schema, jsonPointerPath),
                );
            }

            return context.results;
        } catch {
            return [];
        }
    }

    /**
     * Apply read-only filtering to schema results if requested
     * @param results - Array of schemas to filter
     * @param jsonPointerPath - The JSON pointer path for context
     * @param options - Path navigation options
     * @returns Filtered array of schemas
     */
    private applyReadOnlyFiltering(
        results: PropertyType[],
        jsonPointerPath: string,
        options: PathNavigationOptions,
    ): PropertyType[] {
        if (!options.excludeReadOnly) {
            return results;
        }

        return results.map((schema) => this.removeReadOnlyPropertiesFromSchema(schema, jsonPointerPath));
    }

    /**
     * Traverse schema following the path segments
     * @param context - Current traversal context
     */
    private traverseSchemaPath(context: TraversalContext): void {
        // Resolve $ref in current schema before processing
        const resolvedSchema = this.resolveSchemaRefs(context.currentSchema, context.refStack);

        if (context.remainingSegments.length === 0) {
            // Reached the end of the path
            // Handle composition keywords at the end of the path
            if (this.hasCompositionKeywords(resolvedSchema)) {
                this.expandCompositionKeywords(context, resolvedSchema);
            } else {
                // Resolve $ref values in properties and items before adding to results
                const fullyResolvedSchema = this.resolvePropertiesAndItems(resolvedSchema);
                context.results.push(fullyResolvedSchema);
            }
            return;
        }

        // Handle composition keywords before property traversal
        // But only if we don't have direct properties available (e.g., for unmerged oneOf/anyOf)
        if (this.hasCompositionKeywords(resolvedSchema) && !resolvedSchema.properties) {
            // For mid-path traversal, we need to continue through composition alternatives
            this.expandCompositionKeywords(context, resolvedSchema);
            return;
        }

        const [currentSegment] = context.remainingSegments;
        const newContext: TraversalContext = {
            ...context,
            currentSchema: resolvedSchema,
        };

        if (currentSegment === '*') {
            // Wildcard segment
            this.traverseWildcard(newContext);
        } else {
            // Property segment
            this.traverseProperty(newContext, currentSegment);
        }
    }

    /**
     * Traverse a property by name
     * @param context - Current traversal context
     * @param propertyName - Name of the property to traverse
     */
    private traverseProperty(context: TraversalContext, propertyName: string): void {
        const { currentSchema } = context;
        let foundProperty = false;

        // First, try direct property access
        const hasObjectType = Array.isArray(currentSchema.type)
            ? currentSchema.type.includes('object')
            : currentSchema.type === 'object' || (!currentSchema.type && currentSchema.properties);
        if (hasObjectType && currentSchema.properties) {
            const property = currentSchema.properties[propertyName];
            if (property) {
                const newContext: TraversalContext = {
                    ...context,
                    currentSchema: property,
                    currentPath: [...context.currentPath, propertyName],
                    remainingSegments: context.remainingSegments.slice(1),
                };
                this.traverseSchemaPath(newContext);
                foundProperty = true;
            }
        }

        // If not found directly, check pattern properties
        if (!foundProperty && currentSchema.patternProperties) {
            for (const [pattern, patternSchema] of Object.entries(currentSchema.patternProperties)) {
                // eslint-disable-next-line security/detect-non-literal-regexp
                if (new RegExp(pattern).test(propertyName)) {
                    const newContext: TraversalContext = {
                        ...context,
                        currentSchema: patternSchema,
                        currentPath: [...context.currentPath, propertyName],
                        remainingSegments: context.remainingSegments.slice(1),
                    };
                    this.traverseSchemaPath(newContext);
                    foundProperty = true;
                }
            }
        }

        // If still not found and we have composition keywords, search through them
        if (!foundProperty && this.hasCompositionKeywords(currentSchema)) {
            this.traverseCompositionKeywords(context, currentSchema, propertyName);
        }

        // If property not found and requireFullyResolved is true, don't return partial results
        if (!foundProperty && context.options.requireFullyResolved) {
            return;
        }
    }

    /**
     * Traverse wildcard segments (array element placeholders)
     * @param context - Current traversal context
     */
    private traverseWildcard(context: TraversalContext): void {
        const { currentSchema } = context;

        // Handle array items
        const hasArrayType = Array.isArray(currentSchema.type)
            ? currentSchema.type.includes('array')
            : currentSchema.type === 'array';
        if (hasArrayType && currentSchema.items) {
            // For arrays, wildcard represents any element
            const newContext: TraversalContext = {
                ...context,
                currentSchema: currentSchema.items,
                remainingSegments: context.remainingSegments.slice(1),
                currentPath: [...context.currentPath, '*'],
            };
            this.traverseSchemaPath(newContext);
        }
    }

    /**
     * Check if a schema has composition keywords (oneOf, anyOf, allOf)
     * @param schema - Schema to check
     * @returns True if schema has composition keywords
     */
    private hasCompositionKeywords(schema: PropertyType): boolean {
        return !!(schema.oneOf ?? schema.anyOf ?? schema.allOf);
    }

    /**
     * Traverse composition keywords looking for a specific property
     * @param context - Current traversal context
     * @param schema - Schema with composition keywords
     * @param propertyName - Name of the property to find
     */
    private traverseCompositionKeywords(context: TraversalContext, schema: PropertyType, propertyName: string): void {
        if (schema.oneOf) {
            this.traverseSchemaAlternatives(context, schema.oneOf, propertyName);
        }

        if (schema.anyOf) {
            this.traverseSchemaAlternatives(context, schema.anyOf, propertyName);
        }

        if (schema.allOf) {
            this.traverseSchemaAlternatives(context, schema.allOf, propertyName);
        }
    }

    /**
     * Traverse composition keywords (oneOf, anyOf, allOf)
     * @param context - Current traversal context
     * @param schema - Schema with composition keywords
     */
    private expandCompositionKeywords(context: TraversalContext, schema: PropertyType): void {
        // Handle oneOf - return all possible schema alternatives
        if (schema.oneOf) {
            this.expandSchemaAlternatives(context, schema.oneOf, schema.properties ? schema : undefined);
        }

        // Handle anyOf - return all applicable schema options
        if (schema.anyOf) {
            this.expandSchemaAlternatives(context, schema.anyOf, schema.properties ? schema : undefined);
        }

        // Handle allOf - merge schemas into combined results
        if (schema.allOf) {
            this.expandAllOf(context, schema.allOf);
        }
    }

    /**
     * Handle oneOf/anyOf keywords when looking for a specific property
     * @param context - Current traversal context
     * @param schemas - Array of schema alternatives
     * @param propertyName - Name of the property to find
     */
    private traverseSchemaAlternatives(context: TraversalContext, schemas: PropertyType[], propertyName: string): void {
        for (const schema of schemas) {
            const resolvedSchema = this.resolveSchemaRefs(schema, [...context.refStack]);

            // Check if this schema has the property we're looking for
            const hasObjectType = Array.isArray(resolvedSchema.type)
                ? resolvedSchema.type.includes('object')
                : resolvedSchema.type === 'object';

            if (hasObjectType && resolvedSchema.properties?.[propertyName]) {
                const property = resolvedSchema.properties[propertyName];
                const newContext: TraversalContext = {
                    ...context,
                    currentSchema: property,
                    currentPath: [...context.currentPath, propertyName],
                    remainingSegments: context.remainingSegments.slice(1), // Remove the current property name
                };
                this.traverseSchemaPath(newContext);
            } else if (this.hasCompositionKeywords(resolvedSchema)) {
                // Recursively search in nested composition keywords
                this.traverseCompositionKeywords(context, resolvedSchema, propertyName);
            }
        }
    }

    /**
     * Merge base schema properties with a composition variant
     * @param baseSchema - The base schema containing properties
     * @param variant - The composition variant (usually contains required constraints)
     * @returns Merged schema with base properties and variant constraints
     */
    private mergeSchemaWithVariant(baseSchema: PropertyType, variant: PropertyType): PropertyType {
        // Always merge base schema properties with variant constraints
        const merged: PropertyType = {
            ...baseSchema, // Start with base schema (includes type, properties, etc.)
            ...variant, // Apply variant constraints (required, etc.)
        };

        // Keep base properties if they exist
        if (baseSchema.properties) {
            merged.properties = { ...baseSchema.properties };
        }

        // Keep base type if it exists
        if (baseSchema.type) {
            merged.type = baseSchema.type;
        }

        // Merge required arrays (variant requirements are added to base requirements)
        if (baseSchema.required || variant.required) {
            const baseRequired = baseSchema.required ?? [];
            const variantRequired = variant.required ?? [];
            merged.required = [...new Set([...baseRequired, ...variantRequired])];
        }

        // Remove composition keywords to avoid infinite recursion
        delete merged.oneOf;
        delete merged.anyOf;
        delete merged.allOf;

        // Resolve $ref values in the merged properties
        return this.resolvePropertiesAndItems(merged);
    }

    /**
     * Handle oneOf/anyOf keywords - return all schema alternatives
     * @param context - Current traversal context
     * @param schemas - Array of schema alternatives
     * @param baseSchema
     */
    private expandSchemaAlternatives(
        context: TraversalContext,
        schemas: PropertyType[],
        baseSchema?: PropertyType,
    ): void {
        for (const schema of schemas) {
            if (baseSchema?.properties) {
                // Base schema has properties - merge them with the variant constraints
                const mergedSchema = this.mergeSchemaWithVariant(baseSchema, schema);
                const newContext: TraversalContext = {
                    ...context,
                    currentSchema: mergedSchema,
                };
                this.traverseSchemaPath(newContext);
            } else {
                // No base properties or base schema - traverse the variant directly
                const newContext: TraversalContext = {
                    ...context,
                    currentSchema: schema,
                };
                this.traverseSchemaPath(newContext);
            }
        }
    }

    /**
     * Handle allOf keyword - apply constraint composition
     * In CloudFormation schemas, allOf is used for constraint composition (required fields + choices),
     * not property merging, since additionalProperties is always false.
     * @param context - Current traversal context
     * @param allOfSchemas - Array of constraint schemas
     */
    private expandAllOf(context: TraversalContext, allOfSchemas: PropertyType[]): void {
        // Resolve schemas once and store results to avoid redundant resolution
        const resolvedSchemas = allOfSchemas.map((schema) => this.resolveSchemaRefs(schema, []));

        // Check if any resolved schema has composition keywords that need expansion
        const hasCompositionKeywords = resolvedSchemas.some((schema) => this.hasCompositionKeywords(schema));

        if (hasCompositionKeywords) {
            // Complex case: expand composition keywords within allOf
            this.handleAllOfWithComposition(context, resolvedSchemas);
        } else {
            // Simple case: merge constraints and properties for backward compatibility
            const mergedSchema = this.mergeAllOfConstraints(context.currentSchema, resolvedSchemas);
            if (context.remainingSegments.length === 0) {
                // At end of path, add the merged result directly
                context.results.push(mergedSchema);
            } else {
                // Continue traversal with remaining path
                const newContext: TraversalContext = {
                    ...context,
                    currentSchema: mergedSchema,
                };
                this.traverseSchemaPath(newContext);
            }
        }
    }

    /**
     * Handle allOf when some schemas contain composition keywords
     * @param context - Current traversal context
     * @param allOfSchemas - All schemas in the allOf array
     */
    private handleAllOfWithComposition(context: TraversalContext, allOfSchemas: PropertyType[]): void {
        // Separate schemas with and without composition keywords
        const schemasWithComposition: PropertyType[] = [];
        const schemasWithoutComposition: PropertyType[] = [];

        for (const schema of allOfSchemas) {
            const resolvedSchema = this.resolveSchemaRefs(schema, []);
            if (this.hasCompositionKeywords(resolvedSchema)) {
                schemasWithComposition.push(resolvedSchema);
            } else {
                schemasWithoutComposition.push(resolvedSchema);
            }
        }

        // Create base schema from non-composition schemas
        const baseSchema = this.mergeAllOfConstraints(context.currentSchema, schemasWithoutComposition);

        // For each schema with composition keywords, expand and merge
        for (const compositionSchema of schemasWithComposition) {
            const tempContext: TraversalContext = {
                ...context,
                currentSchema: compositionSchema,
                results: [],
            };

            // Expand the composition keywords
            this.expandCompositionKeywords(tempContext, compositionSchema);

            // For each expanded result, merge with base and continue traversal
            for (const expandedSchema of tempContext.results) {
                const mergedSchema = this.mergeAllOfConstraints(baseSchema, [expandedSchema]);
                if (context.remainingSegments.length === 0) {
                    // At end of path, add the merged result directly
                    context.results.push(mergedSchema);
                } else {
                    // Continue traversal with remaining path
                    const newContext: TraversalContext = {
                        ...context,
                        currentSchema: mergedSchema,
                    };
                    this.traverseSchemaPath(newContext);
                }
            }
        }
    }

    /**
     * Merge allOf constraints (simplified for CloudFormation use cases)
     * @param baseSchema - Base schema to merge into
     * @param allOfSchemas - Array of schemas to merge
     * @returns Merged schema
     */
    private mergeAllOfConstraints(baseSchema: PropertyType, allOfSchemas: PropertyType[]): PropertyType {
        const merged: PropertyType = { ...baseSchema };

        for (const schema of allOfSchemas) {
            const resolvedSchema = this.resolveSchemaRefs(schema, []);

            // Merge properties (for backward compatibility with tests)
            if (resolvedSchema.properties) {
                merged.properties = { ...merged.properties, ...resolvedSchema.properties };
            }

            // Merge required arrays
            if (resolvedSchema.required) {
                merged.required = [...(merged.required ?? []), ...resolvedSchema.required];
            }

            // Merge other constraint properties
            for (const [key, value] of Object.entries(resolvedSchema)) {
                if (key !== 'properties' && key !== 'required' && value !== undefined) {
                    (merged as any)[key] = value;
                }
            }
        }

        // Remove duplicate required properties
        if (merged.required) {
            merged.required = [...new Set(merged.required)];
        }

        return merged;
    }

    /**
     * Check if a given path matches any read-only property patterns
     * @param jsonPointerPath - The JSON Pointer path to check
     * @returns True if the path matches any read-only property pattern
     */
    private isPathReadOnly(jsonPointerPath: string): boolean {
        if (!this.readOnlyProperties) {
            return false;
        }

        return this.readOnlyProperties.includes(jsonPointerPath);
    }

    private parseProperties(properties: any): Record<string, PropertyType> {
        const result: Record<string, PropertyType> = {};

        for (const [key, value] of Object.entries(properties)) {
            result[key] = this.parsePropertyDefinition(value as any);
        }

        return result;
    }

    private parsePropertyDefinition(property: any): PropertyType {
        const propDef: PropertyType = {
            type: property.type,
            description: property.description,
        };

        // Handle $ref
        if (property.$ref) {
            propDef.$ref = property.$ref;
        }

        // Handle various property attributes
        if (property.pattern) propDef.pattern = property.pattern;
        if (property.enum) propDef.enum = property.enum;
        if (property.const) propDef.const = property.const;
        if (property.default) propDef.default = property.default;
        if (property.format) propDef.format = property.format;
        if (property.minimum !== undefined) propDef.minimum = property.minimum;
        if (property.maximum !== undefined) propDef.maximum = property.maximum;
        if (property.exclusiveMinimum !== undefined) propDef.exclusiveMinimum = property.exclusiveMinimum;
        if (property.exclusiveMaximum !== undefined) propDef.exclusiveMaximum = property.exclusiveMaximum;
        if (property.minLength !== undefined) propDef.minLength = property.minLength;
        if (property.maxLength !== undefined) propDef.maxLength = property.maxLength;
        if (property.minItems !== undefined) propDef.minItems = property.minItems;
        if (property.maxItems !== undefined) propDef.maxItems = property.maxItems;
        if (property.uniqueItems !== undefined) propDef.uniqueItems = property.uniqueItems;
        if (property.insertionOrder !== undefined) propDef.insertionOrder = property.insertionOrder;
        if (property.arrayType !== undefined) propDef.arrayType = property.arrayType;

        // Handle items for array types
        const hasArrayType = Array.isArray(property.type) ? property.type.includes('array') : property.type === 'array';
        if (hasArrayType && property.items) {
            // CloudFormation schemas never use tuple-style arrays, items is always a single schema
            propDef.items = this.parsePropertyDefinition(property.items);
        }

        // Handle properties for object types (or any type that has properties)
        if (property.properties) {
            propDef.properties = this.parseProperties(property.properties);
        }

        // Handle object-specific fields
        if (property.required) {
            propDef.required = property.required;
        }

        if (property.additionalProperties !== undefined) {
            propDef.additionalProperties = property.additionalProperties;
        }

        // Handle pattern properties
        if (property.patternProperties) {
            propDef.patternProperties = {};
            for (const [pattern, patternProp] of Object.entries(property.patternProperties)) {
                propDef.patternProperties[pattern] = this.parsePropertyDefinition(patternProp as any);
            }
        }

        // Handle composition keywords
        if (property.oneOf) {
            propDef.oneOf = property.oneOf.map((schema: any) => this.parsePropertyDefinition(schema));
        }
        if (property.anyOf) {
            propDef.anyOf = property.anyOf.map((schema: any) => this.parsePropertyDefinition(schema));
        }
        if (property.allOf) {
            propDef.allOf = property.allOf.map((schema: any) => this.parsePropertyDefinition(schema));
        }

        return propDef;
    }

    private parseHandler(handler: any): HandlerType {
        return {
            permissions: handler.permissions,
            timeoutInMinutes: handler.timeoutInMinutes,
        };
    }

    private parseHandlerWithSchema(handler: any): HandlerWithSchemaType {
        const result: HandlerWithSchemaType = this.parseHandler(handler);

        if (handler.handlerSchema) {
            result.handlerSchema = {
                properties: handler.handlerSchema.properties
                    ? this.parseProperties(handler.handlerSchema.properties)
                    : {},
                required: handler.handlerSchema.required,
                allOf: handler.handlerSchema.allOf,
                anyOf: handler.handlerSchema.anyOf,
                oneOf: handler.handlerSchema.oneOf,
            };
        }

        return result;
    }

    public toJSON(): object {
        return {
            $schema: this.$schema,
            $id: this.$id,
            typeName: this.typeName,
            description: this.description,
            sourceUrl: this.sourceUrl,
            documentationUrl: this.documentationUrl,
            title: this.title,
            type: this.type,
            additionalProperties: this.additionalProperties,
            primaryIdentifier: this.primaryIdentifier,
            additionalIdentifiers: this.additionalIdentifiers,
            readOnlyProperties: this.readOnlyProperties,
            writeOnlyProperties: this.writeOnlyProperties,
            createOnlyProperties: this.createOnlyProperties,
            deprecatedProperties: this.deprecatedProperties,
            conditionalCreateOnlyProperties: this.conditionalCreateOnlyProperties,
            nonPublicProperties: this.nonPublicProperties,
            nonPublicDefinitions: this.nonPublicDefinitions,
            required: this.required,
            replacementStrategy: this.replacementStrategy,
            properties: this.properties,
            definitions: this.definitions,
            taggable: this.taggable,
            tagging: this.tagging,
            handlers: this.handlers,
            resourceLink: this.resourceLink,
            propertyTransform: this.propertyTransform,
            typeConfiguration: this.typeConfiguration,
            allOf: this.allOf,
            anyOf: this.anyOf,
            oneOf: this.oneOf,
        };
    }

    /**
     * Remove read-only properties from a single schema based on the target path context
     * @param schema - Schema to filter
     * @param targetPath - The complete JSON pointer path being queried
     * @returns Schema with read-only properties removed
     */
    private removeReadOnlyPropertiesFromSchema(schema: PropertyType, targetPath: string): PropertyType {
        // Early return if no read-only properties are defined
        if (!this.readOnlyProperties || this.readOnlyProperties.length === 0) {
            return schema;
        }

        // Create a copy of the schema to avoid mutating the original
        const filtered: PropertyType = { ...schema };

        // Handle object properties
        if (schema.properties) {
            const filteredProperties: Record<string, PropertyType> = {};

            // Filter out read-only properties
            for (const [propName, propSchema] of Object.entries(schema.properties)) {
                const propPath = targetPath + '/' + propName;

                // Check if this property path matches any read-only property patterns
                if (this.isPathReadOnly(propPath)) {
                    continue; // Skip read-only properties
                }

                // Resolve $ref if present before processing
                let resolvedPropSchema = propSchema;
                if (propSchema.$ref) {
                    resolvedPropSchema = this.resolveSchemaRefs(propSchema, []);
                }

                // Recursively filter nested properties if this property has nested structure
                if (resolvedPropSchema.properties || resolvedPropSchema.items) {
                    filteredProperties[propName] = this.removeReadOnlyPropertiesFromSchema(
                        resolvedPropSchema,
                        propPath,
                    );
                } else {
                    filteredProperties[propName] = resolvedPropSchema;
                }
            }

            filtered.properties = filteredProperties;
        }

        // Handle array items
        if (schema.items) {
            const itemPath = targetPath + '/*';
            // Handle single item schema
            filtered.items = this.removeReadOnlyPropertiesFromSchema(schema.items, itemPath);
        }

        return filtered;
    }

    private getRootSchema(): PropertyType {
        return {
            type: 'object',
            properties: this.properties,
            ...(this.required && { required: this.required }),
            ...(this.allOf && { allOf: this.allOf as PropertyType[] }),
            ...(this.anyOf && { anyOf: this.anyOf as PropertyType[] }),
            ...(this.oneOf && { oneOf: this.oneOf as PropertyType[] }),
        };
    }

    public getAttributes(): Array<{ name: string; description: string }> {
        this._attributes ??= this.computeAttributes();
        return this._attributes;
    }

    private computeAttributes(): Array<{ name: string; description: string }> {
        if (!this.readOnlyProperties) return [];

        return this.readOnlyProperties
            .filter((prop) => !prop.includes('/*/'))
            .map((prop) => {
                const match = prop.match(/^\/properties\/(.+)$/);
                if (!match) return;

                const name = match[1].replaceAll('/', '.');
                const description = this.getAttributeDescription(prop);
                return { name, description };
            })
            .filter((attr): attr is { name: string; description: string } => attr !== undefined);
    }

    private getAttributeDescription(propertyPath: string): string {
        try {
            const resolvedSchemas = this.resolveJsonPointerPath(propertyPath);
            if (resolvedSchemas.length > 0 && resolvedSchemas[0].description) {
                return resolvedSchemas[0].description;
            }
        } catch {
            // Fall back to default description
        }

        const match = propertyPath.match(/^\/properties\/(.+)$/);
        const attributeName = match ? match[1].replaceAll('/', '.') : propertyPath;
        return `${attributeName} attribute of ${this.typeName}`;
    }
}

export type PropertyType = {
    type?: string | string[];
    description?: string;
    $ref?: string;
    pattern?: string;
    enum?: any[];
    examples?: any[];
    const?: any;
    default?: any;
    format?: string;
    minimum?: number;
    maximum?: number;
    exclusiveMinimum?: number | boolean;
    exclusiveMaximum?: number | boolean;
    minLength?: number;
    maxLength?: number;
    maxProperties?: number;
    minItems?: number;
    minProperties?: number;
    maxItems?: number;
    multipleOf?: number;
    uniqueItems?: boolean;
    insertionOrder?: boolean;
    arrayType?: 'Standard' | 'AttributeList';
    // items can only be an object
    // https://github.com/aws-cloudformation/cloudformation-resource-schema/blob/d46e05a64c1343d4811079e3cd6c20468dfc83b6/src/main/resources/schema/base.definition.schema.v1.json#L115-L119
    items?: PropertyType;
    properties?: Record<string, PropertyType>;
    required?: string[];
    additionalProperties?: boolean | PropertyType;
    patternProperties?: Record<string, PropertyType>;
    dependencies?: Record<string, string[] | PropertyType>;
    allOf?: PropertyType[];
    anyOf?: PropertyType[];
    oneOf?: PropertyType[];
};

type HandlerType = {
    permissions: string[];
    timeoutInMinutes?: number;
};

type HandlerWithSchemaType = HandlerType & {
    handlerSchema?: {
        properties: Record<string, PropertyType>;
        required?: string[];
        allOf?: any[];
        anyOf?: any[];
        oneOf?: any[];
    };
};

type HandlersType = {
    create?: HandlerType;
    read?: HandlerType;
    update?: HandlerType;
    delete?: HandlerType;
    list?: HandlerWithSchemaType;
};

type ResourceLinkType = {
    templateUri: string;
    mappings: Record<string, string>;
};

type TaggingConfigurationType = {
    taggable: boolean;
    tagOnCreate?: boolean;
    tagUpdatable?: boolean;
    cloudFormationSystemTags?: boolean;
    tagProperty?: string;
    permissions?: string[];
};
