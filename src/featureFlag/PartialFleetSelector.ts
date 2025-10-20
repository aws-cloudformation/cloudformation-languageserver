import { stableHashCode } from '../utils/StableHash';

/**
 * Selects a percentage of fleet items for feature flag rollout using deterministic hashing.
 *
 * Uses stable hash-based selection to ensure consistent results across different machines
 * and executions. The same fleet item will always get the same selection result for a
 * given feature flag.
 */
export class PartialFleetSelector {
    constructor(
        private readonly featureFlagName: string,
        private readonly percentage: number,
    ) {
        if (percentage < 0 || percentage > 100) {
            throw new Error(`Percentage must be between 0 and 100 (${percentage} was supplied)`);
        }
    }

    /**
     * Determines if a fleet item is selected based on the configured percentage.
     *
     * Uses modulo 10,000 to support percentages with up to 2 decimal places of precision.
     * The hash is computed from the combination of fleet item and feature flag name,
     * ensuring different features have independent distributions.
     *
     * @param fleetItem - Identifier for the fleet item (e.g., hostname, instance ID)
     */
    isSelected(fleetItem: string): boolean {
        const hash = stableHashCode(`${fleetItem}-${this.featureFlagName}`);
        // Multiply by 100 to support 2 decimal places (e.g., 25.5% -> 2550 out of 10000)
        return hash % 10_000 < this.percentage * 100;
    }
}
