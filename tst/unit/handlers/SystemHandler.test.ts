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
        it('should return system status when all components ready', () => {
            mockComponents.guardService.isReady.returns({ ready: true });
            mockComponents.settingsManager.getCurrentSettings.returns(DefaultSettings);
            mockComponents.settingsManager.isReady.returns({ ready: true });
            mockComponents.cfnLintService.isReady.returns({ ready: true });
            mockComponents.schemaReadiness.isReady.returns({ ready: true });

            const handler = getSystemStatusHandler(mockComponents);

            const result = handler(undefined, CancellationToken.None);

            expect(result).toEqual({
                settingsReady: { ready: true },
                schemasReady: { ready: true },
                cfnLintReady: { ready: true },
                cfnGuardReady: { ready: true },
                currentSettings: DefaultSettings,
            });
        });

        it('should return system status when components not ready', () => {
            mockComponents.guardService.isReady.returns({ ready: false });
            mockComponents.settingsManager.getCurrentSettings.returns(DefaultSettings);
            mockComponents.settingsManager.isReady.returns({ ready: true });
            mockComponents.cfnLintService.isReady.returns({
                ready: false,
            });
            mockComponents.schemaReadiness.isReady.returns({ ready: false });

            const handler = getSystemStatusHandler(mockComponents);

            const result = handler(undefined, CancellationToken.None);

            expect(result).toEqual({
                settingsReady: { ready: true },
                schemasReady: { ready: false },
                cfnLintReady: { ready: false },
                cfnGuardReady: { ready: false },
                currentSettings: DefaultSettings,
            });
        });

        it('should handle errors gracefully', () => {
            const originalError = new Error('Database error');
            mockComponents.settingsManager.getCurrentSettings.throws(originalError);

            const handler = getSystemStatusHandler(mockComponents);

            expect(() => handler(undefined, CancellationToken.None)).toThrow(ResponseError);
            expect(() => handler(undefined, CancellationToken.None)).toThrow('Failed to get system status');
        });
    });
});
