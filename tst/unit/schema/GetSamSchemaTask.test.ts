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
