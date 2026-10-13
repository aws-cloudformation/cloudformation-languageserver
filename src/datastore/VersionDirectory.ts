import { closeSync, existsSync, openSync, readdirSync, rmSync, statSync, utimesSync } from 'fs';
import { basename, join } from 'path';
import { Logger } from 'pino';
import { ScopedTelemetry } from '../telemetry/ScopedTelemetry';

const VersionDirectoryPattern = /^v(\d+)$/;

export const LmdbVersionNumber = 7;
export const FileDbVersionNumber = 4;

export const HeartbeatFileName = '.heartbeat';
export const RecentUseWindowMs = 24 * 60 * 60 * 1000;

export function getLmdbRoot(storageRoot: string): string {
    return join(storageRoot, 'lmdb');
}

export function getFileDbRoot(storageRoot: string): string {
    return join(storageRoot, 'filedb');
}

export function getVersionStorageDirs(storageRoot: string): ReadonlyArray<string> {
    return readdirSync(storageRoot, { withFileTypes: true })
        .filter((entry) => entry.isDirectory() && VersionDirectoryPattern.test(entry.name))
        .map((entry) => join(storageRoot, entry.name));
}

/**
 * True only for a strict `v<number>` directory whose version is below {@link currentVersion}.
 *
 * Background cleanup runs from whichever binary happens to be executing, and an older binary must
 * never delete the store a newer binary is actively using. So this returns false for the current
 * version, any newer version, non-version names (markers, stray files, malformed names), and any
 * digit string too large to compare as a safe integer — leaving only strictly older stores eligible
 * for removal.
 */
export function isOlderVersionDirectory(directoryName: string, currentVersion: number): boolean {
    const match = VersionDirectoryPattern.exec(directoryName);
    if (match === null) {
        return false;
    }

    const version = Number(match[1]);
    if (!Number.isSafeInteger(version)) {
        return false;
    }

    return version < currentVersion;
}

/**
 * Marks {@link versionDir} as in use by a live process. A newer binary on the same machine checks this
 * before deleting an older version directory, so an older process that is still running (another IDE,
 * a window that has not restarted yet) does not lose its store underneath it.
 *
 * @returns false when the marker could not be written (for example the directory is gone)
 */
export function touchHeartbeat(versionDir: string, now = new Date()): boolean {
    const heartbeat = join(versionDir, HeartbeatFileName);
    try {
        try {
            utimesSync(heartbeat, now, now);
        } catch {
            closeSync(openSync(heartbeat, 'a'));
            utimesSync(heartbeat, now, now);
        }
        return true;
    } catch {
        return false;
    }
}

/**
 * True when the directory was used within {@link windowMs}. The heartbeat written by
 * {@link touchHeartbeat} is authoritative; the directory's own mtime is the fallback for stores written
 * by binaries that predate the heartbeat. Unreadable directories are treated as in use.
 */
export function isRecentlyUsed(versionDir: string, windowMs = RecentUseWindowMs, now = Date.now()): boolean {
    const lastUsed = Math.max(mtimeMs(join(versionDir, HeartbeatFileName)), mtimeMs(versionDir));
    return lastUsed === Number.POSITIVE_INFINITY || now - lastUsed < windowMs;
}

function mtimeMs(path: string): number {
    try {
        return statSync(path).mtimeMs;
    } catch (error) {
        return (error as NodeJS.ErrnoException).code === 'ENOENT' ? Number.NEGATIVE_INFINITY : Number.POSITIVE_INFINITY;
    }
}

export function cleanupOldStorageDirs(
    storageDir: string,
    latestVersion: number,
    telemetry: ScopedTelemetry,
    dbType: string,
    log: Logger,
    onlyDeleteOlderDirs = true,
) {
    if (!existsSync(storageDir)) {
        return;
    }

    const directories = getVersionStorageDirs(storageDir);
    for (const versionDir of directories) {
        try {
            const directoryName = basename(versionDir);
            if (onlyDeleteOlderDirs && !isOlderVersionDirectory(directoryName, latestVersion)) {
                telemetry.count(`${dbType}.oldVersion.cleanup.skipped`, 1);
                continue;
            }

            if (isRecentlyUsed(versionDir)) {
                telemetry.count(`${dbType}.oldVersion.cleanup.skipped`, 1);
                continue;
            }

            telemetry.count(`${dbType}.oldVersion.cleanup.count`, 1);
            rmSync(versionDir, { recursive: true, force: true });
        } catch (error) {
            log.error(error, `Failed to cleanup old ${dbType} storage versions`);
            telemetry.count(`${dbType}.oldVersion.cleanup.error`, 1);
        }
    }
}
