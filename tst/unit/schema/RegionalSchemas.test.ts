import { describe, it, expect } from 'vitest';
import { RegionalSchemas, SchemaFileType } from '../../../src/schema/RegionalSchemas';

describe('RegionalSchemas', () => {
    const mockSchemas: SchemaFileType[] = [
        {
            name: 'test-schema-1.json',
            content: JSON.stringify({
                typeName: 'AWS::S3::Bucket',
                properties: {},
                description: 'description',
                primaryIdentifier: [],
                additionalProperties: false,
            }),
            createdMs: 1,
        },
        {
            name: 'test-schema-2.json',
            content: JSON.stringify({
                typeName: 'AWS::Lambda::Function',
                properties: {},
                description: 'description',
                primaryIdentifier: [],
                additionalProperties: false,
            }),
            createdMs: 2,
        },
    ];

    const firstCreatedMs = 1622548800000; // 2021-06-01
    const lastModifiedMs = 1625140800000; // 2021-07-01

    it('should create a RegionalSchemas instance with correct properties', () => {
        const regionalSchemas = new RegionalSchemas('v1', mockSchemas, 'us-east-1', firstCreatedMs, lastModifiedMs);

        expect(regionalSchemas.version).toBe('v1');
        expect(regionalSchemas.schemas.size).toBe(2);
        expect(regionalSchemas.region).toBe('us-east-1');
        expect(regionalSchemas.firstCreatedMs).toBe(firstCreatedMs);
        expect(regionalSchemas.lastModifiedMs).toBe(lastModifiedMs);
        expect(regionalSchemas.numSchemas).toEqual(2);
    });

    it('should create a RegionalSchemas instance from JSON', () => {
        const json = {
            version: 'v2',
            region: 'us-east-1',
            schemas: mockSchemas,
            firstCreatedMs: firstCreatedMs,
            lastModifiedMs: lastModifiedMs,
        };

        const regionalSchemas = RegionalSchemas.from(json);

        expect(regionalSchemas).toBeInstanceOf(RegionalSchemas);
        expect(regionalSchemas.version).toBe('v2');
        expect(regionalSchemas.schemas.size).toBe(2);
        expect(regionalSchemas.region).toBe('us-east-1');
        expect(regionalSchemas.firstCreatedMs).toBe(firstCreatedMs);
        expect(regionalSchemas.lastModifiedMs).toBe(lastModifiedMs);
        expect(regionalSchemas.numSchemas).toEqual(2);
    });
});
