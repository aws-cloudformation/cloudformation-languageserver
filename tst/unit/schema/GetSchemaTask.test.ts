import { DescribeTypeOutput } from '@aws-sdk/client-cloudformation';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { DataStore } from '../../../src/datastore/DataStore';
import { MemoryStore } from '../../../src/datastore/MemoryStore';
import { GetPublicSchemaTask, GetPrivateSchemasTask } from '../../../src/schema/GetSchemaTask';
import { AwsRegion } from '../../../src/utils/Region';

describe('GetSchemaTask', () => {
    let mockDataStore: DataStore;

    const mockSchemas = [
        {
            name: 'test-schema.json',
            content: '{"typeName": "AWS::S3::Bucket"}',
            createdMs: Date.now(),
        },
    ];

    beforeEach(() => {
        vi.clearAllMocks();
        mockDataStore = new MemoryStore('TestStore');
    });

    describe('GetPublicSchemaTask', () => {
        it('should run and save schemas successfully', async () => {
            const mockGetSchemas = vi.fn().mockResolvedValue(mockSchemas);
            const task = new GetPublicSchemaTask(AwsRegion.US_EAST_1, mockGetSchemas, undefined);
            const dateNowSpy = vi.spyOn(Date, 'now').mockReturnValue(12345);

            await task.run(mockDataStore);

            expect(mockGetSchemas).toHaveBeenCalledWith(AwsRegion.US_EAST_1);

            const storedValue = mockDataStore.get(AwsRegion.US_EAST_1);
            expect(storedValue).toEqual(
                expect.objectContaining({
                    version: 'v1',
                    region: AwsRegion.US_EAST_1,
                    schemas: mockSchemas,
                    firstCreatedMs: 12345,
                    lastModifiedMs: 12345,
                }),
            );

            dateNowSpy.mockRestore();
        });

        it('should use provided firstCreatedMs when available', async () => {
            const firstCreatedMs = 54321;
            const mockGetSchemas = vi.fn().mockResolvedValue(mockSchemas);
            const task = new GetPublicSchemaTask(AwsRegion.US_EAST_1, mockGetSchemas, firstCreatedMs);
            const dateNowSpy = vi.spyOn(Date, 'now').mockReturnValue(12345);

            await task.run(mockDataStore);

            const storedValue = mockDataStore.get(AwsRegion.US_EAST_1);
            expect(storedValue).toEqual(
                expect.objectContaining({
                    firstCreatedMs: firstCreatedMs,
                    lastModifiedMs: 12345,
                }),
            );

            dateNowSpy.mockRestore();
        });

        it('should handle running without a logger', async () => {
            const mockGetSchemas = vi.fn().mockResolvedValue(mockSchemas);
            const task = new GetPublicSchemaTask(AwsRegion.US_EAST_1, mockGetSchemas, undefined);

            await expect(task.run(mockDataStore)).resolves.not.toThrow();

            const storedValue = mockDataStore.get(AwsRegion.US_EAST_1);
            expect(storedValue).toBeDefined();
        });

        it('should handle max attempts exceeded', async () => {
            const mockGetSchemas = vi.fn().mockResolvedValue(mockSchemas);
            const task = new GetPublicSchemaTask(AwsRegion.US_EAST_1, mockGetSchemas, undefined);

            // Force max attempts by setting attempts to max
            (task as any).attempts = GetPublicSchemaTask.MaxAttempts;

            await task.run(mockDataStore);

            const storedValue = mockDataStore.get(AwsRegion.US_EAST_1);
            expect(storedValue).toBeUndefined();
        });
    });

    describe('GetPrivateSchemasTask', () => {
        const mockPrivateSchemas = [
            {
                TypeName: 'Custom::MyResource',
                Description: 'Custom resource',
                Schema: JSON.stringify({ typeName: 'Custom::MyResource' }),
            } as DescribeTypeOutput,
        ];

        it('should retrieve and save private schemas', async () => {
            const mockGetSchemas = vi.fn().mockResolvedValue(mockPrivateSchemas);
            const task = new GetPrivateSchemasTask(mockGetSchemas);

            const dateNowSpy = vi.spyOn(Date, 'now').mockReturnValue(98765);

            await task.run(mockDataStore);

            expect(mockGetSchemas).toHaveBeenCalled();

            const storedValue = mockDataStore.get('PrivateSchemas');
            expect(storedValue).toEqual(
                expect.objectContaining({
                    version: 'v1',
                    identifier: 'PrivateSchemas',
                    schemas: mockPrivateSchemas,
                    firstCreatedMs: 98765,
                    lastModifiedMs: 98765,
                }),
            );

            dateNowSpy.mockRestore();
        });

        it('should handle errors and rethrow', async () => {
            const error = new Error('Schema retrieval failed');
            const mockGetSchemas = vi.fn().mockRejectedValue(error);
            const task = new GetPrivateSchemasTask(mockGetSchemas);

            await expect(task.run(mockDataStore)).rejects.toThrow('Schema retrieval failed');
        });

        it('should handle permission errors gracefully without throwing', async () => {
            const error = { name: 'AccessDenied', $metadata: { httpStatusCode: 403 } };
            const mockGetSchemas = vi.fn().mockRejectedValue(error);
            const task = new GetPrivateSchemasTask(mockGetSchemas);

            await expect(task.run(mockDataStore)).resolves.not.toThrow();
        });

        it('should handle credential errors gracefully without throwing', async () => {
            const error = { name: 'InvalidClientTokenId', $metadata: { httpStatusCode: 403 } };
            const mockGetSchemas = vi.fn().mockRejectedValue(error);
            const task = new GetPrivateSchemasTask(mockGetSchemas);

            await expect(task.run(mockDataStore)).resolves.not.toThrow();
        });
    });
});
