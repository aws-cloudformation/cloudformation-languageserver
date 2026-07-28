import { beforeEach, describe, expect, it, vi } from 'vitest';
import { CfnInfraCore } from '../../../src/server/CfnInfraCore';
import { ExtendedInitializeParams } from '../../../src/server/InitParams';
import { TelemetryService } from '../../../src/telemetry/TelemetryService';
import { createMockComponents } from '../../utils/MockServerComponents';

/**
 * Telemetry must be flushed while the datastore is still open. `TelemetryService.close()` force-flushes
 * the metric reader, which invokes the observable gauge callbacks, and the schema-age gauges read the
 * persisted stores. Closing the datastore first turned the final sample of every session into two
 * `Database is closed` read faults.
 */
describe('CfnInfraCore shutdown order', () => {
    let closeOrder: string[];
    let core: CfnInfraCore;

    function recordingCloseable(name: string) {
        return {
            close: () => {
                closeOrder.push(name);
                return Promise.resolve();
            },
        };
    }

    beforeEach(() => {
        closeOrder = [];
        vi.spyOn(TelemetryService.instance, 'close').mockImplementation(() => {
            closeOrder.push('telemetry');
            return Promise.resolve();
        });

        const components = createMockComponents();
        core = new CfnInfraCore(components.lsp, {} as ExtendedInitializeParams, {
            featureFlags: recordingCloseable('featureFlags') as unknown as CfnInfraCore['featureFlags'],
            dataStoreFactory: recordingCloseable('dataStore') as unknown as CfnInfraCore['dataStoreFactory'],
            documentManager: recordingCloseable('documentManager') as unknown as CfnInfraCore['documentManager'],
        });
    });

    it('should flush telemetry before closing the datastore', async () => {
        await core.close();

        expect(closeOrder.indexOf('telemetry')).toBeLessThan(closeOrder.indexOf('dataStore'));
    });

    it('should close every registered component', async () => {
        await core.close();

        expect(closeOrder).toEqual(['documentManager', 'featureFlags', 'telemetry', 'dataStore']);
    });
});
