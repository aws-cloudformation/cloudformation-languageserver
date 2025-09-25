import { describe, it, expect, beforeEach, vi } from 'vitest';
import { DidChangeConfigurationParams } from 'vscode-languageserver';
import { configurationHandler } from '../../../src/handlers/ConfigurationHandler';
import { createMockComponents } from '../../utils/MockServerComponents';

describe('ConfigurationHandler', () => {
    let mockComponents: ReturnType<typeof createMockComponents>;
    let handler: (params: DidChangeConfigurationParams) => void;

    beforeEach(() => {
        mockComponents = createMockComponents();
        handler = configurationHandler(mockComponents);
    });

    describe('configuration changes', () => {
        it('should trigger component configuration on settings change', async () => {
            const params: DidChangeConfigurationParams = {
                settings: {
                    cfn: {
                        features: {
                            hover: false,
                            completion: true,
                            diagnostics: false,
                        },
                    },
                },
            };

            // Mock the syncConfiguration method
            const syncConfigSpy = vi.spyOn(mockComponents.settingsManager, 'syncConfiguration').mockResolvedValue();

            handler(params);

            // Wait a bit for the async syncConfiguration call to be initiated
            await new Promise((resolve) => setTimeout(resolve, 0));

            expect(syncConfigSpy).toHaveBeenCalled();
        });

        it('should handle configuration errors gracefully', async () => {
            const params: DidChangeConfigurationParams = {
                settings: {
                    cfn: {
                        features: {
                            hover: true,
                        },
                    },
                },
            };

            // Mock syncConfiguration to throw an error
            const syncConfigSpy = vi
                .spyOn(mockComponents.settingsManager, 'syncConfiguration')
                .mockRejectedValue(new Error('Config error'));

            handler(params);

            // Wait a bit for the async syncConfiguration call and error handling
            await new Promise((resolve) => setTimeout(resolve, 10));

            expect(syncConfigSpy).toHaveBeenCalled();
        });

        it('should handle empty settings', async () => {
            const params: DidChangeConfigurationParams = {
                settings: {},
            };

            const syncConfigSpy = vi.spyOn(mockComponents.settingsManager, 'syncConfiguration').mockResolvedValue();

            handler(params);

            // Wait a bit for the async syncConfiguration call
            await new Promise((resolve) => setTimeout(resolve, 0));

            expect(syncConfigSpy).toHaveBeenCalled();
        });

        it('should handle null settings', async () => {
            const params: DidChangeConfigurationParams = {
                settings: null,
            };

            const syncConfigSpy = vi.spyOn(mockComponents.settingsManager, 'syncConfiguration').mockResolvedValue();

            handler(params);

            // Wait a bit for the async syncConfiguration call
            await new Promise((resolve) => setTimeout(resolve, 0));

            expect(syncConfigSpy).toHaveBeenCalled();
        });

        it('should handle undefined settings', async () => {
            const params: DidChangeConfigurationParams = {
                settings: undefined,
            };

            const syncConfigSpy = vi.spyOn(mockComponents.settingsManager, 'syncConfiguration').mockResolvedValue();

            handler(params);

            // Wait a bit for the async syncConfiguration call
            await new Promise((resolve) => setTimeout(resolve, 0));

            expect(syncConfigSpy).toHaveBeenCalled();
        });
    });
});
