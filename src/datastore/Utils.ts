import { ScopedTelemetry } from '../telemetry/ScopedTelemetry';
import { DiskUsage, isInaccessibleError, isOutOfDiskError } from '../utils/Disk';
import { LMDBCrashError } from '../utils/errors/ErrorClasses';
import { errorCauseChain, extractErrorCode, extractErrorMessage } from '../utils/errors/ErrorUtils';

export const StoreMetric = {
    outOfDisk: 'enospc',
    diskAvailableBytes: 'disk.available.bytes',
    diskAvailablePercent: 'disk.available.percent',
    diskTotalBytes: 'disk.total.bytes',
    dataDiscarded: 'store.discarded',
} as const;

export enum StoreOperation {
    open = 'open',
    get = 'get',
    put = 'put',
    remove = 'remove',
    clear = 'clear',
    keys = 'keys',
    stats = 'stats',
}

export type ErrorHandler = (error: unknown, op: StoreOperation) => void | Promise<void>;

/**
 * A value was rejected by LMDB for exceeding its per-value/page size limits
 * (`MDB_BAD_VALSIZE`). This is deterministic: retrying the same write, even after env
 * recovery, fails identically, so callers should skip the generic retry/recovery path for
 * this error rather than pay for a reopen that cannot help. Checks the whole cause chain
 * since lmdb-js often wraps this behind a `Commit failed` error (see `CommitError.ts`).
 */
export function isValueTooLarge(error: unknown): boolean {
    return errorCauseChain(error).some((link) => extractErrorMessage(link).includes('MDB_BAD_VALSIZE'));
}

/** Why stored data could not be read back. Reported as a suffix on {@link StoreMetric.dataDiscarded}. */
export enum DiscardReason {
    /** Too short to hold a complete record — a write that never finished. */
    Truncated = 'truncated',
    /** The store reports that its encryption configuration does not match the key supplied. */
    KeyMismatch = 'keyMismatch',
    /** The cipher itself refused to decrypt the data. */
    DecryptionFailed = 'decryptionFailed',
    /**
     * Authenticated or checksummed data failed verification. A wrong key and corrupted bytes are
     * indistinguishable here — both AES-GCM and LMDB's page checksums report the same failure — so
     * this deliberately does not claim which occurred.
     */
    IntegrityCheckFailed = 'integrityCheckFailed',
    /** Read back intact but the payload could not be parsed. */
    MalformedContent = 'malformedContent',
    /** Not a recognisable store file, or a format version this build cannot read. */
    FormatInvalid = 'formatInvalid',
    /** The store reports structural damage to its own pages. */
    Corrupted = 'corrupted',
    /**
     * Discarded as a precaution after the previous run died during startup, not because anything was
     * found to be wrong with the data. Kept separate so a precautionary wipe never inflates the
     * corruption signal.
     */
    PriorCrash = 'priorCrash',
    /** The filesystem is full. Environmental, and says nothing about the data already stored. */
    OutOfDisk = 'outOfDisk',
    /** The filesystem refused access — permissions, read-only mount, descriptor limits. */
    Inaccessible = 'inaccessible',
    /** A store limit was reached (map size, readers, transaction size), not damage. */
    CapacityExceeded = 'capacityExceeded',
    /** Unreadable for a reason that could not be attributed. */
    Unknown = 'unknown',
}

/**
 * Node reports a buffer too short to contain the AES-GCM header via these codes, which is the only
 * unambiguous truncation signal available: once an IV and tag are present, a short file fails
 * authentication exactly like a wrong key does.
 */
const TruncationErrorCodes = new Set(['ERR_CRYPTO_INVALID_IV', 'ERR_CRYPTO_INVALID_AUTH_TAG']);

/** Node surfaces a key the cipher will not accept with these codes, before any data is touched. */
const DecryptionErrorCodes = new Set([
    'ERR_CRYPTO_INVALID_KEYLEN',
    'ERR_CRYPTO_INVALID_KEYTYPE',
    'ERR_CRYPTO_UNKNOWN_CIPHER',
]);

/**
 * LMDB prefixes every message with its symbolic error name, so matching the name is exact rather
 * than a guess at prose. Every entry below is verified present in the shipped native module
 * (`node.napi.node` under `@lmdb`); the trailing text after the colon is LMDB's own description.
 */
const LmdbReasonsByErrorName: ReadonlyArray<readonly [string, DiscardReason]> = [
    // "Environment encryption mismatch" — the env was written under a different key.
    ['MDB_ENV_ENCRYPTION', DiscardReason.KeyMismatch],
    // "Page encryption or decryption failed"
    ['MDB_CRYPTO_FAIL', DiscardReason.DecryptionFailed],
    // "Page checksum mismatch" — wrong key and damaged bytes are indistinguishable.
    ['MDB_BAD_CHECKSUM', DiscardReason.IntegrityCheckFailed],
    // "Database environment version mismatch"
    ['MDB_VERSION_MISMATCH', DiscardReason.FormatInvalid],
    // "File is not an LMDB file"
    ['MDB_INVALID', DiscardReason.FormatInvalid],
    // "Located page was wrong type"
    ['MDB_CORRUPTED', DiscardReason.Corrupted],
    // "Requested page not found"
    ['MDB_PAGE_NOTFOUND', DiscardReason.Corrupted],
    // "Update of meta page failed or environment had fatal error"
    ['MDB_PANIC', DiscardReason.Corrupted],
    // "Unexpected problem - txn should abort"
    ['MDB_PROBLEM', DiscardReason.Corrupted],
    // Limits rather than damage: map size, reader slots, dirty pages, dbi count.
    ['MDB_MAP_FULL', DiscardReason.CapacityExceeded],
    ['MDB_MAP_RESIZED', DiscardReason.CapacityExceeded],
    ['MDB_READERS_FULL', DiscardReason.CapacityExceeded],
    ['MDB_TXN_FULL', DiscardReason.CapacityExceeded],
    ['MDB_DBS_FULL', DiscardReason.CapacityExceeded],
];

