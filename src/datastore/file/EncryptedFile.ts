import { existsSync, readFileSync, statSync, unlinkSync } from 'fs'; // eslint-disable-line no-restricted-imports -- files being checked
import { rename, unlink, writeFile } from 'fs/promises';
import { join } from 'path';
import { Logger } from 'pino';
import { lock, LockOptions, lockSync } from 'proper-lockfile';
import { LoggerFactory } from '../../telemetry/LoggerFactory';
import { TelemetryService } from '../../telemetry/TelemetryService';
import { decrypt, encrypt } from './Encryption';

const LOCK_OPTIONS_SYNC: LockOptions = { stale: 10_000 };
const LOCK_OPTIONS: LockOptions = { ...LOCK_OPTIONS_SYNC, retries: { retries: 20, minTimeout: 50, maxTimeout: 1000 } };

/**
 * Encrypted on-disk envelope. Stores the original key alongside the value
 * so the key can be recovered from the file during startup.
 */
export type EncryptedEntry<T = unknown> = {
    readonly key: string;
    readonly value: T;
};

export class EncryptedFile {
    private readonly log: Logger;
    private readonly file: string;
    private key: string | undefined;
    private content: EncryptedEntry | undefined = undefined;

    constructor(
        private readonly KEY: Buffer,
        storeName: string,
        fileName: string,
        fileDbDir: string,
    ) {
        this.log = LoggerFactory.getLogger(`EncryptedFile.${storeName}`);
        this.file = join(fileDbDir, fileName);

        if (this.exists()) {
            const release = lockSync(this.file, LOCK_OPTIONS_SYNC);
            try {
                this.content = this.readFile();
            } catch (error) {
                this.log.error(error, 'Failed to decrypt file store, deleting store');
                TelemetryService.instance.get(`FileStore.${storeName}`).count('filestore.recreate', 1);
                unlinkSync(this.file);
            } finally {
                release();
            }
        }
    }

    setKey(key: string) {
        if (this.key !== undefined) {
            throw new Error('File key was already set');
        }
        this.key = key;
    }

    exists() {
        return existsSync(this.file);
    }

    entry(): EncryptedEntry | undefined {
        return this.content;
    }

    get<T>(): T | undefined {
        return this.content?.value as T | undefined;
    }

    async put<T>(value: T): Promise<boolean> {
        if (this.key === undefined) {
            throw new Error('File key is not set');
        }

        this.content = { key: this.key, value };

        if (!this.exists()) {
            await this.save();
            return true;
        }

        const release = await this.tryLock();
        if (!release) {
            await this.save();
            return true;
        }
        try {
            await this.save();
            return true;
        } finally {
            await release();
        }
    }

    async remove() {
        this.content = undefined;

        if (!this.exists()) {
            return true;
        }

        const release = await this.tryLock();
        if (!release) {
            return true;
        }
        try {
            await unlink(this.file);
            return true;
        } catch (error: unknown) {
            if (isFileNotFound(error)) {
                return true;
            }
            throw error;
        } finally {
            await release();
        }
    }

    /** Returns the release function, or undefined if the file was deleted by another process. */
    private async tryLock(): Promise<(() => Promise<void>) | undefined> {
        try {
            return await lock(this.file, LOCK_OPTIONS);
        } catch (error: unknown) {
            if (isFileNotFound(error)) {
                return undefined;
            }
            throw error;
        }
    }

    fileSize(): number {
        return existsSync(this.file) ? statSync(this.file).size : 0;
    }

    private readFile(): EncryptedEntry {
        return JSON.parse(decrypt(this.KEY, readFileSync(this.file))) as EncryptedEntry;
    }

    private async save() {
        const tmp = `${this.file}.${process.pid}.tmp`;
        await writeFile(tmp, encrypt(this.KEY, JSON.stringify(this.content)));
        await rename(tmp, this.file);
    }
}

const ENOENT = 'ENOENT'; // File was deleted by another process (e.g. a concurrent IDE session sharing the same storage directory).

function isFileNotFound(error: unknown): boolean {
    return error instanceof Error && (error as NodeJS.ErrnoException).code === ENOENT;
}
