import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { MemoryStore } from '../../../src/datastore/MemoryStore';
import { GetLocalSchemaTask, getLocalSchemas } from '../../../src/schema/GetLocalSchemaTask';
import { LocalSchemas, LocalSchemasType, LocalStoreKey } from '../../../src/schema/LocalSchemas';
import { ResourceSchema } from '../../../src/schema/ResourceSchema';

describe('GetLocalSchemaTask', () => {
    const mockSchemas = new Map([
        ['Custom::One', { typeName: 'Custom::One', properties: {} }],
        ['Custom::Two', { typeName: 'Custom::Two', properties: {} }],
    ]);

    it('should save local schemas', async () => {
        const store = new MemoryStore('TestStore');
        const getSchemas = vi.fn().mockResolvedValue(mockSchemas);
        const dateNowSpy = vi.spyOn(Date, 'now').mockReturnValue(12345);

        await new GetLocalSchemaTask(getSchemas, ['/dir']).run(store);

        expect(getSchemas).toHaveBeenCalledWith(['/dir']);
        const stored = store.get<LocalSchemasType>(LocalStoreKey);
        expect(stored).toEqual(
            expect.objectContaining({ version: LocalSchemas.V1, firstCreatedMs: 12345, lastModifiedMs: 12345 }),
        );
        expect(stored?.schemas.map((s) => s.name)).toEqual(['Custom::One', 'Custom::Two']);
        expect(JSON.parse(stored!.schemas[0].content).typeName).toBe('Custom::One');

        dateNowSpy.mockRestore();
    });

    it('should use provided firstCreatedMs', async () => {
        const store = new MemoryStore('TestStore');
        vi.spyOn(Date, 'now').mockReturnValue(12345);

        await new GetLocalSchemaTask(vi.fn().mockResolvedValue(mockSchemas), ['/dir'], 54321).run(store);

        expect(store.get<LocalSchemasType>(LocalStoreKey)).toEqual(
            expect.objectContaining({ firstCreatedMs: 54321, lastModifiedMs: 12345 }),
        );
        vi.restoreAllMocks();
    });

    it('should rethrow errors', async () => {
        const store = new MemoryStore('TestStore');
        const getSchemas = vi.fn().mockRejectedValue(new Error('boom'));

        await expect(new GetLocalSchemaTask(getSchemas, ['/dir']).run(store)).rejects.toThrow('boom');
        expect(store.get(LocalStoreKey)).toBeUndefined();
    });
});

describe('getLocalSchemas', () => {
    let root: string;

    const validSchema = (typeName: string, extra: Record<string, unknown> = {}) => ({
        typeName,
        description: 'custom',
        properties: { Id: { type: 'string' } },
        primaryIdentifier: ['/properties/Id'],
        additionalProperties: false,
        ...extra,
    });
    const schema = (typeName: string, extra: Record<string, unknown> = {}) =>
        JSON.stringify(validSchema(typeName, extra));
    const without = (field: string) => {
        const copy: Record<string, unknown> = validSchema('Custom::Bad');
        delete copy[field];
        return JSON.stringify(copy);
    };

    beforeEach(() => {
        root = mkdtempSync(join(tmpdir(), 'local-schemas-'));
    });

    afterEach(() => {
        rmSync(root, { recursive: true, force: true });
    });

    it('should load valid schemas keyed by typeName', async () => {
        writeFileSync(join(root, 'a.json'), schema('Custom::A'));
        writeFileSync(join(root, 'b.json'), schema('Custom::B'));

        const result = await getLocalSchemas([root]);

        expect([...result.keys()].toSorted()).toEqual(['Custom::A', 'Custom::B']);
    });

    it('should load schemas from nested directories', async () => {
        mkdirSync(join(root, 'nested', 'deep'), { recursive: true });
        writeFileSync(join(root, 'nested', 'deep', 'c.json'), schema('Custom::C'));

        const result = await getLocalSchemas([root]);

        expect(result.has('Custom::C')).toBe(true);
    });

    it('should ignore non-json files', async () => {
        writeFileSync(join(root, 'readme.md'), schema('Custom::Md'));
        writeFileSync(join(root, 'a.json'), schema('Custom::A'));

        const result = await getLocalSchemas([root]);

        expect([...result.keys()]).toEqual(['Custom::A']);
    });

    it('should skip invalid json and non-schema documents', async () => {
        writeFileSync(join(root, 'broken.json'), '{ not json');
        writeFileSync(join(root, 'array.json'), '[]');
        writeFileSync(join(root, 'null.json'), 'null');
        writeFileSync(join(root, 'null-props.json'), schema('Custom::Null', { properties: null }));
        writeFileSync(join(root, 'bad-type.json'), schema('Custom::Bad', { typeName: 5 }));
        writeFileSync(join(root, 'ok.json'), schema('Custom::Ok'));

        const result = await getLocalSchemas([root]);

        expect([...result.keys()]).toEqual(['Custom::Ok']);
    });

    it.each(['typeName', 'description', 'properties'])('should skip schemas missing %s', async (field) => {
        writeFileSync(join(root, 'bad.json'), without(field));
        writeFileSync(join(root, 'ok.json'), schema('Custom::Ok'));

        const result = await getLocalSchemas([root]);

        expect([...result.keys()]).toEqual(['Custom::Ok']);
    });

    it.each([
        ['empty typeName', { typeName: '' }],
        ['empty description', { description: '' }],
    ])('should skip schemas with %s', async (_name, override) => {
        writeFileSync(join(root, 'bad.json'), schema('Custom::Bad', override));
        writeFileSync(join(root, 'ok.json'), schema('Custom::Ok'));

        const result = await getLocalSchemas([root]);

        expect([...result.keys()]).toEqual(['Custom::Ok']);
    });

    it('should produce schemas the ResourceSchema constructor accepts', async () => {
        writeFileSync(join(root, 'a.json'), schema('Custom::A'));

        const result = await getLocalSchemas([root]);

        expect(() => new ResourceSchema(JSON.stringify(result.get('Custom::A')))).not.toThrow();
    });

    it('should skip missing directories', async () => {
        writeFileSync(join(root, 'a.json'), schema('Custom::A'));

        const result = await getLocalSchemas([join(root, 'missing'), root]);

        expect([...result.keys()]).toEqual(['Custom::A']);
    });

    it('should return empty map for no directories', async () => {
        const result = await getLocalSchemas([]);

        expect(result.size).toBe(0);
    });

    it('should let later directories override earlier ones for the same typeName', async () => {
        const other = mkdtempSync(join(tmpdir(), 'local-schemas-'));
        try {
            writeFileSync(join(root, 'a.json'), schema('Custom::A', { description: 'first' }));
            writeFileSync(join(other, 'a.json'), schema('Custom::A', { description: 'second' }));

            const result = await getLocalSchemas([root, other]);

            expect(result.get('Custom::A')?.description).toBe('second');
        } finally {
            rmSync(other, { recursive: true, force: true });
        }
    });
});
