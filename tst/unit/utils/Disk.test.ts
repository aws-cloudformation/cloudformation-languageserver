import { join } from 'path';
import { describe, expect, it } from 'vitest';
import { diskUsage, isInaccessibleError, isOutOfDiskError } from '../../../src/utils/Disk';

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

    it('should detect the numeric POSIX errno lmdb reports instead of a symbolic code', () => {
        // lmdb's native layer sets `code: 28` with no `errno` and no mention of the code in the message,
        // so detection must not depend on the message wording alone.
        expect(isOutOfDiskError(Object.assign(new Error('writing page failed'), { code: 28 }))).toBe(true);
        expect(isOutOfDiskError(Object.assign(new Error('writing page failed'), { errno: -28 }))).toBe(true);
    });

    it('should not classify an unrelated numeric code as out of disk', () => {
        expect(isOutOfDiskError(Object.assign(new Error('bad thing'), { code: 13 }))).toBe(false);
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

    it('should detect out of disk carried on the cause of an lmdb commit wrapper', () => {
        // The only place lmdb-js exposes the errno: the outer message never mentions the disk.
        const cause = Object.assign(new Error('No space left on device'), { code: 'ENOSPC' });
        const error = new Error('Commit failed (see commitError for details)', { cause });

        expect(isOutOfDiskError(error)).toBe(true);
    });

    it('should detect out of disk on an Error-valued commitError', () => {
        const error = Object.assign(new Error('Commit failed (see commitError for details)'), {
            commitError: new Error('No space left on device: Attempting to write page'),
        });

        expect(isOutOfDiskError(error)).toBe(true);
    });

    it('should detect out of disk several levels down a cause chain', () => {
        const root = Object.assign(new Error('write failed'), { code: 'ENOSPC' });
        const error = new Error('recovery failed', { cause: new Error('reopen failed', { cause: root }) });

        expect(isOutOfDiskError(error)).toBe(true);
    });

    it('should not report out of disk for a chain that never mentions space', () => {
        const error = new Error('outer', { cause: new Error('MDB_BAD_TXN: Transaction must abort') });

        expect(isOutOfDiskError(error)).toBe(false);
    });
});

describe('isInaccessibleError', () => {
    it.each(['EACCES', 'EPERM', 'EROFS', 'EBUSY', 'EMFILE', 'ENFILE', 'ENOTDIR', 'EIO'])(
        'should classify %s as inaccessible',
        (code) => {
            expect(isInaccessibleError(Object.assign(new Error('refused'), { code }))).toBe(true);
        },
    );

    it('should not classify a full filesystem as inaccessible', () => {
        expect(isInaccessibleError(Object.assign(new Error('write failed'), { code: 'ENOSPC' }))).toBe(false);
    });

    it('should not classify a missing file as inaccessible', () => {
        // A store that has not been written yet is normal, not a filesystem refusal.
        expect(isInaccessibleError(Object.assign(new Error('no such file'), { code: 'ENOENT' }))).toBe(false);
    });

    it('should detect an access failure carried on a cause', () => {
        const cause = Object.assign(new Error('permission denied'), { code: 'EACCES' });

        expect(isInaccessibleError(new Error('could not open store', { cause }))).toBe(true);
    });

    it('should not throw for absent or non-error values', () => {
        expect(isInaccessibleError(undefined)).toBe(false);
        expect(isInaccessibleError(null)).toBe(false);
        expect(isInaccessibleError('EACCES')).toBe(false);
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
