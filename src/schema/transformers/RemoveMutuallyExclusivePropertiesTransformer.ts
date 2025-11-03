import { IntrinsicFunction } from '../../context/ContextType';
import { LoggerFactory } from '../../telemetry/LoggerFactory';
import { PropertyType, ResourceSchema } from '../ResourceSchema';
import { dependentExcludedMap } from './MutuallyExclusivePropertiesForValidation';
import type { ResourceTemplateTransformer } from './ResourceTemplateTransformer';

const logger = LoggerFactory.getLogger('RemoveMutuallyExclusivePropertiesTransformer');

/**
 * Transformer that removes mutually exclusive properties from CloudFormation resource properties.
 *
 * This transformer analyzes JSON schemas with oneOf constraints to identify mutually exclusive
 * property groups and removes conflicting properties, keeping the first encountered property
 * in each group.
 */
export class RemoveMutuallyExclusivePropertiesTransformer implements ResourceTemplateTransformer {
    private readonly PATH_SEPARATOR = '/';
    private readonly PATH_START = '#';
    private readonly UNINDEXED_PATH = '0';
    private readonly REFERENCE_MAX_DEPTH = 5;
    private readonly GETATT_ID = IntrinsicFunction.GetAtt as string;
    private readonly REF_ID = 'Ref';
    private readonly dependentExcludedMap = dependentExcludedMap;

    /**
     * Transform resource properties by removing mutually exclusive properties
     */
    public transform(resourceProperties: Record<string, unknown>, schema: ResourceSchema): void {
        this.traverseResourcePropertiesAndRemoveMutuallyExclusiveProperties(
            resourceProperties,
            schema.rootSchema,
            this.PATH_START,
            schema,
            0,
            new Set(),
        );
    }

    private traverseResourcePropertiesAndRemoveMutuallyExclusiveProperties(
        resourceProperty: Record<string, unknown>,
        rawSchema: PropertyType,
        path: string,
        resourceSchema?: ResourceSchema,
        depth: number = 0,
        visited: Set<object> = new Set(),
    ): void {
        // Prevent excessive recursion
        if (depth > this.REFERENCE_MAX_DEPTH) {
            logger.warn(`Maximum recursion depth reached at ${path}`);
            return;
        }

        // Prevent circular references
        if (visited.has(resourceProperty)) {
            logger.warn(`Circular reference detected at ${path}`);
            return;
        }
        visited.add(resourceProperty);
        // Schema refs are already resolved by ResourceSchema
        const resolvedSchema = rawSchema;

        // If this object has mutually exclusive properties, remove keys in current object
        const meResources = this.getMEResources(resolvedSchema, resourceSchema);
        if (this.isCombinedSchema(resolvedSchema) || meResources) {
            const forbiddenProperties = new Set<string>();

            if (meResources && meResources.size > 1) {
                logger.info(`Found ${meResources.size} mutually-exclusive properties `);
                const keysToRemove = new Set<string>();

                for (const key of Object.keys(resourceProperty)) {
                    if (forbiddenProperties.has(key)) {
                        keysToRemove.add(key);
                    } else if (meResources.has(key)) {
                        // Current key will be used, add its ME properties to forbidden set
                        const conflictingProps = meResources.get(key);
                        if (conflictingProps) {
                            for (const prop of conflictingProps) {
                                forbiddenProperties.add(prop);
                            }
                        }
                    }
                }

                for (const key of keysToRemove) {
                    delete resourceProperty[key];
                }
            }
        }

        // Look into each key
        const staticKeyList = Object.keys(resourceProperty);
        for (const key of staticKeyList) {
            const newPath = `${path}${this.PATH_SEPARATOR}${key}`;
            const subschema = this.getSubSchema(resolvedSchema, key, newPath);

            if (subschema && resourceProperty[key] !== undefined) {
                const value = resourceProperty[key];

                if (this.isObject(value)) {
                    this.traverseResourcePropertiesAndRemoveMutuallyExclusiveProperties(
                        value,
                        subschema,
                        newPath,
                        undefined,
                        depth + 1,
                        visited,
                    );
                } else if (Array.isArray(value)) {
                    let arraySubschema = subschema;
                    if (this.isCombinedSchema(subschema)) {
                        arraySubschema = this.extractArraySchemaOutOfCombinedSchema(subschema);
                    }

                    for (const [i, item] of value.entries()) {
                        const itemPath = `${newPath}${this.PATH_SEPARATOR}${i}`;

                        if (this.isObject(item)) {
                            const arraySchemaItem = this.getSubSchema(arraySubschema, this.UNINDEXED_PATH, itemPath);
                            if (arraySchemaItem) {
                                this.traverseResourcePropertiesAndRemoveMutuallyExclusiveProperties(
                                    item,
                                    arraySchemaItem,
                                    itemPath,
                                    undefined,
                                    depth + 1,
                                    visited,
                                );
                            }
                        }
                    }
                }
            }
        }
    }

