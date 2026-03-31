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
            mockComponents.cfnLintService.getReadinessStatus.returns({ ready: true });
            mockComponents.guardService.getReadinessStatus.returns({ ready: true });
            mockComponents.settingsManager.getCurrentSettings.returns(DefaultSettings);
            mockComponents.settingsManager.isSettingsUpdateInProgress.returns(false);

            const handler = getSystemStatusHandler(mockComponents);

            const result = handler(undefined, CancellationToken.None);

            expect(result).toEqual({
                schemasReady: {
                    ready: true,
                    availableRegions,
                    totalRegions: 2,
                },
                cfnLintReady: { ready: true },
                cfnGuardReady: { ready: true },
                currentSettings: DefaultSettings,
            });
        });

        it('should return reasons when components not ready', () => {
            mockComponents.schemaStore.getPublicSchemaRegions.returns([]);
            mockComponents.cfnLintService.getReadinessStatus.returns({
                ready: false,
                reason: 'Status is Uninitialized',
            });
            mockComponents.guardService.getReadinessStatus.returns({ ready: false, reason: 'No rules loaded' });
            mockComponents.settingsManager.getCurrentSettings.returns(DefaultSettings);
            mockComponents.settingsManager.isSettingsUpdateInProgress.returns(false);

            const handler = getSystemStatusHandler(mockComponents);

            const result = handler(undefined, CancellationToken.None);

            expect(result).toEqual({
                schemasReady: {
                    ready: false,
                    reason: 'No schemas loaded',
                    availableRegions: [],
                    totalRegions: 0,
                },
                cfnLintReady: { ready: false, reason: 'Status is Uninitialized' },
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

        it('should return all components as not ready during settings update', () => {
            mockComponents.settingsManager.isSettingsUpdateInProgress.returns(true);
            mockComponents.settingsManager.getCurrentSettings.returns(DefaultSettings);

            const handler = getSystemStatusHandler(mockComponents);

            const result = handler(undefined, CancellationToken.None);

            expect(result).toEqual({
                schemasReady: { ready: false, reason: 'Settings updating', availableRegions: [], totalRegions: 0 },
                cfnLintReady: { ready: false, reason: 'Settings updating' },
                cfnGuardReady: { ready: false, reason: 'Settings updating' },
                currentSettings: DefaultSettings,
            });
        });
    });
});
