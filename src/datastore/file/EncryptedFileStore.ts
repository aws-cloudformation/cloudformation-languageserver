import { existsSync, readFileSync, statSync, unlinkSync } from 'fs'; // eslint-disable-line no-restricted-syntax -- files being checked
import { writeFile } from 'fs/promises';
import { join } from 'path';
import { Mutex } from 'async-mutex';
import { Logger } from 'pino';
import { LoggerFactory } from '../../telemetry/LoggerFactory';
import { ScopedTelemetry } from '../../telemetry/ScopedTelemetry';
import { TelemetryService } from '../../telemetry/TelemetryService';
import { DataStore } from '../DataStore';
import { decrypt, encrypt } from './Encryption';

export class EncryptedFileStore implements DataStore {
    private readonly log: Logger;

    private readonly file: string;
    private content?: Record<string, unknown>;
    private readonly telemetry: ScopedTelemetry;
    private readonly lock = new Mutex();

    constructor(
        private readonly KEY: Buffer,
        private readonly name: string,
        fileDbDir: string,
    ) {
        this.log = LoggerFactory.getLogger(`FileStore.${name}`);
        this.file = join(fileDbDir, `${name}.enc`);
        this.telemetry = TelemetryService.instance.get(`FileStore.${name}`);
        this.log.info('Initialized');
    }

    get<T>(key: string): T | undefined {
        if (this.content) {
            return this.content[key] as T;
        }

        if (!existsSync(this.file)) {
            return undefined;
        }

        const decrypted = decrypt(this.KEY, readFileSync(this.file));
        this.content = JSON.parse(decrypted) as Record<string, unknown>;
        return this.content[key] as T;
    }

    put<T>(key: string, value: T): Promise<boolean> {
        return this.lock.runExclusive(() =>
            this.telemetry.measureAsync('put', async () => {
                if (!this.content) {
                    this.get(key);
                }

                this.content = {
                    ...this.content,
                    [key]: value,
                };
                const encrypted = encrypt(this.KEY, JSON.stringify(this.content));
                await writeFile(this.file, encrypted);
                return true;
            }),
        );
    }

    remove(key: string): Promise<boolean> {
        return this.lock.runExclusive(async () => {
            if (!this.content) {
                this.get(key);
            }

            if (!this.content || !(key in this.content)) {
                return false;
            }

            delete this.content[key];
            const encrypted = encrypt(this.KEY, JSON.stringify(this.content));
            await writeFile(this.file, encrypted);
            return true;
        });
    }

    clear(): Promise<void> {
        return this.lock.runExclusive(() => {
            if (existsSync(this.file)) {
                unlinkSync(this.file);
            }
            this.content = undefined;
        });
    }

    keys(limit: number): ReadonlyArray<string> {
        if (!this.content) {
            this.get('ANY_KEY');
        }

        return Object.keys(this.content ?? {}).slice(0, limit);
    }

    stats(): FileStoreStats {
        if (!this.content) {
            this.get('ANY_KEY');
        }

        return {
            entries: Object.keys(this.content ?? {}).length,
            totalSize: existsSync(this.file) ? statSync(this.file).size : 0,
        };
    }
}

export type FileStoreStats = {
    entries: number;
    totalSize: number;
};
