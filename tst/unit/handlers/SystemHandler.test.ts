import { describe, it, expect, beforeEach } from 'vitest';
import { CancellationToken, ResponseError } from 'vscode-languageserver';
import { getSystemStatusHandler } from '../../../src/handlers/SystemHandler';
import { DefaultSettings } from '../../../src/settings/Settings';
import { createMockComponents } from '../../utils/MockServerComponents';

describe('SystemStatusHandler', () => {
    let mockComponents: ReturnType<typeof createMockComponents>;

    beforeEach(() => {
        mockComponents = createMockComponents();
    });

    describe('systemStatusHandler', () => {
        it('should return complete system status when all components ready', () => {
            const availableRegions = ['us-east-1', 'us-west-2'];
            mockComponents.schemaStore.getPublicSchemaRegions.returns(availableRegions);
            mockComponents.guardService.getReadinessStatus.returns({ ready: true });
            mockComponents.settingsManager.getCurrentSettings.returns(DefaultSettings);
            mockComponents.settingsManager.getReadinessStatus.returns({ ready: true });
            mockComponents.cfnLintService.getReadinessStatus.returns({ ready: true });

            const handler = getSystemStatusHandler(mockComponents);

            const result = handler(undefined, CancellationToken.None);

            expect(result).toEqual({
                settingsReady: { ready: true },
                schemasReady: {
                    ready: true,
                    availableRegions,
                },
                cfnLintReady: { ready: true },
                cfnGuardReady: { ready: true },
                currentSettings: DefaultSettings,
            });
        });

        it('should return reasons when components not ready', () => {
            mockComponents.schemaStore.getPublicSchemaRegions.returns([]);
            mockComponents.guardService.getReadinessStatus.returns({ ready: false, reason: 'No rules loaded' });
            mockComponents.settingsManager.getCurrentSettings.returns(DefaultSettings);
            mockComponents.settingsManager.getReadinessStatus.returns({ ready: true });
            mockComponents.cfnLintService.getReadinessStatus.returns({
                ready: false,
                reason: 'Service initialization failed',
            });

            const handler = getSystemStatusHandler(mockComponents);

            const result = handler(undefined, CancellationToken.None);

            expect(result).toEqual({
                settingsReady: { ready: true },
                schemasReady: {
                    ready: false,
                    reason: 'No schemas loaded',
                    availableRegions: [],
                },
                cfnLintReady: { ready: false, reason: 'Service initialization failed' },
                cfnGuardReady: { ready: false, reason: 'No rules loaded' },
                currentSettings: DefaultSettings,
            });
        });

        it('should handle errors gracefully', () => {
            const originalError = new Error('Database error');
            mockComponents.schemaStore.getPublicSchemaRegions.throws(originalError);

            const handler = getSystemStatusHandler(mockComponents);
            expect(() => handler(undefined, CancellationToken.None)).toThrow(ResponseError);
        });

        it('should return all components as not ready when settings not initialized', () => {
            mockComponents.settingsManager.getReadinessStatus.returns({
                ready: false,
                reason: 'Settings sync failed',
            });
            mockComponents.settingsManager.getCurrentSettings.returns(DefaultSettings);

            const handler = getSystemStatusHandler(mockComponents);

            const result = handler(undefined, CancellationToken.None);

            expect(result).toEqual({
                settingsReady: { ready: false, reason: 'Settings sync failed' },
                schemasReady: { ready: false, reason: 'Settings sync failed', availableRegions: [] },
                cfnLintReady: { ready: false, reason: 'Settings sync failed' },
                cfnGuardReady: { ready: false, reason: 'Settings sync failed' },
                currentSettings: DefaultSettings,
            });
        });
    });
});
