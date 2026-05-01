import { existsSync, statSync, unlinkSync } from 'fs';
import { unlink, writeFile, readdir } from 'fs/promises';
import { Stats } from 'node:fs';
import { Stream } from 'node:stream';
import { basename, dirname, join } from 'path';
import { LockOptions, lock } from 'proper-lockfile';
import { LoggerFactory } from '../telemetry/LoggerFactory';
import { processId } from './Environment';
import { DoesNotExist } from './Errors';
import {
    asyncDirSync,
    asyncFileSync,
    asyncRenameWithRetry,
    isFileNotFoundError,
    readBufferIfExists,
    readBufferIfExistsAsync,
    readFileIfExists,
    readFileIfExistsAsync,
} from './File';

const log = LoggerFactory.getLogger('LocalFile');

const LOCK_OPTIONS: LockOptions = {
    stale: 10_000, // A lock older than this (ms) is considered abandoned and can be stolen by another process
    realpath: false, // Use path.resolve instead of fs.realpath so locking works on files that don't exist yet (first write)
    retries: {
        retries: 20, // Maximum number of attempts to acquire the lock before giving up.
        factor: 2, // Exponential backoff multiplier between retries
        minTimeout: 50, // Minimum delay (ms) before the first retry
        maxTimeout: 2000, // Maximum delay (ms) cap for any single retry
        randomize: true, // Add jitter to retry delays to avoid contention between concurrent writes
    },
};

export class LocalFile {
    private tempFileCounter = 0;
    readonly fileName: string;
    readonly dirName: string;

    constructor(readonly path: string) {
        this.fileName = basename(path);
        this.dirName = dirname(path);
    }

    exists() {
        return existsSync(this.path);
    }

    stats(): Stats | undefined {
        if (this.exists()) {
            return statSync(this.path);
        }
        return undefined;
    }

    isFile(): boolean {
        return this.stats()?.isFile() ?? false;
    }

    isDirectory(): boolean {
        return this.stats()?.isDirectory() ?? false;
    }

    fileBytes(): number {
        return this.stats()?.size ?? 0;
    }

    readString(): string | undefined {
        try {
            return readFileIfExists(this.path);
        } catch (err) {
            if (err instanceof DoesNotExist) {
                return undefined;
            }
            throw err;
        }
    }

    async readStringAsync(): Promise<string | undefined> {
        try {
            return await readFileIfExistsAsync(this.path);
        } catch (err) {
            if (err instanceof DoesNotExist) {
                return undefined;
            }
            throw err;
        }
    }

    readBytes(): Buffer | undefined {
        try {
            return readBufferIfExists(this.path);
        } catch (err) {
            if (err instanceof DoesNotExist) {
                return undefined;
            }
            throw err;
        }
    }

    async readBytesAsync(): Promise<Buffer | undefined> {
        try {
            return await readBufferIfExistsAsync(this.path);
        } catch (err) {
            if (err instanceof DoesNotExist) {
                return undefined;
            }
            throw err;
        }
    }

    async write(
        data:
            | string
            | NodeJS.ArrayBufferView
            | Iterable<string | NodeJS.ArrayBufferView>
            | AsyncIterable<string | NodeJS.ArrayBufferView>
            | Stream,
    ): Promise<boolean> {
        const release = await this.tryLock();
        try {
            await this.cleanupStaleTmpFiles();
            const tmp = this.tmpPath();

            try {
                await writeFile(tmp, data);
                await asyncFileSync(tmp);
                await asyncRenameWithRetry(tmp, this.path);

                await asyncDirSync(dirname(this.path));
                return true;
            } catch (err) {
                // If anything fails during the write/sync/rename phase, clean up the orphaned temp file before bubbling up the error.
                try {
                    if (existsSync(tmp)) {
                        unlinkSync(tmp);
                    }
                } catch {
                    // Ignore cleanup error, we want to throw the original writeError
                }
                throw err;
            }
        } finally {
            await release();
        }
    }

    async remove(): Promise<boolean> {
        const release = await this.tryLock();
        try {
            await unlink(this.path);
            return true;
        } catch (err) {
            // If the file is already gone, treat it as a success (idempotent)
            if (isFileNotFoundError(err)) {
                return true;
            }

            throw err;
        } finally {
            await release();
        }
    }

    /**
     * @unsafe Delete a file without locks
     */
    unsafeRemove(): boolean {
        try {
            unlinkSync(this.path);
            return true;
        } catch (err) {
            // If the file is already gone, treat it as a success (idempotent)
            if (isFileNotFoundError(err)) {
                return true;
            }

            throw err;
        }
    }

    private tryLock() {
        return lock(this.path, LOCK_OPTIONS);
    }

    private tmpPath() {
        this.tempFileCounter = (this.tempFileCounter + 1) % Number.MAX_SAFE_INTEGER;
        return `${this.path}.${processId()}.${this.tempFileCounter}.tmp`;
    }

    private async cleanupStaleTmpFiles() {
        try {
            const entries = await readdir(this.dirName);
            for (const entry of entries) {
                if (entry.startsWith(`${this.fileName}.`) && entry.endsWith('.tmp')) {
                    const fullPath = join(this.dirName, entry);

                    try {
                        await unlink(fullPath);
                    } catch (err) {
                        if (isFileNotFoundError(err)) {
                            continue;
                        }

                        log.error(err, `Failed to clean up stale temp file: ${fullPath}`);
                    }
                }
            }
        } catch (err) {
            if (isFileNotFoundError(err)) {
                return;
            }

            log.error(err, `Cleanup failed to read directory: ${this.dirName}`);
        }
    }
}