/** AES-GCM reports a failed tag check with this message and no error code. */
const AuthenticationFailureFragment = 'unsupported state or unable to authenticate data';

/**
 * msgpackr (LMDB's `msgpack` encoding) distinguishes a short buffer from a well-formed prefix
 * followed by junk, so the two map to different reasons.
 */
const MsgpackTruncationFragment = 'unexpected end of messagepack data';
const MsgpackMalformedFragment = 'end of buffer not reached';

const JsonErrorName = 'SyntaxError';
const JsonFailureFragments = ['is not valid json', 'unexpected end of json input', 'in json at position'];

/**
 * Classifies why stored data could not be read back, for either store.
 *
 * Both stores are encrypted with a machine-derived key and both can fail for the same underlying
 * reasons, so they share one classifier and therefore one set of metric values.
 *
 * The whole cause chain is examined, outermost first, and the first link that can be attributed wins.
 * This matters because lmdb-js reports write-thread failures as an opaque
 * `Commit failed (see commitError for details)` wrapper and puts the real errno one hop away
 * (see `attachCommitCause`) — classifying only the outermost error would report every LMDB commit
 * failure as {@link DiscardReason.Unknown}.
 *
 * One exception to "outermost wins": {@link DiscardReason.OutOfDisk} and
 * {@link DiscardReason.Inaccessible} are searched across the *whole* remaining chain for every link, so
 * an ENOSPC nested under an `MDB_CORRUPTED` wrapper still reports as out of disk. That is deliberate —
 * an environmental failure says nothing about the stored bytes and must never be reported as
 * corruption, no matter how it was wrapped.
 *
 * Anything that still cannot be attributed is reported as {@link DiscardReason.Unknown} rather than
 * folded into a more specific bucket — over-claiming here would make the metric confirm whatever it
 * was pointed at.
 */
export function discardReason(error: unknown): DiscardReason {
    for (const link of errorCauseChain(error)) {
        const reason = classifyLink(link);
        if (reason !== undefined) {
            return reason;
        }
    }

    return DiscardReason.Unknown;
}

function classifyLink(error: unknown): DiscardReason | undefined {
    // An explicit internal sentinel, so identity beats any message matching.
    if (error instanceof LMDBCrashError) {
        return DiscardReason.PriorCrash;
    }

    // Environmental failures first: a full or unreadable disk says nothing about the stored bytes,
    // and must never be reported as corruption.
    if (isOutOfDiskError(error)) {
        return DiscardReason.OutOfDisk;
    }
    if (isInaccessibleError(error)) {
        return DiscardReason.Inaccessible;
    }

    const code = extractErrorCode(error);
    if (code !== undefined) {
        if (TruncationErrorCodes.has(code)) {
            return DiscardReason.Truncated;
        }
        if (DecryptionErrorCodes.has(code)) {
            return DiscardReason.DecryptionFailed;
        }
    }

    const message = extractErrorMessage(error);
    for (const [errorName, reason] of LmdbReasonsByErrorName) {
        if (message.includes(errorName)) {
            return reason;
        }
    }

    const lowerCased = message.toLowerCase();
    if (lowerCased.includes(AuthenticationFailureFragment)) {
        return DiscardReason.IntegrityCheckFailed;
    }

    if (lowerCased.includes(MsgpackTruncationFragment)) {
        return DiscardReason.Truncated;
    }

    if (lowerCased.includes(MsgpackMalformedFragment)) {
        return DiscardReason.MalformedContent;
    }

    if (isJsonParseFailure(error, lowerCased)) {
        return DiscardReason.MalformedContent;
    }

    return undefined;
}

function isJsonParseFailure(error: unknown, lowerCasedMessage: string): boolean {
    if (error instanceof SyntaxError) {
        return true;
    }

    if (error !== null && typeof error === 'object' && (error as { name?: unknown }).name === JsonErrorName) {
        return true;
    }

    return JsonFailureFragments.some((fragment) => lowerCasedMessage.includes(fragment));
}

/**
 * Records a write that failed because the filesystem is full. Counted separately from store faults
 * because an out-of-disk failure is neither retryable nor recoverable by the store.
 */
export function recordOutOfDiskFailure(telemetry: ScopedTelemetry, operation: StoreOperation, error: unknown) {
    if (discardReason(error) === DiscardReason.OutOfDisk) {
        telemetry.count(`${operation}.${StoreMetric.outOfDisk}`, 1);
        telemetry.error(StoreMetric.outOfDisk, error, undefined, {
            captureErrorAttributes: true,
            attributes: { operation },
        });
    }
}

export function recordDiskUsage(telemetry: ScopedTelemetry, usage: DiskUsage) {
    telemetry.histogram(StoreMetric.diskAvailableBytes, usage.availableBytes, { unit: 'By' });
    telemetry.histogram(StoreMetric.diskTotalBytes, usage.totalBytes, { unit: 'By' });
    telemetry.histogram(StoreMetric.diskAvailablePercent, usage.availablePercent, { unit: '%' });
}

export function recordDiscardedData(telemetry: ScopedTelemetry, cause: unknown) {
    const reason = discardReason(cause);
    telemetry.count(`${StoreMetric.dataDiscarded}.${reason}`, 1);
    telemetry.error(StoreMetric.dataDiscarded, cause, undefined, {
        captureErrorAttributes: true,
        attributes: { reason },
    });
}
