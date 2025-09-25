import { GuardSettings } from '../../settings/Settings';
import { LoggerFactory } from '../../telemetry/LoggerFactory';
import { GuardRule } from './GuardEngine';

/**
 * Manages rule pack configuration and filtering for Guard validation.
 * Handles rule pack enablement based on settings and provides filtered rule lists.
 */
export class RuleConfiguration {
    private enabledPacks: Set<string> = new Set();
    private readonly log = LoggerFactory.getLogger(RuleConfiguration);

    /**
     * Update configuration from Guard settings
     * @param settings The Guard settings containing enabled rule packs
     */
    updateFromSettings(settings: GuardSettings): void {
        const previousPacks = new Set(this.enabledPacks);
        this.enabledPacks = new Set(settings.enabledRulePacks);

        // Log changes if pack configuration changed
        const added = [...this.enabledPacks].filter((pack) => !previousPacks.has(pack));
        const removed = [...previousPacks].filter((pack) => !this.enabledPacks.has(pack));

        if (added.length > 0 || removed.length > 0) {
            this.log.debug('Rule pack configuration updated');
        }
    }

    /**
     * Check if a rule pack is enabled
     * @param packName The name of the rule pack to check
     * @returns true if the pack is enabled, false otherwise
     */
    isPackEnabled(packName: string): boolean {
        return this.enabledPacks.has(packName);
    }

    /**
     * Get all enabled rule pack names
     * @returns Array of enabled rule pack names
     */
    getEnabledPackNames(): string[] {
        return [...this.enabledPacks];
    }

    /**
     * Filter rules based on enabled rule packs
     * @param allRules Array of all available rules
     * @returns Array of rules from enabled packs only
     */
    filterRulesByEnabledPacks(allRules: GuardRule[]): GuardRule[] {
        if (this.enabledPacks.size === 0) {
            this.log.debug('No rule packs enabled, returning empty rule set');
            return [];
        }

        const filteredRules = allRules.filter((rule) => this.isPackEnabled(rule.pack));

        this.log.debug(`Filtered ${allRules.length} rules to ${filteredRules.length} rules from enabled packs`);

        return filteredRules;
    }

    /**
     * Filter rule pack names based on enabled configuration
     * @param allPackNames Array of all available rule pack names
     * @returns Array of enabled rule pack names only
     */
    filterRulePackNamesByEnabled(allPackNames: string[]): string[] {
        if (this.enabledPacks.size === 0) {
            this.log.debug('No rule packs enabled, returning empty pack set');
            return [];
        }

        const filteredPacks = allPackNames.filter((packName) => this.isPackEnabled(packName));

        this.log.debug(`Filtered ${allPackNames.length} rule packs to ${filteredPacks.length} enabled packs`);

        return filteredPacks;
    }

    /**
     * Validate rule pack configuration against available packs
     * @param availablePackNames Array of all available rule pack names
     * @returns Array of validation errors (empty if valid)
     */
    validateConfiguration(availablePackNames: string[]): string[] {
        const errors: string[] = [];
        const availablePackSet = new Set(availablePackNames);

        for (const enabledPack of this.enabledPacks) {
            if (!availablePackSet.has(enabledPack)) {
                errors.push(`Rule pack '${enabledPack}' is enabled but not available`);
            }
        }

        if (errors.length > 0) {
            this.log.warn('Rule pack configuration validation failed');
        }

        return errors;
    }

    /**
     * Get statistics about the current configuration
     * @param availablePackNames Array of all available rule pack names
     * @returns Configuration statistics
     */
    getConfigurationStats(availablePackNames: string[]): {
        totalPacks: number;
        enabledPacks: number;
        invalidPacks: string[];
    } {
        const availablePackSet = new Set(availablePackNames);
        const validEnabledPacks = [...this.enabledPacks].filter((pack) => availablePackSet.has(pack));
        const invalidPacks = [...this.enabledPacks].filter((pack) => !availablePackSet.has(pack));

        return {
            totalPacks: availablePackNames.length,
            enabledPacks: validEnabledPacks.length,
            invalidPacks,
        };
    }

    /**
     * Reset configuration to empty state
     */
    reset(): void {
        this.enabledPacks.clear();
        this.log.debug('Rule configuration reset');
    }
}
