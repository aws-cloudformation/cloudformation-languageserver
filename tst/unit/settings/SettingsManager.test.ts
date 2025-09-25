import { describe, expect, test, beforeEach, vi } from 'vitest';
import { SettingsManager } from '../../../src/settings/SettingsManager';
import { AwsRegion } from '../../../src/utils/Region';
import { mockViClientMessage, createMockLspWorkspace } from '../../utils/MockServerComponents';

describe('SettingsManager', () => {
    let manager: SettingsManager;
    const mockLogger = mockViClientMessage();
    const mockWorkspace = createMockLspWorkspace();

    beforeEach(() => {
        vi.clearAllMocks();
        manager = new SettingsManager(mockWorkspace, mockLogger);
    });

    describe('syncConfiguration', () => {
        test('should sync configuration from LSP workspace', async () => {
            const mockConfig = {
                profile: {
                    region: 'us-west-2',
                    profile: 'test-profile',
                },
                hover: { enabled: false },
                completion: { enabled: true },
                diagnostics: {
                    cfnLint: {
                        enabled: false,
                        delayMs: 1000,
                        lintOnChange: true,
                    },
                    cfnGuard: {
                        enabled: true,
                        delayMs: 2000,
                        validateOnChange: false,
                        enabledRulePacks: ['test-pack'],
                        timeout: 45000,
                    },
                },
                telemetry: { enabled: true, logLevel: 'debug' },
            };

            mockWorkspace.getConfiguration.resolves(mockConfig);

            await manager.syncConfiguration();

            const settings = manager.getCurrentSettings();
            expect(settings.profile.region).toBe(AwsRegion.US_WEST_2);
            expect(settings.profile.profile).toBe('test-profile');
            expect(settings.hover.enabled).toBe(false);
            expect(settings.completion.enabled).toBe(true);
            expect(settings.diagnostics.cfnLint.enabled).toBe(false);
            expect(settings.diagnostics.cfnGuard.enabled).toBe(true);
            expect(settings.diagnostics.cfnGuard.delayMs).toBe(2000);
            expect(settings.diagnostics.cfnGuard.validateOnChange).toBe(false);
            expect(settings.diagnostics.cfnGuard.enabledRulePacks).toEqual(['test-pack']);
            expect(settings.diagnostics.cfnGuard.timeout).toBe(45000);
            expect(settings.telemetry.enabled).toBe(true);
            expect(settings.telemetry.logLevel).toBe('debug');
        });

        test('should handle LSP workspace errors gracefully', async () => {
            mockWorkspace.getConfiguration.rejects(new Error('LSP error'));

            await manager.syncConfiguration();

            const settings = manager.getCurrentSettings();
            expect(settings.profile.region).toBe(AwsRegion.US_EAST_1);
            expect(settings.hover.enabled).toBe(true);
            expect(settings.telemetry.enabled).toBe(false);
            expect(settings.telemetry.logLevel).toBe('silent');
        });
    });

    describe('updateProfileSettings', () => {
        test('should update profile settings correctly', () => {
            manager.updateProfileSettings('test-profile', AwsRegion.US_WEST_2);

            const settings = manager.getCurrentSettings();
            expect(settings.profile.profile).toBe('test-profile');
            expect(settings.profile.region).toBe(AwsRegion.US_WEST_2);
        });
    });

    describe('validateAndUpdate', () => {
        test('should ensure maxDelayMs is at least as large as initialDelayMs', async () => {
            const config = {
                diagnostics: {
                    cfnLint: {
                        initialization: {
                            initialDelayMs: 5000,
                            maxDelayMs: 2000, // Less than initialDelayMs
                        },
                    },
                },
            };

            mockWorkspace.getConfiguration.resolves(config);
            await manager.syncConfiguration();

            const settings = manager.getCurrentSettings();
            const initSettings = settings.diagnostics.cfnLint.initialization;

            expect(initSettings.initialDelayMs).toBe(5000);
            expect(initSettings.maxDelayMs).toBe(5000); // Should be adjusted to match initialDelayMs
        });

        test('should preserve maxDelayMs when it is greater than initialDelayMs', async () => {
            const config = {
                diagnostics: {
                    cfnLint: {
                        initialization: {
                            initialDelayMs: 1000,
                            maxDelayMs: 5000, // Greater than initialDelayMs
                        },
                    },
                },
            };

            mockWorkspace.getConfiguration.resolves(config);
            await manager.syncConfiguration();

            const settings = manager.getCurrentSettings();
            const initSettings = settings.diagnostics.cfnLint.initialization;

            expect(initSettings.initialDelayMs).toBe(1000);
            expect(initSettings.maxDelayMs).toBe(5000); // Should remain unchanged
        });

        test('should preserve maxDelayMs when it equals initialDelayMs', async () => {
            const config = {
                diagnostics: {
                    cfnLint: {
                        initialization: {
                            initialDelayMs: 3000,
                            maxDelayMs: 3000, // Equal to initialDelayMs
                        },
                    },
                },
            };

            mockWorkspace.getConfiguration.resolves(config);
            await manager.syncConfiguration();

            const settings = manager.getCurrentSettings();
            const initSettings = settings.diagnostics.cfnLint.initialization;

            expect(initSettings.initialDelayMs).toBe(3000);
            expect(initSettings.maxDelayMs).toBe(3000); // Should remain unchanged
        });

        test('should handle negative maxDelayMs values', async () => {
            const config = {
                diagnostics: {
                    cfnLint: {
                        initialization: {
                            maxDelayMs: -1000, // Negative value
                        },
                    },
                },
            };

            mockWorkspace.getConfiguration.resolves(config);
            await manager.syncConfiguration();

            const settings = manager.getCurrentSettings();
            const initSettings = settings.diagnostics.cfnLint.initialization;

            expect(initSettings.maxDelayMs).toBe(30000); // Should use default value
        });

        test('should handle zero maxDelayMs values', async () => {
            const config = {
                diagnostics: {
                    cfnLint: {
                        initialization: {
                            maxDelayMs: 0, // Zero value
                        },
                    },
                },
            };

            mockWorkspace.getConfiguration.resolves(config);
            await manager.syncConfiguration();

            const settings = manager.getCurrentSettings();
            const initSettings = settings.diagnostics.cfnLint.initialization;

            expect(initSettings.maxDelayMs).toBe(30000); // Should use default value
        });

        test('should force telemetry enabled in dev/beta environments', async () => {
            const config = {
                telemetry: {
                    enabled: false, // Try to disable
                },
            };

            mockWorkspace.getConfiguration.resolves(config);
            await manager.syncConfiguration();

            const settings = manager.getCurrentSettings();
            expect(settings.telemetry.enabled).toBe(false); // Should be forced to default (false in test env)
        });

        test('should handle partial configuration updates correctly', async () => {
            const config = {
                diagnostics: {
                    cfnLint: {
                        initialization: {
                            initialDelayMs: 2000,
                            // maxDelayMs not provided, should use current value
                        },
                    },
                },
            };

            mockWorkspace.getConfiguration.resolves(config);
            await manager.syncConfiguration();

            const settings = manager.getCurrentSettings();
            const initSettings = settings.diagnostics.cfnLint.initialization;

            expect(initSettings.initialDelayMs).toBe(2000);
            expect(initSettings.maxDelayMs).toBeGreaterThanOrEqual(2000); // Should be at least as large as initialDelayMs
        });

        test('should handle invalid configuration gracefully', async () => {
            mockWorkspace.getConfiguration.rejects(new Error('Invalid config'));

            await manager.syncConfiguration();

            // Should keep default settings
            const settings = manager.getCurrentSettings();
            expect(settings.diagnostics.cfnLint.initialization.maxRetries).toBe(3);
            expect(settings.diagnostics.cfnLint.initialization.initialDelayMs).toBe(1000);
            expect(settings.diagnostics.cfnLint.initialization.maxDelayMs).toBe(30000);
        });

        test('should preserve other settings while validating delay values', async () => {
            const config = {
                diagnostics: {
                    cfnLint: {
                        initialization: {
                            maxRetries: 5,
                            initialDelayMs: 3000,
                            maxDelayMs: 1000, // Less than initialDelayMs
                            backoffMultiplier: 1.5,
                        },
                    },
                },
            };

            mockWorkspace.getConfiguration.resolves(config);
            await manager.syncConfiguration();

            const settings = manager.getCurrentSettings();
            const initSettings = settings.diagnostics.cfnLint.initialization;

            expect(initSettings.maxRetries).toBe(5);
            expect(initSettings.initialDelayMs).toBe(3000);
            expect(initSettings.maxDelayMs).toBe(3000); // Adjusted to match initialDelayMs
            expect(initSettings.backoffMultiplier).toBe(1.5);
        });

        test('should handle negative Guard delayMs values', async () => {
            const config = {
                diagnostics: {
                    cfnGuard: {
                        delayMs: -1000, // Negative value
                    },
                },
            };

            mockWorkspace.getConfiguration.resolves(config);
            await manager.syncConfiguration();

            const settings = manager.getCurrentSettings();
            expect(settings.diagnostics.cfnGuard.delayMs).toBe(1000); // Should use default value
        });

        test('should handle zero Guard delayMs values', async () => {
            const config = {
                diagnostics: {
                    cfnGuard: {
                        delayMs: 0, // Zero value
                    },
                },
            };

            mockWorkspace.getConfiguration.resolves(config);
            await manager.syncConfiguration();

            const settings = manager.getCurrentSettings();
            expect(settings.diagnostics.cfnGuard.delayMs).toBe(1000); // Should use default value
        });

        test('should handle negative Guard timeout values', async () => {
            const config = {
                diagnostics: {
                    cfnGuard: {
                        timeout: -5000, // Negative value
                    },
                },
            };

            mockWorkspace.getConfiguration.resolves(config);
            await manager.syncConfiguration();

            const settings = manager.getCurrentSettings();
            expect(settings.diagnostics.cfnGuard.timeout).toBe(30000); // Should use default value
        });

        test('should handle zero Guard timeout values', async () => {
            const config = {
                diagnostics: {
                    cfnGuard: {
                        timeout: 0, // Zero value
                    },
                },
            };

            mockWorkspace.getConfiguration.resolves(config);
            await manager.syncConfiguration();

            const settings = manager.getCurrentSettings();
            expect(settings.diagnostics.cfnGuard.timeout).toBe(30000); // Should use default value
        });

        test('should preserve valid Guard settings', async () => {
            const config = {
                diagnostics: {
                    cfnGuard: {
                        enabled: false,
                        delayMs: 5000,
                        validateOnChange: false,
                        enabledRulePacks: ['custom-pack-1', 'custom-pack-2'],
                        timeout: 60000,
                    },
                },
            };

            mockWorkspace.getConfiguration.resolves(config);
            await manager.syncConfiguration();

            const settings = manager.getCurrentSettings();
            expect(settings.diagnostics.cfnGuard.enabled).toBe(false);
            expect(settings.diagnostics.cfnGuard.delayMs).toBe(5000);
            expect(settings.diagnostics.cfnGuard.validateOnChange).toBe(false);
            expect(settings.diagnostics.cfnGuard.enabledRulePacks).toEqual(['custom-pack-1', 'custom-pack-2']);
            expect(settings.diagnostics.cfnGuard.timeout).toBe(60000);
        });
    });
});
