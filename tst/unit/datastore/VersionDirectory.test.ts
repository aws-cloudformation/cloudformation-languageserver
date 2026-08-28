import { describe, it, expect } from 'vitest';
import { isOlderVersionDirectory } from '../../../src/datastore/VersionDirectory';

describe('isOlderVersionDirectory', () => {
    const currentVersion = 6;

    it('should return true for a strictly older version directory', () => {
        expect(isOlderVersionDirectory('v1', currentVersion)).toBe(true);
        expect(isOlderVersionDirectory('v5', currentVersion)).toBe(true);
    });

    it('should treat v0 as an older version directory', () => {
        expect(isOlderVersionDirectory('v0', currentVersion)).toBe(true);
    });

    it('should return false for the current version directory', () => {
        expect(isOlderVersionDirectory('v6', currentVersion)).toBe(false);
    });

    it('should return false for a newer version directory', () => {
        expect(isOlderVersionDirectory('v7', currentVersion)).toBe(false);
        expect(isOlderVersionDirectory('v100', currentVersion)).toBe(false);
    });

    it('should return false for non-version directory names', () => {
        for (const name of ['markers', 'backup', 'lmdb', 'v', 'version1', 'V1', '1', '']) {
            expect(isOlderVersionDirectory(name, currentVersion)).toBe(false);
        }
    });

    it('should return false for names that only partially match the version format', () => {
        for (const name of ['v1.0', 'v-1', 'v1 ', ' v1', 'v1a', 'av1', 'v1/', 'v_1']) {
            expect(isOlderVersionDirectory(name, currentVersion)).toBe(false);
        }
    });

    it('should return false for a numeric value too large to compare as a safe integer', () => {
        const overflowing = `v${'9'.repeat(30)}`;
        expect(isOlderVersionDirectory(overflowing, currentVersion)).toBe(false);
    });
});
