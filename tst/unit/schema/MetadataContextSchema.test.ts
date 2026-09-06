import { describe, expect, test } from 'vitest';
import {
    MUTABILITY_LEVELS,
    RESOURCE_METADATA_CONTEXT_SCHEMA,
    resolveMetadataContextSchema,
    TEMPLATE_METADATA_CONTEXT_SCHEMA,
} from '../../../src/schema/MetadataContextSchema';

describe('MetadataContextSchema traversal', () => {
    test('resolves rich ref fields with and without an explicit array index', () => {
        expect(resolveMetadataContextSchema(TEMPLATE_METADATA_CONTEXT_SCHEMA, ['ref', 0, 'at'])?.type).toBe('string');
        expect(resolveMetadataContextSchema(TEMPLATE_METADATA_CONTEXT_SCHEMA, ['ref', 'at'])?.type).toBe('string');
    });

    test('resolves arbitrary mutability property values to the mutability enum', () => {
        expect(
            resolveMetadataContextSchema(RESOURCE_METADATA_CONTEXT_SCHEMA, ['mutability', 'VisibilityTimeout'])?.enum,
        ).toEqual([...MUTABILITY_LEVELS]);
    });

    test('returns undefined when indexing a scalar field', () => {
        expect(resolveMetadataContextSchema(RESOURCE_METADATA_CONTEXT_SCHEMA, ['why', 0])).toBeUndefined();
    });

    test('returns undefined when traversing below a scalar field', () => {
        expect(resolveMetadataContextSchema(RESOURCE_METADATA_CONTEXT_SCHEMA, ['why', 'nested'])).toBeUndefined();
    });

    test('returns undefined for an unknown field in a closed object', () => {
        expect(resolveMetadataContextSchema(TEMPLATE_METADATA_CONTEXT_SCHEMA, ['ref', 0, 'unknown'])).toBeUndefined();
    });
});
