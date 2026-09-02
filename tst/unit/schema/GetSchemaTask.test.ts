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

        it('should handle client network errors gracefully without throwing', async () => {
            const mockGetSchemas = vi.fn().mockRejectedValue(new Error('self signed certificate in certificate chain'));
            const task = new GetPublicSchemaTask(AwsRegion.US_EAST_1, mockGetSchemas, undefined);

            await expect(task.run(mockDataStore)).resolves.not.toThrow();
        });

        it('should rethrow non-client network errors', async () => {
            const mockGetSchemas = vi.fn().mockRejectedValue(new Error('Request failed with status code 500'));
            const task = new GetPublicSchemaTask(AwsRegion.US_EAST_1, mockGetSchemas, undefined);

            await expect(task.run(mockDataStore)).rejects.toThrow('Request failed with status code 500');
        });

        it('should use a concurrent writer value after ELOCKED', async () => {
            const existing = { region: AwsRegion.US_EAST_1 };
            mockDataStore = {
                get: vi.fn().mockReturnValue(existing),
                put: vi.fn().mockRejectedValue(Object.assign(new Error('already locked'), { code: 'ELOCKED' })),
                remove: vi.fn(),
                clear: vi.fn(),
                keys: vi.fn(),
            };
            const task = new GetPublicSchemaTask(AwsRegion.US_EAST_1, vi.fn().mockResolvedValue(mockSchemas));

            await expect(task.run(mockDataStore)).resolves.not.toThrow();
            expect(mockDataStore.get).toHaveBeenCalledWith(AwsRegion.US_EAST_1);
        });

        it('should rethrow ELOCKED when no concurrent value is available', async () => {
            mockDataStore = {
                get: vi.fn().mockReturnValue(undefined),
                put: vi.fn().mockRejectedValue(Object.assign(new Error('already locked'), { code: 'ELOCKED' })),
                remove: vi.fn(),
                clear: vi.fn(),
                keys: vi.fn(),
            };
            const task = new GetPublicSchemaTask(AwsRegion.US_EAST_1, vi.fn().mockResolvedValue(mockSchemas));

            await expect(task.run(mockDataStore)).rejects.toMatchObject({ code: 'ELOCKED' });
        });

        it('should preserve ELOCKED when reading the concurrent value fails', async () => {
            const lockError = Object.assign(new Error('already locked'), { code: 'ELOCKED' });
            mockDataStore = {
                get: vi.fn().mockImplementation(() => {
                    throw new Error('read failed');
                }),
                put: vi.fn().mockRejectedValue(lockError),
                remove: vi.fn(),
                clear: vi.fn(),
                keys: vi.fn(),
            };
            const task = new GetPublicSchemaTask(AwsRegion.US_EAST_1, vi.fn().mockResolvedValue(mockSchemas));

            await expect(task.run(mockDataStore)).rejects.toBe(lockError);
        });

        it('should rethrow unexpected persistence errors', async () => {
            mockDataStore = {
                get: vi.fn(),
                put: vi.fn().mockRejectedValue(Object.assign(new Error('permission denied'), { code: 'EACCES' })),
                remove: vi.fn(),
                clear: vi.fn(),
                keys: vi.fn(),
            };
            const task = new GetPublicSchemaTask(AwsRegion.US_EAST_1, vi.fn().mockResolvedValue(mockSchemas));

            await expect(task.run(mockDataStore)).rejects.toMatchObject({ code: 'EACCES' });
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
