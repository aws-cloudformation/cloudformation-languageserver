import { closeSync, existsSync, openSync, readdirSync, rmSync, statSync, utimesSync } from 'fs';
import { basename, join } from 'path';
import { Logger } from 'pino';
import { ScopedTelemetry } from '../telemetry/ScopedTelemetry';

const VersionDirectoryPattern = /^v(\d+)$/;

export const LmdbVersionNumber = 7;
export const FileDbVersionNumber = 4;

export const HeartbeatFileName = '.heartbeat';
export const RecentUseWindowMs = 24 * 60 * 60 * 1000;

type DataStoreType = 'filedb' | 'lmdb';

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

/** Marks {@link versionDir} as in use by the current process. */
export function touchHeartbeat(versionDir: string, now = new Date()) {
    const heartbeat = join(versionDir, HeartbeatFileName);
    try {
        utimesSync(heartbeat, now, now);
    } catch (error) {
        if ((error as NodeJS.ErrnoException).code !== 'ENOENT') {
            throw error;
        }
        closeSync(openSync(heartbeat, 'a'));
        utimesSync(heartbeat, now, now);
    }
}

/**
 * True when the directory was used within {@link windowMs}. The heartbeat written by
 * {@link touchHeartbeat} is authoritative. Directory and immediate-entry mtimes are fallbacks for stores written
 * by binaries that predate the heartbeat; checking entries matters for LMDB because it updates its database files
 * in place without changing the parent directory mtime. Unreadable directories or entries are treated as in use.
 */
export function isRecentlyUsed(versionDir: string, windowMs = RecentUseWindowMs, now = Date.now()): boolean {
    const heartbeatOrDirectoryMtime = Math.max(mtimeMs(join(versionDir, HeartbeatFileName)), mtimeMs(versionDir));
    if (heartbeatOrDirectoryMtime === Number.POSITIVE_INFINITY || now - heartbeatOrDirectoryMtime < windowMs) {
        return true;
    }

    const entryMtime = latestEntryMtimeMs(versionDir);
    return entryMtime === Number.POSITIVE_INFINITY || now - entryMtime < windowMs;
}

function latestEntryMtimeMs(directory: string): number {
    let entries: string[];
    try {
        entries = readdirSync(directory);
    } catch (error) {
        return mtimeOnReadFailure(error);
    }

    let latest = Number.NEGATIVE_INFINITY;
    for (const entry of entries) {
        latest = Math.max(latest, mtimeMs(join(directory, entry)));
    }
    return latest;
}

function mtimeMs(path: string): number {
    try {
        return statSync(path).mtimeMs;
    } catch (error) {
        return mtimeOnReadFailure(error);
    }
}

function mtimeOnReadFailure(error: unknown): number {
    return (error as NodeJS.ErrnoException).code === 'ENOENT' ? Number.NEGATIVE_INFINITY : Number.POSITIVE_INFINITY;
}

export function cleanupUnusedOlderStorageDirs(
    storageDir: string,
    currentVersion: number,
    telemetry: ScopedTelemetry,
    dbType: DataStoreType,
    log: Logger,
) {
    cleanupStorageDirs(storageDir, telemetry, dbType, log, (directoryName) =>
        isOlderVersionDirectory(directoryName, currentVersion),
    );
}

export function cleanupUnusedStorageDirs(
    storageDir: string,
    telemetry: ScopedTelemetry,
    dbType: DataStoreType,
    log: Logger,
) {
    cleanupStorageDirs(storageDir, telemetry, dbType, log, () => true);
}

function cleanupStorageDirs(
    storageDir: string,
    telemetry: ScopedTelemetry,
    dbType: DataStoreType,
    log: Logger,
    isEligible: (directoryName: string) => boolean,
) {
    if (!existsSync(storageDir)) {
        return;
    }

    let directories: ReadonlyArray<string>;
    try {
        directories = getVersionStorageDirs(storageDir);
    } catch (error) {
        log.error(error, `Failed to list ${dbType} storage versions for cleanup`);
        telemetry.count(`${dbType}.oldVersion.cleanup.error`, 1);
        return;
    }

    for (const versionDir of directories) {
        try {
            if (!isEligible(basename(versionDir)) || isRecentlyUsed(versionDir)) {
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
