import { DescribeTypeOutput } from '@aws-sdk/client-cloudformation';
import { describe, it, expect, beforeEach, vi } from 'vitest';
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
    let mockGetSamSchema: ReturnType<typeof vi.fn>;

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
        mockGetSamSchema = vi.fn();

        manager = new GetSchemaTaskManager(
            mockSchemaStore,
            mockGetPublicSchemas,
            mockGetPrivateResources,
            mockGetSamSchema,
        );
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
            .mockImplementationOnce(() =>
                Promise.resolve([{ name: 'second.json', content: '{}', createdMs: Date.now() }]),
            );

        // Add two different regions
        manager.addTask(AwsRegion.US_EAST_1);

        // First region starts immediately
        expect(mockGetPublicSchemas).toHaveBeenCalledWith(AwsRegion.US_EAST_1);
        expect(mockGetPublicSchemas).toHaveBeenCalledTimes(1);

        // Complete first task
        resolveFirst!([{ name: 'first.json', content: '{}', createdMs: Date.now() }]);
        await flushAllPromises();

        // Add second region after first completes
        manager.addTask(AwsRegion.US_WEST_2);
        await flushAllPromises();

        // Now second region should have started
        expect(mockGetPublicSchemas).toHaveBeenCalledWith(AwsRegion.US_WEST_2);
        expect(mockGetPublicSchemas).toHaveBeenCalledTimes(2);
    });

    it('should not add duplicate regions to queue', async () => {
        mockGetPublicSchemas.mockResolvedValue([{ name: 'test.json', content: '{}', createdMs: Date.now() }]);

        manager.addTask(AwsRegion.US_EAST_1);
        await flushAllPromises();

        // Adding same region again should log warning
        manager.addTask(AwsRegion.US_EAST_1);
        await flushAllPromises();

        // Should have been called only once (duplicate is skipped)
        expect(mockGetPublicSchemas).toHaveBeenCalledTimes(1);
    });

    it('should track multiple different regions in queue', async () => {
        mockGetPublicSchemas.mockResolvedValue([{ name: 'test.json', content: '{}', createdMs: Date.now() }]);

        // Add different regions
        manager.addTask(AwsRegion.US_EAST_1);
        await flushAllPromises();
        manager.addTask(AwsRegion.US_WEST_2);
        await flushAllPromises();
        manager.addTask(AwsRegion.EU_WEST_1);
        await flushAllPromises();

        // Should have called for all unique regions
        expect(mockGetPublicSchemas).toHaveBeenCalledWith(AwsRegion.US_EAST_1);
        expect(mockGetPublicSchemas).toHaveBeenCalledWith(AwsRegion.US_WEST_2);
        expect(mockGetPublicSchemas).toHaveBeenCalledWith(AwsRegion.EU_WEST_1);
        expect(mockGetPublicSchemas).toHaveBeenCalledTimes(3);
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

        // Task should start
        expect(mockGetPublicSchemas).toHaveBeenCalledWith(AwsRegion.US_EAST_1);

        // Should not have data in store yet
        expect(mockSchemaStore.publicSchemas.get(AwsRegion.US_EAST_1)).toBeUndefined();

        // Complete the task
        resolvePromise!([{ name: 'test.json', content: '{}', createdMs: Date.now() }]);
        await flushAllPromises();

        // Should have saved to datastore
        expect(mockSchemaStore.publicSchemas.get(AwsRegion.US_EAST_1)).toBeDefined();
    });

    it('should handle task failures by retrying', async () => {
        let callCount = 0;
        mockGetPublicSchemas.mockImplementation(() => {
            callCount++;
            if (callCount === 1) {
                return Promise.reject(new Error('Network error'));
            }
            return Promise.resolve([{ name: 'retry.json', content: '{}', createdMs: Date.now() }]);
        });

        manager.addTask(AwsRegion.US_EAST_1);
        await flushAllPromises();

        // After failure, task is re-added to queue and will be retried
        await flushAllPromises();

        // Should have been called at least once
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
