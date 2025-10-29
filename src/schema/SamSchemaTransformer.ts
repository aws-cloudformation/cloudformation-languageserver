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

interface CloudFormationResourceSchema {
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
}

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
            if (propertiesSchema?.$ref) {
                const refKey = (propertiesSchema.$ref as string).replace('#/definitions/', '');
                propertiesSchema = samSchema.definitions[refKey] as Record<string, unknown>;
            }

            const cfnSchema: CloudFormationResourceSchema = {
                typeName: resourceType,
                description: SAM_RESOURCE_DESCRIPTIONS.get(resourceType) ?? `${resourceType} resource`,
                documentationUrl: SAM_DOCUMENTATION_URLS.get(resourceType) ?? '',
                properties: (propertiesSchema?.properties as Record<string, unknown>) ?? {},
                definitions: samSchema.definitions,
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
};
