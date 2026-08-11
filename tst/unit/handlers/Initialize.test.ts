import { describe, expect, test, vi, beforeEach } from 'vitest';
import { initializedHandler } from '../../../src/handlers/Initialize';
import { createMockComponents } from '../../utils/MockServerComponents';
import { flushAllPromises } from '../../utils/Utils';

describe('InitializeHandler', () => {
    let mockServices: ReturnType<typeof createMockComponents>;

    beforeEach(() => {
        vi.clearAllMocks();
        mockServices = createMockComponents();
        vi.spyOn(mockServices.settingsManager, 'syncConfiguration').mockResolvedValue();
    });

    test('should sync configuration and defer cfn-lint initialization and mounting', async () => {
        const handler = initializedHandler(mockServices);

        handler();
        await flushAllPromises();

        expect(mockServices.settingsManager.syncConfiguration).toHaveBeenCalled();
        expect(mockServices.schemaRetriever.initialize.calledOnce).toBe(true);
        expect(mockServices.cfnLintService.initialize.called).toBe(false);
        expect(mockServices.cfnLintService.mountFolder.called).toBe(false);
    });
});
