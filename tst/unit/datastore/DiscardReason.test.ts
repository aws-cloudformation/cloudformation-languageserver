import { describe, expect, it } from 'vitest';
import { DiscardReason, discardReason, StoreOperation } from '../../../src/datastore/Utils';
import { LMDBCrashError } from '../../../src/utils/errors/ErrorClasses';

/**
 * `discardReason` is the only signal explaining why a cached store was thrown away, so an
 * inaccurate answer is worse than no answer: it would make the corruption metric confirm whatever
 * it was pointed at. Every message below is the real wording of the failure it stands for —
 * LMDB names come from the shipped native module, crypto codes from Node's AES-GCM implementation,
 * and the msgpack strings from msgpackr.
 */
describe('discardReason', () => {
    describe('environmental failures', () => {
        it('should report a full filesystem as out of disk rather than corruption', () => {
            const error = Object.assign(new Error('ENOSPC: no space left on device, write'), { code: 'ENOSPC' });

            expect(discardReason(error)).toBe(DiscardReason.OutOfDisk);
        });

        it('should see out of disk through the opaque lmdb commit wrapper', () => {
            // lmdb-js reports write-thread failures with the errno only on the cause, never in the
            // outer message, so classifying the outermost error alone reports Unknown.
            const cause = new Error(
                'No space left on device: Attempting to write page at position 191807488, size 11976704',
            );
            const error = new Error('Commit failed (see commitError for details)', { cause });

            expect(discardReason(error)).toBe(DiscardReason.OutOfDisk);
        });

        it('should report a permission failure as inaccessible', () => {
            const error = Object.assign(new Error('EACCES: permission denied'), { code: 'EACCES' });

            expect(discardReason(error)).toBe(DiscardReason.Inaccessible);
        });

        it('should report a read-only filesystem as inaccessible', () => {
            const error = Object.assign(new Error('EROFS: read-only file system'), { code: 'EROFS' });

            expect(discardReason(error)).toBe(DiscardReason.Inaccessible);
        });

        it('should prefer out of disk over inaccessible when both appear in the chain', () => {
            const cause = Object.assign(new Error('ENOSPC: no space left on device'), { code: 'ENOSPC' });
            const error = Object.assign(new Error('EBUSY: resource busy'), { code: 'EBUSY', cause });

            expect(discardReason(error)).toBe(DiscardReason.OutOfDisk);
        });
    });

    describe('precautionary wipes', () => {
        it('should report a prior startup crash as its own reason, not corruption', () => {
            // The data was discarded as a precaution, and nothing was found to be wrong with it.
            expect(discardReason(new LMDBCrashError())).toBe(DiscardReason.PriorCrash);
        });

        it('should not classify an unrelated error carrying the same wording as a prior crash', () => {
            expect(discardReason(new Error('MDB_CORRUPTED: Located page was wrong type'))).toBe(
                DiscardReason.Corrupted,
            );
        });
    });

    describe('encryption and integrity', () => {
        it('should report an LMDB environment key mismatch as a key mismatch', () => {
            expect(discardReason(new Error('MDB_ENV_ENCRYPTION: Environment encryption mismatch'))).toBe(
                DiscardReason.KeyMismatch,
            );
        });

        it('should report an LMDB page decryption failure as a decryption failure', () => {
            expect(discardReason(new Error('MDB_CRYPTO_FAIL: Page encryption or decryption failed'))).toBe(
                DiscardReason.DecryptionFailed,
            );
        });

        it('should report an LMDB checksum mismatch as an integrity failure', () => {
            expect(discardReason(new Error('MDB_BAD_CHECKSUM: Page checksum mismatch'))).toBe(
                DiscardReason.IntegrityCheckFailed,
            );
        });

        it('should report a failed AES-GCM tag check as an integrity failure', () => {
            // What a value written under a different machine key produces. Node supplies no code
            // here, and a wrong key is indistinguishable from damaged bytes.
            expect(discardReason(new Error('Unsupported state or unable to authenticate data'))).toBe(
                DiscardReason.IntegrityCheckFailed,
            );
        });

        it('should report a key the cipher rejects as a decryption failure', () => {
            const error = Object.assign(new Error('Invalid key length'), { code: 'ERR_CRYPTO_INVALID_KEYLEN' });

            expect(discardReason(error)).toBe(DiscardReason.DecryptionFailed);
        });
    });

    describe('truncation', () => {
        it('should report a buffer too short to hold an IV as truncated', () => {
            const error = Object.assign(new TypeError('Invalid initialization vector'), {
                code: 'ERR_CRYPTO_INVALID_IV',
            });

            expect(discardReason(error)).toBe(DiscardReason.Truncated);
        });

        it('should report a buffer too short to hold an auth tag as truncated', () => {
            const error = Object.assign(new TypeError('Invalid authentication tag length: 0'), {
                code: 'ERR_CRYPTO_INVALID_AUTH_TAG',
            });

            expect(discardReason(error)).toBe(DiscardReason.Truncated);
        });

        it('should report a short msgpack payload as truncated', () => {
            expect(discardReason(new Error('Unexpected end of MessagePack data'))).toBe(DiscardReason.Truncated);
        });
    });

    describe('unparseable payloads', () => {
        it('should report trailing junk after a valid msgpack prefix as malformed', () => {
            expect(discardReason(new Error('Data read, but end of buffer not reached 19'))).toBe(
                DiscardReason.MalformedContent,
            );
        });

        it('should report a JSON parse failure as malformed', () => {
            let thrown: unknown;
            try {
                JSON.parse('{oops');
            } catch (error) {
                thrown = error;
            }

            expect(discardReason(thrown)).toBe(DiscardReason.MalformedContent);
        });

        it('should report a SyntaxError that lost its prototype as malformed', () => {
            // Errors that crossed a module realm keep the name but fail `instanceof`.
            expect(discardReason({ name: 'SyntaxError', message: 'Unexpected end of JSON input' })).toBe(
                DiscardReason.MalformedContent,
            );
        });
    });

    describe('format and structure', () => {
        it('should report a file that is not an LMDB database as an invalid format', () => {
            expect(discardReason(new Error('MDB_INVALID: File is not an LMDB file'))).toBe(DiscardReason.FormatInvalid);
        });

        it('should report an LMDB version mismatch as an invalid format', () => {
            expect(discardReason(new Error('MDB_VERSION_MISMATCH: Database environment version mismatch'))).toBe(
                DiscardReason.FormatInvalid,
            );
        });

        it.each([
            'MDB_CORRUPTED: Located page was wrong type',
            'MDB_PAGE_NOTFOUND: Requested page not found',
            'MDB_PANIC: Update of meta page failed or environment had fatal error',
            'MDB_PROBLEM: Unexpected problem - txn should abort',
        ])('should report %s as corruption', (message) => {
            expect(discardReason(new Error(message))).toBe(DiscardReason.Corrupted);
        });
    });

    describe('capacity limits', () => {
        it.each([
            'MDB_MAP_FULL: Environment mapsize limit reached',
            'MDB_MAP_RESIZED: Database contents grew beyond environment mapsize',
            'MDB_READERS_FULL: Environment maxreaders limit reached',
            'MDB_TXN_FULL: Transaction has too many dirty pages - transaction too big',
            'MDB_DBS_FULL: Environment maxdbs limit reached',
        ])('should report %s as a capacity limit rather than damage', (message) => {
            expect(discardReason(new Error(message))).toBe(DiscardReason.CapacityExceeded);
        });
    });

    describe('unattributable failures', () => {
        it('should not guess at a failure it cannot attribute', () => {
            expect(discardReason(new Error('Something went wrong'))).toBe(DiscardReason.Unknown);
        });

        it('should report the bare lmdb commit wrapper as unknown when no cause was resolved', () => {
            expect(discardReason(new Error('Commit failed (see commitError for details)'))).toBe(DiscardReason.Unknown);
        });

        it('should not classify an unrelated LMDB error as a data problem', () => {
            expect(discardReason(new Error('MDB_BAD_TXN: Transaction must abort, has a child, or is invalid'))).toBe(
                DiscardReason.Unknown,
            );
        });

        it.each([undefined, null, 'a string', 42, {}])('should not throw for %s', (value) => {
            expect(discardReason(value)).toBe(DiscardReason.Unknown);
        });
    });

    describe('cause chains', () => {
        it('should classify a reason nested several levels down', () => {
            const root = new Error('MDB_CORRUPTED: Located page was wrong type');
            const middle = new Error('recovery failed', { cause: root });
            const outer = new Error('startup failed', { cause: middle });

            expect(discardReason(outer)).toBe(DiscardReason.Corrupted);
        });

        it('should prefer the outermost link that can be attributed', () => {
            const cause = new Error('MDB_CORRUPTED: Located page was wrong type');
            const error = new Error('MDB_INVALID: File is not an LMDB file', { cause });

            expect(discardReason(error)).toBe(DiscardReason.FormatInvalid);
        });

        it('should terminate on a cyclic cause chain', () => {
            const first = new Error('first') as Error & { cause?: unknown };
            const second = new Error('second') as Error & { cause?: unknown };
            first.cause = second;
            second.cause = first;

            expect(discardReason(first)).toBe(DiscardReason.Unknown);
        });

        it('should ignore an unresolved promise-valued commitError', () => {
            // A pending promise carries no synchronously readable message.
            const error = Object.assign(new Error('Commit failed (see commitError for details)'), {
                commitError: Promise.reject(new Error('MDB_CORRUPTED: Located page was wrong type')).catch(
                    () => undefined,
                ),
            });

            expect(discardReason(error)).toBe(DiscardReason.Unknown);
        });

        it('should read a resolved Error-valued commitError', () => {
            const error = Object.assign(new Error('Commit failed (see commitError for details)'), {
                commitError: new Error('ENOSPC: no space left on device'),
            });

            expect(discardReason(error)).toBe(DiscardReason.OutOfDisk);
        });
    });
});

describe('StoreOperation', () => {
    it('should name every metric suffix after the operation it measures', () => {
        // The values become metric name segments, so a rename silently breaks dashboards.
        expect(Object.values(StoreOperation)).toEqual([
            'constructor',
            'get',
            'put',
            'remove',
            'clear',
            'keys',
            'stats',
        ]);
    });
});
