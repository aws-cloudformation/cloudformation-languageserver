import { describe, expect, it } from 'vitest';
import { encryptionStrategy } from '../../../src/datastore/lmdb/Utils';

describe('LMDB encryptionStrategy', () => {
    it('should preserve the legacy key for versions 4, 5, and 6', () => {
        const v4 = encryptionStrategy(4);
        const v5 = encryptionStrategy(5);
        const v6 = encryptionStrategy(6);

        expect(v4).toBe(v5);
        expect(v5).toBe(v6);
    });

    it('should derive a deterministic current-version key', () => {
        const first = encryptionStrategy(7);
        const second = encryptionStrategy(7);

        expect(first).toHaveLength(32);
        expect(first).toBe(second);
    });

    it('should not reuse the legacy key for v7', () => {
        expect(encryptionStrategy(7)).not.toBe(encryptionStrategy(6));
    });

    it('should reject unknown versions', () => {
        expect(() => encryptionStrategy(3)).toThrow('Unknown LMDB version 3');
        expect(() => encryptionStrategy(8)).toThrow('Unknown LMDB version 8');
    });
});
