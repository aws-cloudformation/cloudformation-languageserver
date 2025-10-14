import { describe, it, expect } from 'vitest';
import { DefaultSettings, Settings, SettingsState } from '../../../src/settings/Settings';
import { AwsRegion } from '../../../src/utils/Region';

describe('SettingsState', () => {
    describe('constructor', () => {
        it('should initialize with default values', () => {
            expect(new SettingsState().toSettings()).toStrictEqual(DefaultSettings);
        });
    });

    describe('update', () => {
        it('should update all settings', () => {
            const settingsState = new SettingsState();
            const newSettings: Settings = {
                profile: {
                    region: AwsRegion.US_WEST_2,
                    profile: 'test-profile',
                },
                hover: { enabled: false },
                completion: {
                    enabled: false,
                    maxCompletions: 100,
                },
                diagnostics: {
                    cfnLint: {
                        enabled: false,
                        delayMs: 5000,
                        lintOnChange: false,
                        initialization: {
                            maxRetries: 3,
                            initialDelayMs: 1000,
                            maxDelayMs: 30000,
                            backoffMultiplier: 2,
                            totalTimeoutMs: 120_000,
                        },
                    },
                    cfnGuard: {
                        enabled: false,
                        delayMs: 5000,
                        validateOnChange: false,
                        enabledRulePacks: ['test-pack'],
                        timeout: 60000,
                        maxConcurrentValidations: 3,
                        maxQueueSize: 10,
                        memoryCleanupInterval: 30000,
                        maxMemoryUsage: 500 * 1024 * 1024,
                        defaultSeverity: 'warning',
                    },
                },
                editor: {
                    tabSize: 2,
                    insertSpaces: false,
                    detectIndentation: true,
                },
            };

            settingsState.update(newSettings);
            expect(settingsState.toSettings()).toStrictEqual(newSettings);
        });
    });
});
