import { SAM_RESOURCE_DESCRIPTIONS, SAM_DOCUMENTATION_URLS } from '../artifacts/SamResourceDocs';

export interface SamSchema {
    definitions: Record<string, unknown>;
    properties: {
        Resources: {
            additionalProperties: {
                anyOf: Array<{ $ref: string }>;
            };
        };
    };
}

export type CloudFormationResourceSchema = {
    typeName: string;
    description: string;
    documentationUrl?: string;
    properties: Record<string, unknown>;
    definitions?: Record<string, unknown>;
    additionalProperties: boolean;
    required?: string[];
    readOnlyProperties?: string[];
    writeOnlyProperties?: string[];
    createOnlyProperties?: string[];
    primaryIdentifier?: string[];
    attributes?: Record<string, unknown>;
};

export const SamSchemaTransformer = {
    transformSamSchema(samSchema: SamSchema): Map<string, CloudFormationResourceSchema> {
        const resourceSchemas = new Map<string, CloudFormationResourceSchema>();

        // Extract resource references from Resources.additionalProperties.anyOf
        const resourceRefs = samSchema.properties.Resources.additionalProperties.anyOf
            .map((ref) => ref.$ref.replace('#/definitions/', ''))
            .filter((ref) => ref.includes('aws_serverless') && ref.endsWith('Resource'));

        for (const defKey of resourceRefs) {
            const definition = samSchema.definitions[defKey] as Record<string, unknown>;
            if (!definition) continue;

            // Extract resource type from the definition
            const typeEnum = (definition.properties as Record<string, unknown>)?.Type as Record<string, unknown>;
            if (!typeEnum?.enum || !Array.isArray(typeEnum.enum) || typeEnum.enum.length === 0) continue;

            const resourceType = typeEnum.enum[0] as string;

            // Get properties from the Properties field, following $ref if needed
            let propertiesSchema = (definition.properties as Record<string, unknown>)?.Properties as Record<
                string,
                unknown
            >;
            let propertiesRefKey: string | undefined;
            if (propertiesSchema?.$ref) {
                propertiesRefKey = (propertiesSchema.$ref as string).replace('#/definitions/', '');
                propertiesSchema = samSchema.definitions[propertiesRefKey] as Record<string, unknown>;
            }

            const cfnSchema: CloudFormationResourceSchema = {
                typeName: resourceType,
                description: SAM_RESOURCE_DESCRIPTIONS.get(resourceType) ?? `${resourceType} resource`,
                documentationUrl: SAM_DOCUMENTATION_URLS.get(resourceType) ?? '',
                properties: this.resolvePropertyTypes(
                    (propertiesSchema?.properties as Record<string, unknown>) ?? {},
                    samSchema.definitions,
                ),
                definitions: this.extractReferencedDefinitions(definition, samSchema.definitions, defKey),
                additionalProperties: false,
                required: (propertiesSchema?.required as string[]) ?? [],
                attributes: {}, // Empty to avoid GetAtt issues
                readOnlyProperties: [],
                writeOnlyProperties: [],
                createOnlyProperties: [],
                primaryIdentifier: [],
            };

            resourceSchemas.set(resourceType, cfnSchema);
        }

        return resourceSchemas;
    },

    extractReferencedDefinitions(
        schema: Record<string, unknown> | undefined,
        allDefinitions: Record<string, unknown>,
        rootDefinitionKey?: string,
    ): Record<string, unknown> {
        const referenced = new Set<string>();
        const result: Record<string, unknown> = {};

        // Include the root definition if provided
        if (rootDefinitionKey && allDefinitions[rootDefinitionKey]) {
            referenced.add(rootDefinitionKey);
            result[rootDefinitionKey] = allDefinitions[rootDefinitionKey];
        }

        const collectRefs = (obj: unknown): void => {
            if (typeof obj === 'object' && obj !== null) {
                if (Array.isArray(obj)) {
                    for (const item of obj) {
                        collectRefs(item);
                    }
                } else {
                    const record = obj as Record<string, unknown>;
                    if (record.$ref && typeof record.$ref === 'string') {
                        const refKey = record.$ref.replace('#/definitions/', '');
                        if (!referenced.has(refKey) && allDefinitions[refKey]) {
                            referenced.add(refKey);
                            result[refKey] = allDefinitions[refKey];
                            collectRefs(allDefinitions[refKey]);
                        }
                    }
                    for (const value of Object.values(record)) {
                        collectRefs(value);
                    }
                }
            }
        };

        collectRefs(schema);
        return result;
    },

    resolvePropertyTypes(
        properties: Record<string, unknown>,
        definitions: Record<string, unknown>,
    ): Record<string, unknown> {
        const resolved: Record<string, unknown> = {};

        for (const [key, value] of Object.entries(properties)) {
            resolved[key] = this.resolveProperty(value as Record<string, unknown>, definitions);
        }

        return resolved;
    },

    resolveProperty(property: Record<string, unknown>, definitions: Record<string, unknown>): Record<string, unknown> {
        // Convert markdownDescription to description for hover formatter
        if (property.markdownDescription && !property.description) {
            property = { ...property, description: property.markdownDescription };
        }

        // If property already has a type, keep it
        if (property.type) {
            return property;
        }

        // Handle allOf patterns
        if (property.allOf && Array.isArray(property.allOf)) {
            const allOfItem = property.allOf[0] as Record<string, unknown>;
            if (allOfItem?.$ref) {
                const resolved = this.resolveProperty(allOfItem, definitions);
                return { ...resolved, ...property, allOf: undefined };
            }
        }

        // Handle $ref
        if (property.$ref) {
            const refKey = (property.$ref as string).replace('#/definitions/', '');
            const refDef = definitions[refKey] as Record<string, unknown>;
            if (refDef) {
                const resolved = this.resolveProperty(refDef, definitions);
                return { ...resolved, ...property, $ref: undefined };
            }
        }

        return property;
    },
};
