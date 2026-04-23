import {
    closeSync,
    existsSync,
    fsyncSync,
    openSync,
    readdirSync,
    readFileSync, // eslint-disable-line no-restricted-imports -- atomic file primitives required here
    renameSync,
    statSync,
    unlinkSync,
    writeFileSync,
} from 'fs';
import { open, rename, unlink, writeFile } from 'fs/promises';
import { basename, join } from 'path';
import { Logger } from 'pino';
import { lock, LockOptions, lockSync } from 'proper-lockfile';
import { LoggerFactory } from '../../telemetry/LoggerFactory';
import { ScopedTelemetry } from '../../telemetry/ScopedTelemetry';
import { TelemetryService } from '../../telemetry/TelemetryService';
import { processId } from '../../utils/Environment';
import { sleep } from '../../utils/Retry';
import { DataStore } from '../DataStore';
import { decrypt, encrypt } from './Encryption';

const STALE_MS = 30_000;
const LOCK_OPTIONS_SYNC: LockOptions = { stale: STALE_MS, realpath: false };
const LOCK_OPTIONS: LockOptions = {
    ...LOCK_OPTIONS_SYNC,
    retries: { retries: 100, minTimeout: 25, maxTimeout: 200, factor: 1.5, randomize: true },
};

const RENAME_MAX_RETRIES = 10;
const RENAME_RETRY_DELAY_MS = 50;
const RETRIABLE_RENAME_CODES = new Set(['EPERM', 'EACCES', 'EBUSY', 'ENOENT']);

const SYNC_LOCK_MAX_ATTEMPTS = 200;
const SYNC_LOCK_RETRY_DELAY_MS = 50;

export class EncryptedFileStore implements DataStore {
    private readonly log: Logger;
    private readonly file: string;
    private readonly dir: string;
    private readonly lockfilePath: string;
    private content: Record<string, unknown> = {};
    private readonly telemetry: ScopedTelemetry;
    private writeQueue: Promise<void> = Promise.resolve();
    private tempFileCounter = 0;

    constructor(
        private readonly encryptionKey: Buffer,
        name: string,
        fileDbDir: string,
    ) {
        this.log = LoggerFactory.getLogger(`FileStore.${name}`);
        this.file = join(fileDbDir, `${name}.enc`);
        this.dir = fileDbDir;
        this.lockfilePath = join(fileDbDir, `${name}.enc.lock`);
        this.telemetry = TelemetryService.instance.get(`FileStore.${name}`);

        this.cleanupStaleTmpFiles();

        const release = lockSyncWithRetry(fileDbDir, { ...LOCK_OPTIONS_SYNC, lockfilePath: this.lockfilePath });
        try {
            if (existsSync(this.file)) {
                try {
                    this.content = this.readFile();
                } catch (error) {
                    this.log.error(error, 'Failed to decrypt file store, recreating store');
                    this.telemetry.count('filestore.recreate', 1);
                    this.saveSync();
                }
            } else {
                this.saveSync();
            }
        } finally {
            release();
        }
    }

    get<T>(key: string): T | undefined {
        return this.telemetry.countExecution('get', () => this.content[key] as T | undefined, {
            captureErrorAttributes: true,
        });
    }

    put<T>(key: string, value: T): Promise<boolean> {
        return this.withLock('put', async () => {
            this.content[key] = value;
            await this.save();
            return true;
        });
    }

    remove(key: string): Promise<boolean> {
        return this.withLock('remove', async () => {
            if (!(key in this.content)) {
                return false;
            }

            delete this.content[key];
            await this.save();
            return true;
        });
    }

    clear(): Promise<void> {
        return this.withLock('clear', async () => {
            this.content = {};
            await this.save();
        });
    }

    keys(limit: number): ReadonlyArray<string> {
        return this.telemetry.countExecution('keys', () => Object.keys(this.content).slice(0, limit), {
            captureErrorAttributes: true,
        });
    }

    stats(): FileStoreStats {
        return {
            entries: Object.keys(this.content).length,
            totalSize: existsSync(this.file) ? statSync(this.file).size : 0,
        };
    }

    private async withLock<T>(operation: string, fn: () => Promise<T>): Promise<T> {
        const previous = this.writeQueue;
        let releaseNext!: () => void;
        this.writeQueue = new Promise<void>((resolve) => {
            releaseNext = resolve;
        });
        try {
            await previous;
            return await this.telemetry.measureAsync(
                operation,
                async () => {
                    const release = await lock(this.dir, { ...LOCK_OPTIONS, lockfilePath: this.lockfilePath });
                    try {
                        this.content = existsSync(this.file) ? this.readFile() : {};
                        return await fn();
                    } finally {
                        await release();
                    }
                },
                { captureErrorAttributes: true },
            );
        } finally {
            releaseNext();
        }
    }

