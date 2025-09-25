import { describe, it, expect } from 'vitest';
import { DefaultSettings } from '../../../src/settings/Settings';
import { parseSettings } from '../../../src/settings/SettingsParser';

describe('GuardSettings parsing', () => {
    describe('parseSettings with Guard configuration', () => {
        it('should parse valid Guard settings', () => {
            const input = {
                diagnostics: {
                    cfnGuard: {
                        enabled: false,
                        delayMs: 5000,
                        validateOnChange: false,
                        enabledRulePacks: ['custom-pack'],
                        timeout: 45000,
                    },
                },
            };

            const result = parseSettings(input, DefaultSettings);

            expect(result.diagnostics.cfnGuard.enabled).toBe(false);
            expect(result.diagnostics.cfnGuard.delayMs).toBe(5000);
            expect(result.diagnostics.cfnGuard.validateOnChange).toBe(false);
            expect(result.diagnostics.cfnGuard.enabledRulePacks).toEqual(['custom-pack']);
            expect(result.diagnostics.cfnGuard.timeout).toBe(45000);
        });

        it('should use default values for missing Guard settings', () => {
            const input = {
                diagnostics: {
                    cfnGuard: {
                        enabled: false,
                        // Other properties missing
                    },
                },
            };

            const result = parseSettings(input, DefaultSettings);

            expect(result.diagnostics.cfnGuard.enabled).toBe(false);
            expect(result.diagnostics.cfnGuard.delayMs).toBe(DefaultSettings.diagnostics.cfnGuard.delayMs);
            expect(result.diagnostics.cfnGuard.validateOnChange).toBe(
                DefaultSettings.diagnostics.cfnGuard.validateOnChange,
            );
            expect(result.diagnostics.cfnGuard.enabledRulePacks).toEqual(
                DefaultSettings.diagnostics.cfnGuard.enabledRulePacks,
            );
            expect(result.diagnostics.cfnGuard.timeout).toBe(DefaultSettings.diagnostics.cfnGuard.timeout);
        });

        it('should use default Guard settings when diagnostics.guard is missing', () => {
            const input = {
                diagnostics: {
                    cfnLint: {
                        enabled: false,
                    },
                    // guard section missing
                },
            };

            const result = parseSettings(input, DefaultSettings);

            expect(result.diagnostics.cfnGuard).toEqual(DefaultSettings.diagnostics.cfnGuard);
        });

        it('should handle empty enabledRulePacks array', () => {
            const input = {
                diagnostics: {
                    cfnGuard: {
                        enabledRulePacks: [],
                    },
                },
            };

            const result = parseSettings(input, DefaultSettings);

            expect(result.diagnostics.cfnGuard.enabledRulePacks).toEqual([]);
        });

        it('should handle multiple rule packs', () => {
            const input = {
                diagnostics: {
                    cfnGuard: {
                        enabledRulePacks: [
                            'cis-aws-benchmark-level-1',
                            'wa-Security-Pillar',
                            'nist-csf',
                            'custom-pack',
                        ],
                    },
                },
            };

            const result = parseSettings(input, DefaultSettings);

            expect(result.diagnostics.cfnGuard.enabledRulePacks).toEqual([
                'cis-aws-benchmark-level-1',
                'wa-Security-Pillar',
                'nist-csf',
                'custom-pack',
            ]);
        });

        it('should preserve other diagnostics settings when Guard is configured', () => {
            const input = {
                diagnostics: {
                    cfnLint: {
                        enabled: false,
                        delayMs: 1000,
                    },
                    cfnGuard: {
                        enabled: true,
                        delayMs: 2000,
                    },
                },
            };

            const result = parseSettings(input, DefaultSettings);

            expect(result.diagnostics.cfnLint.enabled).toBe(false);
            expect(result.diagnostics.cfnLint.delayMs).toBe(1000);
            expect(result.diagnostics.cfnGuard.enabled).toBe(true);
            expect(result.diagnostics.cfnGuard.delayMs).toBe(2000);
        });

        it('should handle numeric values correctly', () => {
            const input = {
                diagnostics: {
                    cfnGuard: {
                        delayMs: 10000,
                        timeout: 120000,
                    },
                },
            };

            const result = parseSettings(input, DefaultSettings);

            expect(result.diagnostics.cfnGuard.delayMs).toBe(10000);
            expect(result.diagnostics.cfnGuard.timeout).toBe(120000);
        });

        it('should handle boolean values correctly', () => {
            const input = {
                diagnostics: {
                    cfnGuard: {
                        enabled: true,
                        validateOnChange: false,
                    },
                },
            };

            const result = parseSettings(input, DefaultSettings);

            expect(result.diagnostics.cfnGuard.enabled).toBe(true);
            expect(result.diagnostics.cfnGuard.validateOnChange).toBe(false);
        });
    });
});
