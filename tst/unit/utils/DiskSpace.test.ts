import { join } from 'path';
import { describe, expect, it } from 'vitest';
import { diskUsage, isOutOfDiskError } from '../../../src/utils/DiskSpace';

describe('isOutOfDiskError', () => {
    it('should detect a Node filesystem error carrying the ENOSPC code', () => {
        const error = Object.assign(new Error('write failed'), { code: 'ENOSPC' });

        expect(isOutOfDiskError(error)).toBe(true);
    });

    it('should detect the LMDB write-thread message, which carries no errno', () => {
        const error = new Error(
            'No space left on device: Attempting to write page at position 191807488, size 11976704',
        );

        expect(isOutOfDiskError(error)).toBe(true);
    });

    it('should detect the message regardless of casing', () => {
        expect(isOutOfDiskError(new Error('ENOSPC: no space left on device, write'))).toBe(true);
        expect(isOutOfDiskError(new Error('Disk Full while flushing'))).toBe(true);
    });

    it('should not classify an unrelated store failure as out of disk', () => {
        expect(isOutOfDiskError(new Error('MDB_BAD_TXN: Transaction must abort'))).toBe(false);
        expect(isOutOfDiskError(Object.assign(new Error('denied'), { code: 'EACCES' }))).toBe(false);
    });

    it('should not throw for absent or non-error values', () => {
        expect(isOutOfDiskError(undefined)).toBe(false);
        expect(isOutOfDiskError(null)).toBe(false);
        expect(isOutOfDiskError('ENOSPC')).toBe(true);
        expect(isOutOfDiskError(42)).toBe(false);
    });
});

describe('diskUsage', () => {
    it('should report available and total bytes for an existing directory', () => {
        const usage = diskUsage(process.cwd());

        expect(usage).toBeDefined();
        expect(usage!.totalBytes).toBeGreaterThan(0);
        expect(usage!.availableBytes).toBeGreaterThanOrEqual(0);
        expect(usage!.availableBytes).toBeLessThanOrEqual(usage!.totalBytes);
    });

    it('should report available percent consistent with the byte counts', () => {
        const usage = diskUsage(process.cwd())!;

        expect(usage.availablePercent).toBeCloseTo((usage.availableBytes / usage.totalBytes) * 100, 6);
        expect(usage.availablePercent).toBeGreaterThanOrEqual(0);
        expect(usage.availablePercent).toBeLessThanOrEqual(100);
    });

    it('should return undefined for a path that cannot be measured rather than throwing', () => {
        expect(diskUsage(join(process.cwd(), 'no-such-directory-for-disk-usage'))).toBeUndefined();
    });
});
