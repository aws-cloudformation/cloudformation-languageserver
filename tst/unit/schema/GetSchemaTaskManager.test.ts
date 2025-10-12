import { DescribeTypeOutput } from '@aws-sdk/client-cloudformation';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { MemoryDataStoreFactoryProvider } from '../../../src/datastore/DataStore';
import { GetSchemaTaskManager } from '../../../src/schema/GetSchemaTaskManager';
import { SchemaStore } from '../../../src/schema/SchemaStore';
import { AwsRegion } from '../../../src/utils/Region';
import { flushAllPromises } from '../../utils/Utils';

describe('GetSchemaTaskManager', () => {
    let mockSchemaStore: SchemaStore;
    let manager: GetSchemaTaskManager;
    let mockGetPublicSchemas: ReturnType<typeof vi.fn>;
    let mockGetPrivateResources: ReturnType<typeof vi.fn>;

    beforeEach(() => {
        vi.clearAllMocks();
        const dataStoreFactory = new MemoryDataStoreFactoryProvider();
        mockSchemaStore = new SchemaStore(dataStoreFactory);

        mockGetPublicSchemas = vi.fn();
        mockGetPrivateResources = vi.fn().mockResolvedValue([
            {
                TypeName: 'Custom::TestResource',
                Description: 'Test private resource',
            } as DescribeTypeOutput,
        ]);

        manager = new GetSchemaTaskManager(mockSchemaStore, mockGetPublicSchemas, mockGetPrivateResources);
    });

    afterEach(() => {
        manager.close();
    });

    it('should process multiple different regions sequentially', async () => {
        let resolveFirst: (value: any) => void;

        mockGetPublicSchemas
            .mockImplementationOnce(
                () =>
                    new Promise((resolve) => {
                        resolveFirst = resolve;
                    }),
            )
            .mockImplementationOnce(() => new Promise(() => {}));

        // Add two different regions
        manager.addTask(AwsRegion.US_EAST_1);
        manager.addTask(AwsRegion.US_WEST_2);

        // First region starts immediately
        expect(mockGetPublicSchemas).toHaveBeenCalledWith(AwsRegion.US_EAST_1);
        expect(mockGetPublicSchemas).toHaveBeenCalledTimes(1);

        // Complete first task
        resolveFirst!([{ name: 'first.json', content: '{}', createdMs: Date.now() }]);
        await flushAllPromises();

        // Now second region should start
        expect(mockGetPublicSchemas).toHaveBeenCalledWith(AwsRegion.US_WEST_2);
        expect(mockGetPublicSchemas).toHaveBeenCalledTimes(2);
    });

    it('should not add duplicate regions to queue', () => {
        manager.addTask(AwsRegion.US_EAST_1);
        manager.addTask(AwsRegion.US_EAST_1);
        manager.addTask(AwsRegion.US_EAST_1);

        // Should only have one task in queue
        const regionalTasks = manager.currentRegionalTasks();
        expect(regionalTasks.size).toBe(1);
        expect(regionalTasks.has(AwsRegion.US_EAST_1)).toBe(true);
    });

    it('should track multiple different regions in queue', () => {
        mockGetPublicSchemas.mockImplementation(() => new Promise(() => {}));

        // Add different regions while first is processing
        manager.addTask(AwsRegion.US_EAST_1);
        manager.addTask(AwsRegion.US_WEST_2);
        manager.addTask(AwsRegion.EU_WEST_1);
        manager.addTask(AwsRegion.US_EAST_1); // duplicate

        // Should track all unique regions
        const regionalTasks = manager.currentRegionalTasks();
        expect(regionalTasks.size).toBe(3);
        expect(regionalTasks.has(AwsRegion.US_EAST_1)).toBe(true);
        expect(regionalTasks.has(AwsRegion.US_WEST_2)).toBe(true);
        expect(regionalTasks.has(AwsRegion.EU_WEST_1)).toBe(true);
    });

    it('should handle slow promises without blocking other operations', async () => {
        let resolvePromise: (value: any) => void;

        mockGetPublicSchemas.mockImplementation(
            () =>
                new Promise((resolve) => {
                    resolvePromise = resolve;
                }),
        );

        manager.addTask(AwsRegion.US_EAST_1);

        // Task should start but not complete
        expect(mockGetPublicSchemas).toHaveBeenCalledWith(AwsRegion.US_EAST_1);
        expect((manager as any).isRunning).toBe(true);

        // Should not have data in store yet
        expect(mockSchemaStore.publicSchemas.get(AwsRegion.US_EAST_1)).toBeUndefined();

        // Complete the task
        resolvePromise!([{ name: 'test.json', content: '{}', createdMs: Date.now() }]);
        await flushAllPromises();

        // Should have saved to datastore
        expect(mockSchemaStore.publicSchemas.get(AwsRegion.US_EAST_1)).toBeDefined();
        expect((manager as any).isRunning).toBe(false);
    });

    it('should handle task failures by retrying', async () => {
        mockGetPublicSchemas
            .mockRejectedValueOnce(new Error('Network error'))
            .mockResolvedValueOnce([{ name: 'retry.json', content: '{}', createdMs: Date.now() }]);

        manager.addTask(AwsRegion.US_EAST_1);

        await flushAllPromises();

        // Should have been called twice (original + retry)
        expect(mockGetPublicSchemas).toHaveBeenCalledTimes(2);
        expect(mockGetPublicSchemas).toHaveBeenCalledWith(AwsRegion.US_EAST_1);
    });

    it('should handle private task with slow promises', async () => {
        let resolvePromise: (value: any) => void;

        mockGetPrivateResources.mockImplementation(
            () =>
                new Promise((resolve) => {
                    resolvePromise = resolve;
                }),
        );

        manager.runPrivateTask();

        expect(mockGetPrivateResources).toHaveBeenCalled();

        // Should not have data in store yet
        expect(mockSchemaStore.privateSchemas.keys(10)).toHaveLength(0);

        resolvePromise!([{ TypeName: 'Custom::Test', Description: 'Test' } as DescribeTypeOutput]);
        await flushAllPromises();

        // Should have saved to private store
        expect(mockSchemaStore.privateSchemas.keys(10).length).toBeGreaterThan(0);
    });
});
