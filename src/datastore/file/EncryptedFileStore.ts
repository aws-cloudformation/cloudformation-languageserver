import { existsSync, readFileSync, renameSync, statSync, writeFileSync } from 'fs'; // eslint-disable-line no-restricted-imports -- files being checked
import { rename, writeFile } from 'fs/promises';
import { join } from 'path';
import { Logger } from 'pino';
import { lock, LockOptions, lockSync } from 'proper-lockfile';
import { LoggerFactory } from '../../telemetry/LoggerFactory';
import { ScopedTelemetry } from '../../telemetry/ScopedTelemetry';
import { TelemetryService } from '../../telemetry/TelemetryService';
import { extractErrorMessage } from '../../utils/Errors';
import { DataStore } from '../DataStore';
import { decrypt, encrypt } from './Encryption';

const LOCK_OPTIONS_SYNC: LockOptions = { stale: 10_000 };
const LOCK_OPTIONS: LockOptions = { ...LOCK_OPTIONS_SYNC, retries: { retries: 20, minTimeout: 50, maxTimeout: 1000 } };

const LOCK_SYNC_MAX_RETRIES = 10;
const LOCK_SYNC_INITIAL_DELAY_MS = 100;
const LOCK_SYNC_MAX_DELAY_MS = 1000;

const RENAME_MAX_RETRIES = 5;
const RENAME_INITIAL_DELAY_MS = 50;

export class EncryptedFileStore implements DataStore {
    private readonly log: Logger;
    private readonly file: string;
    private content: Record<string, unknown> = {};
    private readonly telemetry: ScopedTelemetry;
    private lastMtimeMs = 0;
    private lastSizeBytes = 0;
    private inFlightOperations = 0;
    private pendingClose: (() => void) | undefined;

    constructor(
        private readonly KEY: Buffer,
        name: string,
        fileDbDir: string,
    ) {
        this.log = LoggerFactory.getLogger(`FileStore.${name}`);
        this.file = join(fileDbDir, `${name}.enc`);
        this.telemetry = TelemetryService.instance.get(`FileStore.${name}`);

        // Create the file first if it doesn't exist so we can lock it.
        // Another process may also be creating it — the lock serializes the read/write.
        if (!existsSync(this.file)) {
            this.saveSync();
        }

        this.acquireLockSyncWithRetry(() => {
            try {
                this.content = this.readFile();
                this.recordFileSnapshot();
            } catch (error) {
                this.log.error(error, 'Failed to decrypt file store, recreating store');
                this.telemetry.count('filestore.recreate', 1);
                this.saveSync();
            }
        });
    }

