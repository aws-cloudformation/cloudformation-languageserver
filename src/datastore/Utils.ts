import { ScopedTelemetry } from '../telemetry/ScopedTelemetry';
import { DiskUsage, isOutOfDiskError } from '../utils/DiskSpace';
import { LMDBCrashError } from '../utils/errors/ErrorClasses';
import { extractErrorCode, extractErrorMessage } from '../utils/errors/ErrorUtils';

export const StoreMetric = {
    outOfDisk: 'enospc',
    diskAvailableBytes: 'disk.available.bytes',
    diskAvailablePercent: 'disk.available.percent',
    diskTotalBytes: 'disk.total.bytes',
    dataDiscarded: 'store.discarded',
} as const;

export enum StoreOperation {
    constructor = 'constructor',
    get = 'get',
    put = 'put',
    remove = 'remove',
    clear = 'clear',
    keys = 'keys',
    stats = 'stats',
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
    /** Unreadable for a reason that could not be attributed. */
    Unknown = 'unknown',
}

/**
 * Node reports a buffer too short to contain the AES-GCM header via these codes, which is the only
 * unambiguous truncation signal available: once an IV and tag are present, a short file fails
 * authentication exactly like a wrong key does.
 */
const TruncationErrorCodes = new Set(['ERR_CRYPTO_INVALID_IV', 'ERR_CRYPTO_INVALID_AUTH_TAG']);

/**
 * LMDB prefixes every message with its symbolic error name (`mdb_errstr`, mdb.c:1860), so matching the
 * name is exact rather than a guess at prose. Ordered most specific first.
 */
const LmdbReasonsByErrorName: ReadonlyArray<readonly [string, DiscardReason]> = [
    ['MDB_ENV_ENCRYPTION', DiscardReason.KeyMismatch],
    ['MDB_CRYPTO_FAIL', DiscardReason.DecryptionFailed],
    ['MDB_BAD_CHECKSUM', DiscardReason.IntegrityCheckFailed],
    ['MDB_VERSION_MISMATCH', DiscardReason.FormatInvalid],
    ['MDB_INVALID', DiscardReason.FormatInvalid],
    ['MDB_CORRUPTED', DiscardReason.Corrupted],
    ['MDB_PAGE_NOTFOUND', DiscardReason.Corrupted],
    ['MDB_PANIC', DiscardReason.Corrupted],
    ['MDB_PROBLEM', DiscardReason.Corrupted],
    ['MDB_PROBLEM', DiscardReason.Corrupted],
    [LMDBCrashError.message, DiscardReason.Corrupted],
];

/** AES-GCM reports a failed tag check with this message and no error code. */
const AuthenticationFailureFragment = 'unable to authenticate data';
const UnparseablePayloadFragment = 'is not valid json';

/**
 * Classifies why stored data could not be read back, for either store.
 *
 * Both stores are encrypted with a machine-derived key and both can fail for the same underlying
 * reasons, so they share one classifier and therefore one set of metric values. Anything that cannot
 * be attributed is reported as {@link DiscardReason.Unknown} rather than being folded into a more
 * specific bucket — over-claiming here would make the metric confirm whatever it was pointed at.
 */
function discardReason(error: unknown): DiscardReason {
    const code = extractErrorCode(error);
    if (code !== undefined && TruncationErrorCodes.has(code)) {
        return DiscardReason.Truncated;
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

    if (error instanceof SyntaxError || lowerCased.includes(UnparseablePayloadFragment)) {
        return DiscardReason.MalformedContent;
    }

    return DiscardReason.Unknown;
}

/**
 * Records a write that failed because the filesystem is full. Counted separately from store faults
 * because an out-of-disk failure is neither retryable nor recoverable by the store
 */
export function recordOutOfDiskFailure(telemetry: ScopedTelemetry, operation: StoreOperation, error: unknown) {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-explicit-any
    if (isOutOfDiskError(error) || isOutOfDiskError((error as any).cause)) {
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
