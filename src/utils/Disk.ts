import { statfsSync } from 'fs';
import { errorCauseChain, extractErrorCode, extractErrorMessage } from './errors/ErrorUtils';

const NoSpaceErrorCode = 'ENOSPC';
const NoSpaceMessageFragments = [NoSpaceErrorCode, 'no space left on device', 'disk full'];

const InaccessibleErrorCodes = new Set([
    'EACCES', // Permission denied
    'EPERM', // Operation not permitted
    'EROFS', // Read-only filesystem
    'EBUSY', // Resource busy or locked
    'EMFILE', // Per-process file descriptor limit reached
    'ENFILE', // System-wide file descriptor limit reached
    'ENOTDIR', // A path component is not a directory
    'EIO', // Low-level I/O error
]);

export function isOutOfDiskError(error: unknown): boolean {
    return errorCauseChain(error).some((link) => isOutOfDiskLink(link));
}

export function isInaccessibleError(error: unknown): boolean {
    return errorCauseChain(error).some((link) => {
        const code = extractErrorCode(link);
        return code !== undefined && InaccessibleErrorCodes.has(code);
    });
}

function isOutOfDiskLink(error: unknown): boolean {
    if (extractErrorCode(error) === NoSpaceErrorCode) {
        return true;
    }

    const message = extractErrorMessage(error).toLowerCase();
    return NoSpaceMessageFragments.some((fragment) => message.includes(fragment.toLowerCase()));
}

export type DiskUsage = {
    readonly availableBytes: number;
    readonly totalBytes: number;
    readonly availablePercent: number;
};

/**
 * Free space on the filesystem backing `path`, or `undefined` when the platform or filesystem
 * does not support `statfs` — callers skip the metric rather than fault on an unsupported mount.
 */
export function diskUsage(path: string): DiskUsage | undefined {
    let stats;
    try {
        stats = statfsSync(path);
    } catch {
        return undefined;
    }

    const totalBytes = stats.blocks * stats.bsize;
    if (totalBytes <= 0) {
        return undefined;
    }

    // `bavail` excludes blocks reserved for privileged users, so it reflects what we can write.
    const availableBytes = stats.bavail * stats.bsize;
    return { availableBytes, totalBytes, availablePercent: (availableBytes / totalBytes) * 100 };
}
