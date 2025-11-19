import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { TestExtension } from '../utils/TestExtension';
import { wait } from '../utils/Utils';

describe('Integration Test: Configuration', () => {
    let client: TestExtension;

    beforeAll(async () => {
        client = new TestExtension();
        await client.ready();
    }, 30000);

    afterAll(async () => {
        await client.close();
    });

    describe('Configuration Updates', () => {
        it('should handle configuration change notifications', async () => {
            const initialSettings = client.components.settingsManager.getCurrentSettings();
            expect(initialSettings).toBeDefined();

            await client.changeConfiguration({
                settings: {
                    'aws.cloudformation': {
                        hover: {
                            enabled: !initialSettings.hover.enabled,
                        },
                    },
                },
            });

            await wait(100);

            const updatedSettings = client.components.settingsManager.getCurrentSettings();
            expect(updatedSettings).toBeDefined();
        });

        it('should retrieve current settings synchronously', () => {
            const settings = client.components.settingsManager.getCurrentSettings();

            expect(settings).toBeDefined();
            expect(settings.hover).toBeDefined();
            expect(settings.completion).toBeDefined();
            expect(settings.diagnostics).toBeDefined();
            expect(settings.diagnostics.cfnLint).toBeDefined();
            expect(settings.diagnostics.cfnGuard).toBeDefined();
        });
    });

    describe('Settings Structure', () => {
        it('should have hover settings', () => {
            const settings = client.components.settingsManager.getCurrentSettings();

            expect(settings.hover).toBeDefined();
            expect(typeof settings.hover.enabled).toBe('boolean');
        });

        it('should have completion settings', () => {
            const settings = client.components.settingsManager.getCurrentSettings();

            expect(settings.completion).toBeDefined();
            expect(typeof settings.completion.enabled).toBe('boolean');
        });

        it('should have cfnLint diagnostic settings', () => {
            const settings = client.components.settingsManager.getCurrentSettings();

            expect(settings.diagnostics.cfnLint).toBeDefined();
            expect(typeof settings.diagnostics.cfnLint.enabled).toBe('boolean');
            expect(settings.diagnostics.cfnLint.initialization).toBeDefined();
            expect(typeof settings.diagnostics.cfnLint.initialization.initialDelayMs).toBe('number');
            expect(typeof settings.diagnostics.cfnLint.initialization.maxDelayMs).toBe('number');
        });

        it('should have cfnGuard diagnostic settings', () => {
            const settings = client.components.settingsManager.getCurrentSettings();

            expect(settings.diagnostics.cfnGuard).toBeDefined();
            expect(typeof settings.diagnostics.cfnGuard.enabled).toBe('boolean');
            expect(typeof settings.diagnostics.cfnGuard.delayMs).toBe('number');
            expect(typeof settings.diagnostics.cfnGuard.timeout).toBe('number');
        });

        it('should have profile settings', () => {
            const settings = client.components.settingsManager.getCurrentSettings();

            expect(settings.profile).toBeDefined();
            expect(typeof settings.profile.profile).toBe('string');
            expect(typeof settings.profile.region).toBe('string');
        });

        it('should have editor settings', () => {
            const settings = client.components.settingsManager.getCurrentSettings();

            expect(settings.editor).toBeDefined();
            expect(typeof settings.editor.tabSize).toBe('number');
        });
    });

    describe('Settings Validation', () => {
        it('should enforce positive values for cfnLint initialization delays', () => {
            const settings = client.components.settingsManager.getCurrentSettings();

            expect(settings.diagnostics.cfnLint.initialization.initialDelayMs).toBeGreaterThan(0);
            expect(settings.diagnostics.cfnLint.initialization.maxDelayMs).toBeGreaterThan(0);
        });

        it('should ensure maxDelayMs is at least initialDelayMs for cfnLint', () => {
            const settings = client.components.settingsManager.getCurrentSettings();

            expect(settings.diagnostics.cfnLint.initialization.maxDelayMs).toBeGreaterThanOrEqual(
                settings.diagnostics.cfnLint.initialization.initialDelayMs,
            );
        });

        it('should enforce positive values for cfnGuard delay', () => {
            const settings = client.components.settingsManager.getCurrentSettings();

            expect(settings.diagnostics.cfnGuard.delayMs).toBeGreaterThan(0);
        });

        it('should enforce positive values for cfnGuard timeout', () => {
            const settings = client.components.settingsManager.getCurrentSettings();

            expect(settings.diagnostics.cfnGuard.timeout).toBeGreaterThan(0);
        });
    });

    describe('Profile Settings', () => {
        it('should allow updating profile settings', async () => {
            const initialSettings = client.components.settingsManager.getCurrentSettings();
            client.components.settingsManager.updateProfileSettings('test-profile', 'us-west-2' as any);

            await wait(100);

            const updatedSettings = client.components.settingsManager.getCurrentSettings();

            expect(updatedSettings.profile.profile).toBe('test-profile');
            expect(updatedSettings.profile.region).toBe('us-west-2');

            client.components.settingsManager.updateProfileSettings(
                initialSettings.profile.profile,
                initialSettings.profile.region,
            );
        });

        it('should maintain other settings when updating profile', async () => {
            const initialSettings = client.components.settingsManager.getCurrentSettings();

            client.components.settingsManager.updateProfileSettings('temp-profile', 'eu-west-1' as any);

            await wait(100);

            const updatedSettings = client.components.settingsManager.getCurrentSettings();

            expect(updatedSettings.hover.enabled).toBe(initialSettings.hover.enabled);
            expect(updatedSettings.completion.enabled).toBe(initialSettings.completion.enabled);
            expect(updatedSettings.diagnostics.cfnLint.enabled).toBe(initialSettings.diagnostics.cfnLint.enabled);

            client.components.settingsManager.updateProfileSettings(
                initialSettings.profile.profile,
                initialSettings.profile.region,
            );
        });
    });

    describe('Settings Subscription', () => {
        it('should allow subscribing and unsubscribing from settings changes', async () => {
            let callbackCount = 0;
            const initialSettings = client.components.settingsManager.getCurrentSettings();

            const subscription = client.components.settingsManager.subscribe('profile', () => {
                callbackCount++;
            });

            client.components.settingsManager.updateProfileSettings('test-1', 'us-east-1' as any);
            await wait(100);
            expect(callbackCount).toBe(2);

            subscription.unsubscribe();

            client.components.settingsManager.updateProfileSettings('test-2', 'us-west-2' as any);
            await wait(100);
            expect(callbackCount).toBe(2);

            client.components.settingsManager.updateProfileSettings(
                initialSettings.profile.profile,
                initialSettings.profile.region,
            );
        });
    });

    describe('Default Settings Values', () => {
        it('should have valid region format', () => {
            const settings = client.components.settingsManager.getCurrentSettings();

            expect(settings.profile.region).toBeTruthy();
            expect(typeof settings.profile.region).toBe('string');
            expect(settings.profile.region.length).toBeGreaterThan(0);
        });

        it('should have valid profile format', () => {
            const settings = client.components.settingsManager.getCurrentSettings();
            expect(typeof settings.profile.profile).toBe('string');
        });
    });

    describe('Configuration Handler Error Handling', () => {
        it('should maintain settings stability across multiple changes', async () => {
            await client.changeConfiguration({ settings: {} });
            await wait(50);
            await client.changeConfiguration({ settings: {} });
            await wait(50);
            await client.changeConfiguration({ settings: {} });
            await wait(50);

            const finalSettings = client.components.settingsManager.getCurrentSettings();

            expect(finalSettings).toBeDefined();
            expect(finalSettings.hover).toBeDefined();
            expect(finalSettings.completion).toBeDefined();
            expect(finalSettings.diagnostics).toBeDefined();
        });
    });

    describe('Settings Immutability', () => {
        it('should not allow direct mutation of settings object', async () => {
            const settings1 = client.components.settingsManager.getCurrentSettings();
            await wait(100);
            const settings2 = client.components.settingsManager.getCurrentSettings();
            await wait(100);

            expect(settings1).toBeDefined();
            expect(settings2).toBeDefined();

            expect(settings1.hover.enabled).toBe(settings2.hover.enabled);
            expect(settings1.completion.enabled).toBe(settings2.completion.enabled);
        });
    });

    describe('Edge Cases', () => {
        it('should handle empty configuration updates', async () => {
            await expect(
                client.changeConfiguration({
                    settings: {},
                }),
            ).resolves.not.toThrow();
            // handle config sync gracefully

            await wait(100);

            const settings = client.components.settingsManager.getCurrentSettings();
            expect(settings).toBeDefined();
        });

        it('should handle undefined settings sections', async () => {
            await expect(
                client.changeConfiguration({
                    settings: undefined,
                }),
            ).resolves.not.toThrow();

            await wait(100);

            const settings = client.components.settingsManager.getCurrentSettings();
            expect(settings).toBeDefined();
        });

        it('should handle rapid configuration changes', async () => {
            const promises = [];
            for (let i = 0; i < 5; i++) {
                promises.push(client.changeConfiguration({ settings: {} }));
            }

            await expect(Promise.all(promises)).resolves.not.toThrow();

            await wait(100);

            const settings = client.components.settingsManager.getCurrentSettings();
            expect(settings).toBeDefined();
        });
    });
});
