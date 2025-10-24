import { DescribeTypeOutput } from '@aws-sdk/client-cloudformation';
import { Logger } from 'pino';
import { StubbedInstance, stubInterface } from 'ts-sinon';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { DataStore } from '../../../src/datastore/DataStore';
import { MemoryStore } from '../../../src/datastore/MemoryStore';
import { GetPublicSchemaTask, GetPrivateSchemasTask } from '../../../src/schema/GetSchemaTask';
import { AwsRegion } from '../../../src/utils/Region';

describe('GetSchemaTask', () => {
    let mockDataStore: DataStore;
    let mockLogger: StubbedInstance<Logger>;

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
        mockLogger = stubInterface<Logger>();

        // Setup Sinon stubs
        mockLogger.info.resolves();
        mockLogger.error.resolves();
    });

    describe('GetPublicSchemaTask', () => {
        it('should run and save schemas successfully', async () => {
            const mockGetSchemas = vi.fn().mockResolvedValue(mockSchemas);
            const task = new GetPublicSchemaTask(AwsRegion.US_EAST_1, mockGetSchemas, undefined);
            const dateNowSpy = vi.spyOn(Date, 'now').mockReturnValue(12345);

            await task.run(mockDataStore, mockLogger);

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

            expect(
                mockLogger.info.calledWith(
                    `${mockSchemas.length} resource schemas retrieved for ${AwsRegion.US_EAST_1}`,
                ),
            ).toBe(true);

            dateNowSpy.mockRestore();
        });

        it('should use provided firstCreatedMs when available', async () => {
            const firstCreatedMs = 54321;
            const mockGetSchemas = vi.fn().mockResolvedValue(mockSchemas);
            const task = new GetPublicSchemaTask(AwsRegion.US_EAST_1, mockGetSchemas, firstCreatedMs);
            const dateNowSpy = vi.spyOn(Date, 'now').mockReturnValue(12345);

            await task.run(mockDataStore, mockLogger);

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

            await task.run(mockDataStore, mockLogger);

            expect(
                mockLogger.error.calledWith(
                    `Reached max attempts for retrieving schemas for ${AwsRegion.US_EAST_1} without success`,
                ),
            ).toBe(true);

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

        it('should retrieve and save private schemas for new profile', async () => {
            const mockGetSchemas = vi.fn().mockResolvedValue(mockPrivateSchemas);
            const mockGetProfile = vi.fn().mockReturnValue('test-profile');
            const task = new GetPrivateSchemasTask(mockGetSchemas, mockGetProfile);

            const dateNowSpy = vi.spyOn(Date, 'now').mockReturnValue(98765);

            await task.run(mockDataStore, mockLogger);

            expect(mockGetSchemas).toHaveBeenCalled();

            const storedValue = mockDataStore.get('test-profile');
            expect(storedValue).toEqual(
                expect.objectContaining({
                    version: 'v1',
                    identifier: 'test-profile',
                    schemas: mockPrivateSchemas,
                    firstCreatedMs: 98765,
                    lastModifiedMs: 98765,
                }),
            );

            dateNowSpy.mockRestore();
        });

        it('should skip retrieval for already processed profile', async () => {
            const mockGetSchemas = vi.fn().mockResolvedValue(mockPrivateSchemas);
            const mockGetProfile = vi.fn().mockReturnValue('processed-profile');
            const task = new GetPrivateSchemasTask(mockGetSchemas, mockGetProfile);

            // First run should process the profile
            await task.run(mockDataStore, mockLogger);
            expect(mockGetSchemas).toHaveBeenCalledTimes(1);

            // Second run should skip processing
            mockGetSchemas.mockClear();

            await task.run(mockDataStore, mockLogger);
            expect(mockGetSchemas).not.toHaveBeenCalled();
        });

        it('should handle errors and rethrow', async () => {
            const error = new Error('Schema retrieval failed');
            const mockGetSchemas = vi.fn().mockRejectedValue(error);
            const mockGetProfile = vi.fn().mockReturnValue('error-profile');
            const task = new GetPrivateSchemasTask(mockGetSchemas, mockGetProfile);

            await expect(task.run(mockDataStore, mockLogger)).rejects.toThrow('Schema retrieval failed');

            // Check that error was logged using Sinon stub
            expect(mockLogger.error.called).toBe(true);
            const errorCall = mockLogger.error.getCall(0);
            expect(errorCall.args[0]).toContain('Failed to get private schemas');
        });
    });
});
