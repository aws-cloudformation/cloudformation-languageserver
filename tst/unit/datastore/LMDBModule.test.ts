import { describe, expect, it } from 'vitest';
import { checkLmdbAvailability, loadLmdbModule } from '../../../src/datastore/lmdb/LMDBModule';

/**
 * `lmdb` binds its native addon on load, so a host whose libc is older than the prebuild (or that has no
 * prebuild at all) throws on `require('lmdb')`. The probe must turn that into a verdict the datastore
 * selector can act on instead of letting the failure escape into server initialization.
 */
describe('LMDB module availability', () => {
    it('should report available when the module loads', () => {
        expect(checkLmdbAvailability(() => ({}))).toEqual({ available: true });
    });

    it('should report unavailable with the load failure as the cause', () => {
        const dlopenFailure = Object.assign(new Error("/lib64/libc.so.6: version `GLIBC_2.33' not found"), {
            code: 'ERR_DLOPEN_FAILED',
        });

        expect(
            checkLmdbAvailability(() => {
                throw dlopenFailure;
            }),
        ).toEqual({ available: false, cause: dlopenFailure });
    });

    it('should agree with the module system about whether lmdb loads on this host', async () => {
        const loadable = await import('lmdb').then(
            () => true,
            () => false,
        );

        const availability = checkLmdbAvailability();

        expect(availability.available).toBe(loadable);
        if (availability.available) {
            expect(typeof loadLmdbModule().open).toBe('function');
        } else {
            expect(availability.cause).toBeInstanceOf(Error);
        }
    });
});
