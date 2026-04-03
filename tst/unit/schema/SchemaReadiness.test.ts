import { describe, it, expect, beforeEach, vi } from 'vitest';
import { SchemaReadiness } from '../../../src/schema/SchemaReadiness';
import { DefaultSettings } from '../../../src/settings/Settings';
import { AwsRegion } from '../../../src/utils/Region';
import { createMockSchemaStore, createMockSettingsManager } from '../../utils/MockServerComponents';

describe('SchemaReadiness', () => {
    let mockSchemaStore: ReturnType<typeof createMockSchemaStore>;
    let mockSettingsManager: ReturnType<typeof createMockSettingsManager>;
    let schemaReadiness: SchemaReadiness;

    beforeEach(() => {
        mockSchemaStore = createMockSchemaStore();
        mockSettingsManager = createMockSettingsManager();
        // SchemaReadiness initializes with DefaultSettings.profile (region: us-east-1)
        schemaReadiness = new SchemaReadiness(mockSchemaStore);
    });

    describe('isReady', () => {
        it('should return ready when schemas are available for current region', () => {
            mockSchemaStore.getPublicSchemaRegions.returns([AwsRegion.US_EAST_1, AwsRegion.US_WEST_2]);

            const result = schemaReadiness.isReady();

            expect(result).toEqual({ ready: true });
        });

        it('should return not ready when schemas are not available for current region', () => {
            mockSchemaStore.getPublicSchemaRegions.returns([AwsRegion.EU_WEST_1]);

            const result = schemaReadiness.isReady();

            expect(result).toEqual({ ready: false });
        });

        it('should return not ready when no schemas are available', () => {
            mockSchemaStore.getPublicSchemaRegions.returns([]);

            const result = schemaReadiness.isReady();

            expect(result).toEqual({ ready: false });
        });
    });

    describe('configure', () => {
        it('should subscribe to profile settings changes', () => {
            schemaReadiness.configure(mockSettingsManager);

            expect(mockSettingsManager.subscribe.calledWith('profile')).toBe(true);
        });

        it('should update settings when profile changes', () => {
            const newSettings = { ...DefaultSettings.profile, region: AwsRegion.EU_WEST_1 };
            mockSchemaStore.getPublicSchemaRegions.returns([AwsRegion.EU_WEST_1]);

            schemaReadiness.configure(mockSettingsManager);
            const callback = mockSettingsManager.subscribe.getCall(0).args[1];
            callback(newSettings);

            const result = schemaReadiness.isReady();
            expect(result).toEqual({ ready: true });
        });

        it('should unsubscribe existing subscription before creating new one', () => {
            const mockUnsubscribe = { unsubscribe: vi.fn(), isActive: vi.fn().mockReturnValue(true) };
            mockSettingsManager.subscribe.returns(mockUnsubscribe);

            schemaReadiness.configure(mockSettingsManager);
            schemaReadiness.configure(mockSettingsManager);

            expect(mockUnsubscribe.unsubscribe).toHaveBeenCalled();
        });
    });
});