    private readFile(): Record<string, unknown> {
        return JSON.parse(decrypt(this.encryptionKey, readFileSync(this.file))) as Record<string, unknown>;
    }

    private saveSync() {
        const tmp = this.tmpPath();
        writeFileSync(tmp, encrypt(this.encryptionKey, JSON.stringify(this.content)));
        fsyncFileSync(tmp);
        renameSyncWithRetry(tmp, this.file);
        fsyncDirSync(this.dir);
    }

    private async save() {
        const tmp = this.tmpPath();
        await writeFile(tmp, encrypt(this.encryptionKey, JSON.stringify(this.content)));
        await fsyncFile(tmp);
        await renameWithRetry(tmp, this.file);
        await fsyncDir(this.dir);
    }

    private tmpPath(): string {
        this.tempFileCounter = (this.tempFileCounter + 1) % Number.MAX_SAFE_INTEGER;
        return `${this.file}.${processId()}.${this.tempFileCounter}.tmp`;
    }

    private cleanupStaleTmpFiles(): void {
        const prefix = `${basename(this.file)}.`;
        try {
            for (const entry of readdirSync(this.dir)) {
                if (entry.startsWith(prefix) && entry.endsWith('.tmp')) {
                    try {
                        unlinkSync(join(this.dir, entry));
                    } catch {
                        // ignore - another process may own it
                    }
                }
            }
        } catch {
            // ignore - dir may not exist yet
        }
    }
}

function fsyncFileSync(filePath: string): void {
    const fd = openSync(filePath, 'r+');
    try {
        fsyncSync(fd);
    } finally {
        closeSync(fd);
    }
}

function fsyncDirSync(dirPath: string): void {
    try {
        const fd = openSync(dirPath, 'r');
        try {
            fsyncSync(fd);
        } finally {
            closeSync(fd);
        }
    } catch {
        // Windows cannot fsync directories - writes are still durable via NTFS journaling
    }
}

async function fsyncFile(filePath: string): Promise<void> {
    const handle = await open(filePath, 'r+');
    try {
        await handle.sync();
    } finally {
        await handle.close();
    }
}

async function fsyncDir(dirPath: string): Promise<void> {
    try {
        const handle = await open(dirPath, 'r');
        try {
            await handle.sync();
        } finally {
            await handle.close();
        }
    } catch {
        // Windows cannot fsync directories
    }
}

function renameSyncWithRetry(sourcePath: string, destinationPath: string): void {
    for (let attempt = 0; attempt < RENAME_MAX_RETRIES; attempt++) {
        try {
            renameSync(sourcePath, destinationPath);
            return;
        } catch (error) {
            const code = (error as NodeJS.ErrnoException).code;
            if (!code || !RETRIABLE_RENAME_CODES.has(code) || attempt === RENAME_MAX_RETRIES - 1) {
                try {
                    unlinkSync(sourcePath);
                } catch {
                    // best-effort tmp cleanup
                }
                throw error;
            }
            sleepSyncMs(RENAME_RETRY_DELAY_MS);
        }
    }
}

function lockSyncWithRetry(target: string, options: LockOptions): () => void {
    let lastError: unknown;
    for (let attempt = 0; attempt < SYNC_LOCK_MAX_ATTEMPTS; attempt++) {
        try {
            return lockSync(target, options);
        } catch (error) {
            lastError = error;
            if ((error as NodeJS.ErrnoException).code !== 'ELOCKED') {
                throw error;
            }
            sleepSyncMs(SYNC_LOCK_RETRY_DELAY_MS);
        }
    }
    throw lastError;
}

function sleepSyncMs(ms: number): void {
    Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, ms);
}

async function renameWithRetry(sourcePath: string, destinationPath: string): Promise<void> {
    for (let attempt = 0; attempt < RENAME_MAX_RETRIES; attempt++) {
        try {
            await rename(sourcePath, destinationPath);
            return;
        } catch (error) {
            const code = (error as NodeJS.ErrnoException).code;
            if (!code || !RETRIABLE_RENAME_CODES.has(code) || attempt === RENAME_MAX_RETRIES - 1) {
                try {
                    await unlink(sourcePath);
                } catch {
                    // best-effort tmp cleanup
                }
                throw error;
            }
            await sleep(RENAME_RETRY_DELAY_MS);
        }
    }
}

export type FileStoreStats = {
    entries: number;
    totalSize: number;
};
