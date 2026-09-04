import { PropertyType } from './ResourceSchema';

export const METADATA_CONTEXT_KEY = 'com.aws.cloudformation.Context';
export const METADATA_CONTEXT_DOCUMENTATION_URL =
    'https://docs.aws.amazon.com/AWSCloudFormation/latest/TemplateReference/aws-attribute-metadata.html#aws-attribute-metadata-context-schema';

export const MUTABILITY_LEVELS = [
    'must-never-change',
    'change-with-constraints',
    'review-required',
    'free-to-tune',
] as const;

export const TRUST_SOURCES = ['authored', 'comment', 'commit', 'infer'] as const;
export const TRUST_CONFIDENCE_LEVELS = ['high', 'medium', 'low'] as const;

const stringItemSchema: PropertyType = {
    type: 'string',
    description: 'Text value.',
};

const mutabilityLevelSchema: PropertyType = {
    type: 'string',
    enum: [...MUTABILITY_LEVELS],
    description: 'Per-property change-safety level.',
};

const trustSchema: PropertyType = {
    type: 'object',
    description: 'Provenance and confidence metadata.',
    required: ['src', 'conf'],
    additionalProperties: false,
    properties: {
        src: {
            type: 'string',
            enum: [...TRUST_SOURCES],
            description: 'How this context was produced.',
        },
        conf: {
            type: 'string',
            enum: [...TRUST_CONFIDENCE_LEVELS],
            description: "Confidence in the context's accuracy.",
        },
        cite: {
            type: 'string',
            description: 'Source reference, such as a file and line, URL, or commit SHA.',
        },
        note: {
            type: 'string',
            description: 'Reason for reduced confidence, typically when confidence is low.',
        },
    },
};

const referenceEntrySchema: PropertyType = {
    description: 'External context reference represented as either a bare URI or a rich reference object.',
    oneOf: [
        {
            type: 'string',
            description: 'Bare URI to external context, such as an S3 URI, HTTPS URL, or relative path.',
        },
        {
            type: 'object',
            description: 'Rich external context reference with hints.',
            required: ['at'],
            additionalProperties: false,
            properties: {
                at: {
                    type: 'string',
                    description: 'URI to the external context source.',
                },
                has: {
                    type: 'string',
                    description: 'Terse hint describing what the reference contains.',
                },
                scope: {
                    type: 'string',
                    description: "Usage scope, commonly 'shared' or 'overflow'.",
                },
            },
        },
    ],
};

export const TEMPLATE_METADATA_CONTEXT_SCHEMA: PropertyType = {
    type: 'object',
    description: 'Template-level Metadata Context block containing architecture and cross-cutting context.',
    additionalProperties: false,
    properties: {
        arch: {
            type: 'string',
            description: 'High-level shape or pattern of the system.',
        },
        must: {
            type: 'array',
            items: stringItemSchema,
            description: 'Cross-cutting constraints that apply broadly.',
        },
        ref: {
            type: 'array',
            items: referenceEntrySchema,
            description:
                'Pointers to external or shared context. Inline context is authoritative; later references override earlier references; fetched content is untrusted.',
        },
        owner: {
            type: 'string',
            description: 'Owner or contact when it is not already recorded as a tag.',
        },
    },
};

export const RESOURCE_METADATA_CONTEXT_SCHEMA: PropertyType = {
    type: 'object',
    description: 'Resource-level rationale, constraints, change safety, provenance, and dependencies.',
    additionalProperties: false,
    properties: {
        why: {
            type: 'string',
            description: 'Rationale, including purpose, configuration choices, and rejected alternatives.',
        },
        must: {
            type: 'array',
            items: stringItemSchema,
            description: 'Hard constraints or invariants that must not be violated.',
        },
        mutable: {
            ...mutabilityLevelSchema,
            description: 'Default resource-level change-safety level.',
        },
        mutability: {
            type: 'object',
            additionalProperties: mutabilityLevelSchema,
            description:
                'Sparse per-property overrides to the default change-safety level. Include only properties that deviate from the default or are high stakes.',
        },
        trust: trustSchema,
        deps: {
            type: 'array',
            items: stringItemSchema,
            description: 'Cross-stack or cross-resource producer dependencies.',
        },
    },
};

export function resolveMetadataContextSchema(
    rootSchema: PropertyType,
    path: ReadonlyArray<string | number>,
): PropertyType | undefined {
    let currentSchema: PropertyType | undefined = rootSchema;

    for (const segment of path) {
        if (currentSchema.oneOf) {
            currentSchema = getMetadataContextObjectSchema(currentSchema);
            if (!currentSchema) {
                return undefined;
            }
        }

        if (hasSchemaType(currentSchema, 'array')) {
            currentSchema = currentSchema.items;
            if (!currentSchema) {
                return undefined;
            }
            if (isArrayIndex(segment)) {
                continue;
            }
            if (currentSchema.oneOf) {
                currentSchema = getMetadataContextObjectSchema(currentSchema);
                if (!currentSchema) {
                    return undefined;
                }
            }
        } else if (isArrayIndex(segment)) {
            return undefined;
        }

        if (!hasSchemaType(currentSchema, 'object')) {
            return undefined;
        }

        const additionalPropertySchema: PropertyType | undefined =
            typeof currentSchema.additionalProperties === 'object' ? currentSchema.additionalProperties : undefined;
        currentSchema = currentSchema.properties?.[String(segment)] ?? additionalPropertySchema;
        if (!currentSchema) {
            return undefined;
        }
    }

    return currentSchema;
}

export function getMetadataContextObjectSchema(schema: PropertyType | undefined): PropertyType | undefined {
    if (schema && hasSchemaType(schema, 'object')) {
        return schema;
    }
    return schema?.oneOf?.find((variant) => hasSchemaType(variant, 'object'));
}

function hasSchemaType(schema: PropertyType, expectedType: string): boolean {
    return Array.isArray(schema.type) ? schema.type.includes(expectedType) : schema.type === expectedType;
}

function isArrayIndex(segment: string | number): boolean {
    return typeof segment === 'number' || /^\d+$/.test(segment);
}