    get<T>(key: string): T | undefined {
        return this.telemetry.countExecution(
            'get',
            () => {
                this.refreshIfStale();
                return this.content[key] as T | undefined;
            },
            {
                captureErrorAttributes: true,
            },
        );
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

    /** Waits for in-flight lock operations to complete before resolving. */
    close(): Promise<void> {
        if (this.inFlightOperations === 0) return Promise.resolve();
        return new Promise((resolve) => {
            this.pendingClose = resolve;
        });
    }

    private async withLock<T>(operation: string, fn: () => Promise<T>): Promise<T> {
        this.inFlightOperations++;
        try {
            return await this.telemetry.measureAsync(
                operation,
                async () => {
                    const release = await lock(this.file, LOCK_OPTIONS);
                    try {
                        this.content = this.readFile();
                        this.recordFileSnapshot();
                        return await fn();
                    } finally {
                        await release();
                    }
                },
                { captureErrorAttributes: true },
            );
        } finally {
            this.inFlightOperations--;
            if (this.inFlightOperations === 0 && this.pendingClose) {
                this.pendingClose();
            }
        }
    }

    /** Retries lockSync with exponential backoff using synchronous sleep for constructor use. */
    private acquireLockSyncWithRetry(fn: () => void): void {
        let delayMs = LOCK_SYNC_INITIAL_DELAY_MS;
        for (let attempt = 0; attempt <= LOCK_SYNC_MAX_RETRIES; attempt++) {
            try {
                const release = lockSync(this.file, LOCK_OPTIONS_SYNC);
                try {
                    fn();
                } finally {
                    release();
                }
                return;
            } catch (err: unknown) {
                const isLocked =
                    err instanceof Error && 'code' in err && (err as NodeJS.ErrnoException).code === 'ELOCKED';
                if (!isLocked || attempt === LOCK_SYNC_MAX_RETRIES) throw err;

                this.log.warn(
                    `Constructor lock contention, retry ${attempt + 1}/${LOCK_SYNC_MAX_RETRIES}: ${extractErrorMessage(err)}`,
                );
                this.telemetry.count('constructor.lock.retry', 1);

                // Synchronous sleep — blocks the event loop, only acceptable in constructor path
                const jitter = Math.random() * delayMs;
                busyWaitSync(delayMs + jitter);
                delayMs = Math.min(delayMs * 2, LOCK_SYNC_MAX_DELAY_MS);
            }
        }
    }

    /** Re-reads from disk if the file has been modified by another process since our last read. */
    private refreshIfStale(): void {
        try {
            const stat = statSync(this.file);
            if (stat.mtimeMs > this.lastMtimeMs || stat.size !== this.lastSizeBytes) {
                this.content = this.readFile();
                this.lastMtimeMs = stat.mtimeMs;
                this.lastSizeBytes = stat.size;
            }
        } catch {
            // stat or decrypt can fail if another process is mid-rename — use cached content
            this.telemetry.count('get.refresh.failed', 1);
        }
    }

    private recordFileSnapshot(): void {
        const stat = statSync(this.file);
        this.lastMtimeMs = stat.mtimeMs;
        this.lastSizeBytes = stat.size;
    }

    private readFile(): Record<string, unknown> {
        return JSON.parse(decrypt(this.KEY, readFileSync(this.file))) as Record<string, unknown>;
    }

    private saveSync() {
        const tmp = `${this.file}.${process.pid}.tmp`;
        writeFileSync(tmp, encrypt(this.KEY, JSON.stringify(this.content)));
        this.renameSyncWithRetry(tmp, this.file);
        this.recordFileSnapshot();
    }

    private async save() {
        const tmp = `${this.file}.${process.pid}.tmp`;
        await writeFile(tmp, encrypt(this.KEY, JSON.stringify(this.content)));
        await this.renameWithRetry(tmp, this.file);
        this.recordFileSnapshot();
    }

    /** Retries rename to handle Windows EPERM when another process has the file open. */
    private async renameWithRetry(source: string, destination: string): Promise<void> {
        for (let attempt = 0; attempt <= RENAME_MAX_RETRIES; attempt++) {
            try {
                await rename(source, destination);
                return;
            } catch (err: unknown) {
                const isEperm =
                    err instanceof Error && 'code' in err && (err as NodeJS.ErrnoException).code === 'EPERM';
                if (!isEperm || attempt === RENAME_MAX_RETRIES) throw err;

                this.log.warn(`Rename EPERM, retry ${attempt + 1}/${RENAME_MAX_RETRIES}`);
                this.telemetry.count('rename.eperm.retry', 1);
                await new Promise<void>((resolve) =>
                    setTimeout(resolve, RENAME_INITIAL_DELAY_MS * Math.pow(2, attempt)),
                );
            }
        }
    }

    private renameSyncWithRetry(source: string, destination: string): void {
        for (let attempt = 0; attempt <= RENAME_MAX_RETRIES; attempt++) {
            try {
                renameSync(source, destination);
                return;
            } catch (err: unknown) {
                const isEperm =
                    err instanceof Error && 'code' in err && (err as NodeJS.ErrnoException).code === 'EPERM';
                if (!isEperm || attempt === RENAME_MAX_RETRIES) throw err;

                this.log.warn(`Rename EPERM, retry ${attempt + 1}/${RENAME_MAX_RETRIES}`);
                this.telemetry.count('rename.eperm.retry', 1);
                busyWaitSync(RENAME_INITIAL_DELAY_MS * Math.pow(2, attempt));
            }
        }
    }
}

/** Portable synchronous sleep — blocks via busy-wait. Only for constructor/sync paths. */
function busyWaitSync(ms: number): void {
    const end = Date.now() + ms;
    while (Date.now() < end) {
        /* spin */
    }
}

export type FileStoreStats = {
    entries: number;
    totalSize: number;
};
