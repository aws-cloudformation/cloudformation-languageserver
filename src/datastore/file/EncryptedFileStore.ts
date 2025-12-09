import { existsSync, readFileSync, statSync, writeFileSync } from 'fs'; // eslint-disable-line no-restricted-imports -- files being checked
import { writeFile } from 'fs/promises';
import { join } from 'path';
import { Logger } from 'pino';
import { lock, lockSync } from 'proper-lockfile';
import { LoggerFactory } from '../../telemetry/LoggerFactory';
import { ScopedTelemetry } from '../../telemetry/ScopedTelemetry';
import { TelemetryService } from '../../telemetry/TelemetryService';
import { DataStore } from '../DataStore';
import { decrypt, encrypt } from './Encryption';

const LOCK_OPTIONS = { stale: 10_000 }; // 10 seconds

export class EncryptedFileStore implements DataStore {
    private readonly log: Logger;
    private readonly file: string;
    private content: Record<string, unknown> = {};
    private readonly telemetry: ScopedTelemetry;

    constructor(
        private readonly KEY: Buffer,
        name: string,
        fileDbDir: string,
    ) {
        this.log = LoggerFactory.getLogger(`FileStore.${name}`);
        this.file = join(fileDbDir, `${name}.enc`);
        this.telemetry = TelemetryService.instance.get(`FileStore.${name}`);

        if (existsSync(this.file)) {
            try {
                this.content = this.readFile();
            } catch (error) {
                this.log.error(error, 'Failed to decrypt file store, recreating store');
                this.telemetry.count('filestore.recreate', 1);

                const release = lockSync(this.file, LOCK_OPTIONS);
                try {
                    this.saveSync();
                } finally {
                    release();
                }
            }
        } else {
            this.saveSync();
        }
    }

    get<T>(key: string): T | undefined {
        return this.telemetry.countExecution('get', () => this.content[key] as T | undefined);
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
        return this.telemetry.countExecution('keys', () => Object.keys(this.content).slice(0, limit));
    }

    stats(): FileStoreStats {
        return {
            entries: Object.keys(this.content).length,
            totalSize: existsSync(this.file) ? statSync(this.file).size : 0,
        };
    }

    private async withLock<T>(operation: string, fn: () => Promise<T>): Promise<T> {
        return await this.telemetry.measureAsync(operation, async () => {
            const release = await lock(this.file, LOCK_OPTIONS);
            try {
                this.content = this.readFile();
                return await fn();
            } finally {
                await release();
            }
        });
    }

    private readFile(): Record<string, unknown> {
        return JSON.parse(decrypt(this.KEY, readFileSync(this.file))) as Record<string, unknown>;
    }

    private saveSync() {
        writeFileSync(this.file, encrypt(this.KEY, JSON.stringify(this.content)));
    }

    private async save() {
        await writeFile(this.file, encrypt(this.KEY, JSON.stringify(this.content)));
    }
}

export type FileStoreStats = {
    entries: number;
    totalSize: number;
};
