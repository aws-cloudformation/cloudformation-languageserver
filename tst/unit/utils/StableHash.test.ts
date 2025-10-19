import { v4 } from 'uuid';
import { describe, it, expect } from 'vitest';
import { stableHashCode } from '../../../src/utils/StableHash';

describe('stableHashCode', () => {
    it('should return consistent hash for same string', () => {
        const str = 'test-string';
        const hash1 = stableHashCode(str);
        const hash2 = stableHashCode(str);
        expect(hash1).toBe(hash2);
    });

    it('should produce same hash for the same string', () => {
        const str = 'eE2fDPsPIFKpGohzdZLggpG2JR7c2uQ3';
        const hash = stableHashCode(str);
        expect(hash).toBe(157918786);
    });

    it('should return unsigned 32-bit integer', () => {
        for (let i = 0; i < 1000; i++) {
            const hash = stableHashCode(v4());
            expect(hash).toBeGreaterThanOrEqual(0);
            expect(hash).toBeLessThanOrEqual(4_294_967_295);
            expect(Number.isInteger(hash)).toBe(true);
        }
    });

    it('should return different hashes for different strings', () => {
        const hash1 = stableHashCode('string1');
        const hash2 = stableHashCode('string2');
        expect(hash1).not.toBe(hash2);
    });

    it('should handle empty string', () => {
        const hash = stableHashCode('');
        expect(hash).toBe(5381);
    });

    it('should normalize unicode characters consistently', () => {
        const composed = '\u00E9'; // é (single character)
        const decomposed = '\u0065\u0301'; // e + combining acute accent
        expect(stableHashCode(composed)).toBe(stableHashCode(decomposed));
    });

    it('should handle special characters', () => {
        const hash1 = stableHashCode('!@#$%^&*()');
        const hash2 = stableHashCode('!@#$%^&*()');
        expect(hash1).toBe(hash2);
    });

    it('should handle long strings', () => {
        const longString = 'a'.repeat(100_000);
        const hash = stableHashCode(longString);
        expect(hash).toBeGreaterThanOrEqual(0);
        expect(hash).toBeLessThanOrEqual(4_294_967_295);
    });

    it('should produce different hashes for similar strings', () => {
        const hash1 = stableHashCode('hostname-feature1');
        const hash2 = stableHashCode('hostname-feature2');
        expect(hash1).not.toBe(hash2);
    });

    it('should handle numeric strings', () => {
        const hash1 = stableHashCode('12345');
        const hash2 = stableHashCode('12345');
        expect(hash1).toBe(hash2);
    });

    it('should be case sensitive', () => {
        const hash1 = stableHashCode('Test');
        const hash2 = stableHashCode('test');
        expect(hash1).not.toBe(hash2);
    });
});
