import { StubbedInstance } from 'ts-sinon';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { MemoryDataStoreFactoryProvider } from '../../../src/datastore/DataStore';
import { CombinedSchemas } from '../../../src/schema/CombinedSchemas';
import { GetSchemaTaskManager } from '../../../src/schema/GetSchemaTaskManager';
import { RegionalSchemasType } from '../../../src/schema/RegionalSchemas';
import { SchemaRetriever } from '../../../src/schema/SchemaRetriever';
import { SchemaStore } from '../../../src/schema/SchemaStore';
import { Settings } from '../../../src/settings/Settings';
import { ClientMessage } from '../../../src/telemetry/ClientMessage';
import { AwsRegion } from '../../../src/utils/Region';
import {
    createMockClientMessage,
    createMockSchemaTaskManager,
    createMockSettingsManager,
} from '../../utils/MockServerComponents';

describe('SchemaRetriever', () => {
    const key = AwsRegion.US_EAST_1;

    const mockSchemaData: RegionalSchemasType = {
        version: 'v1',
        region: AwsRegion.US_EAST_1,
        schemas: [
            {
                name: 'test-schema.json',
                content: JSON.stringify({
                    typeName: 'AWS::S3::Bucket',
                    properties: {},
                    description: 'description',
                    primaryIdentifier: [],
                    additionalProperties: false,
                }),
                createdMs: 1622548800000, // 2021-06-01
            },
        ],
        firstCreatedMs: 1622548800000, // 2021-06-01
        lastModifiedMs: 1625140800000, // 2021-07-01
    };

    let clientMessage: StubbedInstance<ClientMessage>;
    let mockTaskManager: StubbedInstance<GetSchemaTaskManager>;
    let schemaStore: SchemaStore;
    let schemaRetriever: SchemaRetriever;

    beforeEach(() => {
        vi.clearAllMocks();

        // Mock Date.now to return a fixed timestamp
        vi.spyOn(Date.prototype, 'getTime').mockImplementation(function (this: Date) {
            // For the current date (when no date is provided to the constructor)
            if (this.toString() === new Date().toString()) {
                return 1625140800000; // 2021-07-01
            }
            // For dates created with timestamps (like the lastModifiedMs)
            return this.valueOf();
        });

        const dataStoreFactory = new MemoryDataStoreFactoryProvider();
        schemaStore = new SchemaStore(dataStoreFactory);
        clientMessage = createMockClientMessage();
        mockTaskManager = createMockSchemaTaskManager();
        schemaRetriever = new SchemaRetriever(mockTaskManager, schemaStore, clientMessage);
    });

    afterEach(() => {
        vi.restoreAllMocks();
    });

    it('should check for missing schemas on initialization', () => {
        // Need to configure to trigger initialization
        const mockSettingsManager = {
            getCurrentSettings: () => ({ profile: { region: AwsRegion.US_EAST_1, profile: 'default' } }),
            subscribe: vi.fn().mockReturnValue({ unsubscribe: vi.fn() }),
        };
        schemaRetriever.configure(mockSettingsManager as any);

        expect(mockTaskManager.addTask.calledWith(AwsRegion.US_EAST_1)).toBe(true);
    });

    it('should get schema from database if available', async () => {
        // Put data in the store first
        await schemaStore.publicSchemas.put(AwsRegion.US_EAST_1, mockSchemaData);

        const result = schemaRetriever.get(AwsRegion.US_EAST_1, 'default');

        expect(result).toBeInstanceOf(CombinedSchemas);
        expect(result?.numSchemas).toBeGreaterThan(0);
    });

    it('should return empty CombinedSchemas if schema is not in database', () => {
        const result = schemaRetriever.get(AwsRegion.US_EAST_1, 'default');

        expect(result).toBeInstanceOf(CombinedSchemas);
        expect(result.numSchemas).toBe(0);
        expect(mockTaskManager.addTask.calledWith(AwsRegion.US_EAST_1)).toBe(true);
    });

    it('should check for stale schemas on initialization', async () => {
        // Create a schema with a timestamp that's 8 days old (stale)
        const staleTimestamp = 1625140800000 - 8 * 24 * 60 * 60 * 1000;
        const staleSchemaData = { ...mockSchemaData, lastModifiedMs: staleTimestamp };

        // Put stale data in the store
        await schemaStore.publicSchemas.put(key, staleSchemaData);

        // Mock Date.now to return a fixed timestamp
        vi.spyOn(Date.prototype, 'getTime').mockImplementation(function (this: Date) {
            // For the current date (when no date is provided to the constructor)
            if (this.toString() === new Date().toString()) {
                return 1625140800000; // 2021-07-01
            }
            // For dates created with timestamps (like the lastModifiedMs)
            return this.valueOf();
        });

        // Need to configure to trigger initialization
        const mockSettingsManager = {
            getCurrentSettings: () => ({ profile: { region: AwsRegion.US_EAST_1, profile: 'default' } }),
            subscribe: vi.fn().mockReturnValue({ unsubscribe: vi.fn() }),
        };
        schemaRetriever.configure(mockSettingsManager as any);

        expect(mockTaskManager.addTask.calledWith(AwsRegion.US_EAST_1)).toBe(true);
    });

    it('should track available regions', async () => {
        // Put data in the store first
        await schemaStore.publicSchemas.put(AwsRegion.US_EAST_1, mockSchemaData);

        schemaRetriever.get(AwsRegion.US_EAST_1, 'default');
        expect(schemaRetriever.availableRegions.has(AwsRegion.US_EAST_1)).toBe(true);
    });

    it('should get default schema using user settings', async () => {
        // Put data in the store first
        await schemaStore.publicSchemas.put(AwsRegion.US_EAST_1, mockSchemaData);

        const result = schemaRetriever.getDefault();
        expect(result).toBeInstanceOf(CombinedSchemas);
    });

    it('should update private schemas when called', () => {
        schemaRetriever.updatePrivateSchemas();
        expect(mockTaskManager.runPrivateTask.called).toBe(true);
    });

    it('should handle settings configuration', () => {
        vi.spyOn(schemaRetriever, 'updatePrivateSchemas');

        // Configure with new settings
        const testSettings = {
            profile: {
                region: AwsRegion.US_WEST_2,
                profile: 'new-profile',
            },
        } as Settings;
        const mockSettingsManager = createMockSettingsManager(testSettings);
        schemaRetriever.configure(mockSettingsManager);

        // The configure method should trigger schema updates
        expect(schemaRetriever.updatePrivateSchemas).toHaveBeenCalled();
    });
});
