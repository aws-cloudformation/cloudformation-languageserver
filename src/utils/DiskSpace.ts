import { statfsSync } from 'fs';
import { extractErrorCode, extractErrorMessage } from './errors/ErrorUtils';

const NoSpaceErrorCode = 'ENOSPC';
const NoSpaceMessageFragments = [NoSpaceErrorCode, 'no space left on device', 'disk full'];

export function isOutOfDiskError(error: unknown): boolean {
    if (error === undefined || error === null) {
        return false;
    }

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