    private getMEResources(
        schema: PropertyType,
        resourceSchema?: ResourceSchema,
    ): Map<string, Set<string>> | undefined {
        const listOfOneOfProperties: Set<string>[] = [];

        // Check if this schema directly has oneOf
        if (schema.oneOf) {
            for (const oneOfSchema of schema.oneOf) {
                const resources = new Set<string>();
                if (oneOfSchema.required) {
                    for (const prop of oneOfSchema.required) {
                        resources.add(prop);
                    }
                }
                if (oneOfSchema.properties) {
                    for (const prop of Object.keys(oneOfSchema.properties)) {
                        resources.add(prop);
                    }
                }
                if (resources.size > 0) {
                    listOfOneOfProperties.push(resources);
                }
            }
        }

        // Add hardcoded mutually exclusive properties from validation map
        if (resourceSchema) {
            const dependentExcluded = this.dependentExcludedMap.get(resourceSchema.typeName);
            if (dependentExcluded) {
                for (const [property, excludedProperties] of Object.entries(dependentExcluded)) {
                    if (schema.properties?.[property]) {
                        const propertySet = new Set([property]);
                        const excludedSet = new Set(excludedProperties.filter((prop) => schema.properties?.[prop]));
                        if (excludedSet.size > 0) {
                            listOfOneOfProperties.push(propertySet, excludedSet);
                        }
                    }
                }
            }
        }

        if (listOfOneOfProperties.length === 0) {
            return;
        }

        return this.buildMEMap(listOfOneOfProperties);
    }

    private buildMEMap(listOfOneOfs: Set<string>[]): Map<string, Set<string>> {
        const coExistMap = new Map<string, Set<string>>();
        const notCoExistMap = new Map<string, Set<string>>();

        // Update coExistMap
        for (const properties of listOfOneOfs) {
            for (const property of properties) {
                if (!coExistMap.has(property)) {
                    coExistMap.set(property, new Set());
                }
                const coExistSet = coExistMap.get(property);
                if (!coExistSet) continue;
                for (const prop of properties) {
                    coExistSet.add(prop);
                }
            }
        }

        // Update not coexist map
        for (let i = 0; i < listOfOneOfs.length; i++) {
            for (const property of listOfOneOfs[i]) {
                if (notCoExistMap.has(property)) {
                    continue;
                }

                const notCoExistSet = new Set<string>();
                for (const [j, listOfOneOf] of listOfOneOfs.entries()) {
                    if (i !== j) {
                        for (const otherProperty of listOfOneOf) {
                            const coExistSet = coExistMap.get(property);
                            if (!coExistSet?.has(otherProperty)) {
                                notCoExistSet.add(otherProperty);
                            }
                        }
                    }
                }
                notCoExistMap.set(property, notCoExistSet);
            }
        }

        return notCoExistMap;
    }

    private extractArraySchemaOutOfCombinedSchema(schema: PropertyType): PropertyType {
        const subschemas = this.getSubschemas(schema);
        const arraySchema = subschemas.find((s) => this.isArraySchema(s));
        return arraySchema ?? schema;
    }

    private getSubSchema(schema: PropertyType, id: string, path: string): PropertyType | undefined {
        try {
            // Simplified implementation - in a real scenario, this would use a schema helper
            if (schema.properties?.[id]) {
                return schema.properties[id];
            }
            if (schema.items && id === this.UNINDEXED_PATH) {
                return schema.items;
            }
            return;
        } catch {
            if (id !== this.REF_ID && id !== this.GETATT_ID) {
                logger.info(`Unable to find schema at path ${path}`);
            }
            return;
        }
    }

    // Helper methods for type checking
    private isObject(value: unknown): value is Record<string, unknown> {
        return typeof value === 'object' && value !== null && !Array.isArray(value);
    }

    private isCombinedSchema(schema: PropertyType): boolean {
        return !!(schema.oneOf ?? schema.anyOf ?? schema.allOf);
    }

    private isArraySchema(schema: PropertyType): boolean {
        return schema.type === 'array' || !!schema.items;
    }

    private getSubschemas(schema: PropertyType): PropertyType[] {
        return schema.oneOf ?? schema.anyOf ?? schema.allOf ?? [];
    }
}
