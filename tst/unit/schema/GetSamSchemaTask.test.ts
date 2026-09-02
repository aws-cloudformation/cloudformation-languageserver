import { describe, it, expect, beforeEach, vi } from 'vitest';
import { DataStore } from '../../../src/datastore/DataStore';
import { MemoryStore } from '../../../src/datastore/MemoryStore';
import { GetSamSchemaTask } from '../../../src/schema/GetSamSchemaTask';
import { SamSchemasType, SamStoreKey } from '../../../src/schema/SamSchemas';

describe('GetSamSchemaTask', () => {
    let mockDataStore: DataStore;

    const mockSamSchemas = new Map([
        ['AWS::Serverless::Function', { typeName: 'AWS::Serverless::Function', properties: {} }],
        ['AWS::Serverless::Api', { typeName: 'AWS::Serverless::Api', properties: {} }],
    ]);

    beforeEach(() => {
        vi.clearAllMocks();
        mockDataStore = new MemoryStore('TestStore');
    });

    it('should run and save SAM schemas successfully', async () => {
        const mockGetSchemas = vi.fn().mockResolvedValue(mockSamSchemas);
        const task = new GetSamSchemaTask(mockGetSchemas);
        const dateNowSpy = vi.spyOn(Date, 'now').mockReturnValue(12345);

        await task.run(mockDataStore);

        expect(mockGetSchemas).toHaveBeenCalled();

        const storedValue = mockDataStore.get(SamStoreKey);
        expect(storedValue).toEqual(
            expect.objectContaining({
                version: 'v1',
                firstCreatedMs: 12345,
                lastModifiedMs: 12345,
            }),
        );
        expect((storedValue as any).schemas).toHaveLength(2);

        dateNowSpy.mockRestore();
    });

    it('should use provided firstCreatedMs when available', async () => {
        const firstCreatedMs = 54321;
        const mockGetSchemas = vi.fn().mockResolvedValue(mockSamSchemas);
        const task = new GetSamSchemaTask(mockGetSchemas, firstCreatedMs);
        const dateNowSpy = vi.spyOn(Date, 'now').mockReturnValue(12345);

        await task.run(mockDataStore);

        const storedValue = mockDataStore.get(SamStoreKey);
        expect(storedValue).toEqual(
            expect.objectContaining({
                firstCreatedMs: firstCreatedMs,
                lastModifiedMs: 12345,
            }),
        );

        dateNowSpy.mockRestore();
    });

    it('should handle errors and rethrow', async () => {
        const error = new Error('SAM schema retrieval failed');
        const mockGetSchemas = vi.fn().mockRejectedValue(error);
        const task = new GetSamSchemaTask(mockGetSchemas);

        await expect(task.run(mockDataStore)).rejects.toThrow('SAM schema retrieval failed');
    });

    it('should use a concurrent writer value after ELOCKED', async () => {
        mockDataStore = {
            get: vi.fn().mockReturnValue({ schemas: [] }),
            put: vi.fn().mockRejectedValue(Object.assign(new Error('already locked'), { code: 'ELOCKED' })),
            remove: vi.fn(),
            clear: vi.fn(),
            keys: vi.fn(),
        };
        const task = new GetSamSchemaTask(vi.fn().mockResolvedValue(mockSamSchemas));

        await expect(task.run(mockDataStore)).resolves.not.toThrow();
        expect(mockDataStore.get).toHaveBeenCalledWith(SamStoreKey);
    });

    it('should rethrow ELOCKED when no concurrent value is available', async () => {
        mockDataStore = {
            get: vi.fn().mockReturnValue(undefined),
            put: vi.fn().mockRejectedValue(Object.assign(new Error('already locked'), { code: 'ELOCKED' })),
            remove: vi.fn(),
            clear: vi.fn(),
            keys: vi.fn(),
        };
        const task = new GetSamSchemaTask(vi.fn().mockResolvedValue(mockSamSchemas));

        await expect(task.run(mockDataStore)).rejects.toMatchObject({ code: 'ELOCKED' });
    });

    it('should stop after an ENOSPC persistence failure', async () => {
        const put = vi.fn().mockRejectedValue(Object.assign(new Error('disk full'), { code: 'ENOSPC' }));
        mockDataStore = {
            get: vi.fn(),
            put,
            remove: vi.fn(),
            clear: vi.fn(),
            keys: vi.fn(),
        };
        const getSchemas = vi.fn().mockResolvedValue(mockSamSchemas);
        const task = new GetSamSchemaTask(getSchemas);

        await expect(task.run(mockDataStore)).resolves.not.toThrow();
        expect(getSchemas).toHaveBeenCalledOnce();
        expect(put).toHaveBeenCalledOnce();
    });

    it('should rethrow unexpected persistence errors', async () => {
        mockDataStore = {
            get: vi.fn(),
            put: vi.fn().mockRejectedValue(Object.assign(new Error('permission denied'), { code: 'EACCES' })),
            remove: vi.fn(),
            clear: vi.fn(),
            keys: vi.fn(),
        };
        const task = new GetSamSchemaTask(vi.fn().mockResolvedValue(mockSamSchemas));

        await expect(task.run(mockDataStore)).rejects.toMatchObject({ code: 'EACCES' });
    });

    it('should convert schemas to correct format', async () => {
        const mockGetSchemas = vi.fn().mockResolvedValue(mockSamSchemas);
        const task = new GetSamSchemaTask(mockGetSchemas);

        await task.run(mockDataStore);

        const storedValue = mockDataStore.get<SamSchemasType>(SamStoreKey);
        const schemas = storedValue!.schemas;

        expect(schemas[0].name).toBe('AWS::Serverless::Function');
        expect(schemas[0].content).toContain('AWS::Serverless::Function');
        expect(schemas[0].createdMs).toBeDefined();
    });
});
