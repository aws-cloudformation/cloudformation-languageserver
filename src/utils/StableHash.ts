/* eslint-disable unicorn/prefer-math-trunc, unicorn/prefer-code-point */

/**
 * Computes a stable, deterministic hash code for a string that produces consistent
 * results across different architectures, operating systems, and machines.
 *
 * Modified version of DJB2 algorithm
 * - Formula: hash = hash * 33 + char
 *
 * Strings normalized as:
 * - Unicode normalization (NFC) ensures consistent character representation
 * - Bitwise operations (| 0) truncate to signed 32-bit integers deterministically
 * - Unsigned right shift (>>> 0) converts to unsigned 32-bit (0 to 4,294,967,295)
 *
 * @param str - Input string to hash
 * @returns Non-negative 32-bit integer hash (0 to 2^32-1)
 */
export function stableHashCode(str: string): number {
    // Normalize unicode to canonical form for consistent representation
    const normalized = str.normalize('NFC');

    // DJB2 initial seed value
    let hash = 5381;

    for (let i = 0; i < normalized.length; i++) {
        const char = normalized.charCodeAt(i);
        // DJB2: hash * 33 + char
        hash = (hash << 5) + hash + char;

        // Truncate to signed 32-bit integer for deterministic overflow handling
        hash = hash | 0;
    }

    // Convert to unsigned 32-bit integer (ensures non-negative result)
    return hash >>> 0;
}
