import { describe, it, expect, beforeEach } from 'vitest';
import { GuardRule } from '../../../../src/services/guard/GuardEngine';
import { RuleConfiguration } from '../../../../src/services/guard/RuleConfiguration';
import { GuardSettings, DefaultSettings } from '../../../../src/settings/Settings';

describe('RuleConfiguration', () => {
    let ruleConfiguration: RuleConfiguration;
    let mockSettings: GuardSettings;

    beforeEach(() => {
        ruleConfiguration = new RuleConfiguration();
        mockSettings = {
            ...DefaultSettings.diagnostics.cfnGuard,
            enabledRulePacks: ['pack1', 'pack2'],
        };
    });

    describe('updateFromSettings', () => {
        it('should update enabled packs from settings', () => {
            ruleConfiguration.updateFromSettings(mockSettings);

            expect(ruleConfiguration.getEnabledPackNames()).toEqual(['pack1', 'pack2']);
        });

        it('should handle empty enabled packs', () => {
            const emptySettings = {
                ...mockSettings,
                enabledRulePacks: [],
            };

            ruleConfiguration.updateFromSettings(emptySettings);

            expect(ruleConfiguration.getEnabledPackNames()).toEqual([]);
        });

        it('should replace previous configuration', () => {
            ruleConfiguration.updateFromSettings(mockSettings);
            expect(ruleConfiguration.getEnabledPackNames()).toEqual(['pack1', 'pack2']);

            const updatedSettings = {
                ...mockSettings,
                enabledRulePacks: ['pack3', 'pack4'],
            };

            ruleConfiguration.updateFromSettings(updatedSettings);
            expect(ruleConfiguration.getEnabledPackNames()).toEqual(['pack3', 'pack4']);
        });
    });

    describe('isPackEnabled', () => {
        beforeEach(() => {
            ruleConfiguration.updateFromSettings(mockSettings);
        });

        it('should return true for enabled packs', () => {
            expect(ruleConfiguration.isPackEnabled('pack1')).toBe(true);
            expect(ruleConfiguration.isPackEnabled('pack2')).toBe(true);
        });

        it('should return false for disabled packs', () => {
            expect(ruleConfiguration.isPackEnabled('pack3')).toBe(false);
            expect(ruleConfiguration.isPackEnabled('nonexistent')).toBe(false);
        });

        it('should return false when no packs are enabled', () => {
            const emptySettings = {
                ...mockSettings,
                enabledRulePacks: [],
            };

            ruleConfiguration.updateFromSettings(emptySettings);

            expect(ruleConfiguration.isPackEnabled('pack1')).toBe(false);
            expect(ruleConfiguration.isPackEnabled('pack2')).toBe(false);
        });
    });

    describe('getEnabledPackNames', () => {
        it('should return enabled pack names', () => {
            ruleConfiguration.updateFromSettings(mockSettings);

            const enabledPacks = ruleConfiguration.getEnabledPackNames();
            expect(enabledPacks).toEqual(['pack1', 'pack2']);
        });

        it('should return empty array when no packs enabled', () => {
            const emptySettings = {
                ...mockSettings,
                enabledRulePacks: [],
            };

            ruleConfiguration.updateFromSettings(emptySettings);

            const enabledPacks = ruleConfiguration.getEnabledPackNames();
            expect(enabledPacks).toEqual([]);
        });
    });

    describe('filterRulesByEnabledPacks', () => {
        const mockRules: GuardRule[] = [
            {
                name: 'rule1',
                pack: 'pack1',
                content: 'rule1 content',
                description: 'Rule 1',
                severity: 1,
                tags: ['test'],
            },
            {
                name: 'rule2',
                pack: 'pack2',
                content: 'rule2 content',
                description: 'Rule 2',
                severity: 1,
                tags: ['test'],
            },
            {
                name: 'rule3',
                pack: 'pack3',
                content: 'rule3 content',
                description: 'Rule 3',
                severity: 1,
                tags: ['test'],
            },
        ];

        beforeEach(() => {
            ruleConfiguration.updateFromSettings(mockSettings);
        });

        it('should filter rules to only include enabled packs', () => {
            const filteredRules = ruleConfiguration.filterRulesByEnabledPacks(mockRules);

            expect(filteredRules).toHaveLength(2);
            expect(filteredRules[0].pack).toBe('pack1');
            expect(filteredRules[1].pack).toBe('pack2');
        });

        it('should return empty array when no packs are enabled', () => {
            const emptySettings = {
                ...mockSettings,
                enabledRulePacks: [],
            };

            ruleConfiguration.updateFromSettings(emptySettings);

            const filteredRules = ruleConfiguration.filterRulesByEnabledPacks(mockRules);
            expect(filteredRules).toEqual([]);
        });

        it('should handle empty rules array', () => {
            const filteredRules = ruleConfiguration.filterRulesByEnabledPacks([]);
            expect(filteredRules).toEqual([]);
        });
    });

    describe('filterRulePackNamesByEnabled', () => {
        const allPackNames = ['pack1', 'pack2', 'pack3'];

        beforeEach(() => {
            ruleConfiguration.updateFromSettings(mockSettings);
        });

        it('should filter pack names to only include enabled ones', () => {
            const filteredPacks = ruleConfiguration.filterRulePackNamesByEnabled(allPackNames);

            expect(filteredPacks).toEqual(['pack1', 'pack2']);
        });

        it('should return empty array when no packs are enabled', () => {
            const emptySettings = {
                ...mockSettings,
                enabledRulePacks: [],
            };

            ruleConfiguration.updateFromSettings(emptySettings);

            const filteredPacks = ruleConfiguration.filterRulePackNamesByEnabled(allPackNames);
            expect(filteredPacks).toEqual([]);
        });

        it('should handle empty pack names array', () => {
            const filteredPacks = ruleConfiguration.filterRulePackNamesByEnabled([]);
            expect(filteredPacks).toEqual([]);
        });
    });

    describe('validateConfiguration', () => {
        const availablePackNames = ['pack1', 'pack2', 'pack3'];

        it('should return no errors for valid configuration', () => {
            ruleConfiguration.updateFromSettings(mockSettings);

            const errors = ruleConfiguration.validateConfiguration(availablePackNames);
            expect(errors).toEqual([]);
        });

        it('should return errors for invalid packs', () => {
            const invalidSettings = {
                ...mockSettings,
                enabledRulePacks: ['pack1', 'nonexistent1', 'pack2', 'nonexistent2'],
            };

            ruleConfiguration.updateFromSettings(invalidSettings);

            const errors = ruleConfiguration.validateConfiguration(availablePackNames);
            expect(errors).toHaveLength(2);
            expect(errors[0]).toContain('nonexistent1');
            expect(errors[1]).toContain('nonexistent2');
        });

        it('should return no errors when no packs are enabled', () => {
            const emptySettings = {
                ...mockSettings,
                enabledRulePacks: [],
            };

            ruleConfiguration.updateFromSettings(emptySettings);

            const errors = ruleConfiguration.validateConfiguration(availablePackNames);
            expect(errors).toEqual([]);
        });
    });

    describe('getConfigurationStats', () => {
        const availablePackNames = ['pack1', 'pack2', 'pack3'];

        it('should return correct statistics', () => {
            ruleConfiguration.updateFromSettings(mockSettings);

            const stats = ruleConfiguration.getConfigurationStats(availablePackNames);

            expect(stats.totalPacks).toBe(3);
            expect(stats.enabledPacks).toBe(2);
            expect(stats.invalidPacks).toEqual([]);
        });

        it('should identify invalid packs in statistics', () => {
            const invalidSettings = {
                ...mockSettings,
                enabledRulePacks: ['pack1', 'nonexistent', 'pack2'],
            };

            ruleConfiguration.updateFromSettings(invalidSettings);

            const stats = ruleConfiguration.getConfigurationStats(availablePackNames);

            expect(stats.totalPacks).toBe(3);
            expect(stats.enabledPacks).toBe(2);
            expect(stats.invalidPacks).toEqual(['nonexistent']);
        });

        it('should handle empty enabled packs', () => {
            const emptySettings = {
                ...mockSettings,
                enabledRulePacks: [],
            };

            ruleConfiguration.updateFromSettings(emptySettings);

            const stats = ruleConfiguration.getConfigurationStats(availablePackNames);

            expect(stats.totalPacks).toBe(3);
            expect(stats.enabledPacks).toBe(0);
            expect(stats.invalidPacks).toEqual([]);
        });
    });

    describe('reset', () => {
        it('should clear all enabled packs', () => {
            ruleConfiguration.updateFromSettings(mockSettings);
            expect(ruleConfiguration.getEnabledPackNames()).toEqual(['pack1', 'pack2']);

            ruleConfiguration.reset();

            expect(ruleConfiguration.getEnabledPackNames()).toEqual([]);
            expect(ruleConfiguration.isPackEnabled('pack1')).toBe(false);
            expect(ruleConfiguration.isPackEnabled('pack2')).toBe(false);
        });
    });
});
