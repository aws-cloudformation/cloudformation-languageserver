import { readdirSync } from 'fs';
import { Logger } from 'pino';
import { LoggerFactory } from '../../telemetry/LoggerFactory';
import { ScopedTelemetry } from '../../telemetry/ScopedTelemetry';
import { TelemetryService } from '../../telemetry/TelemetryService';
import { stableHashCode } from '../../utils/StableHash';
import { DataStore } from '../DataStore';
import { EncryptedFile } from './EncryptedFile';

export class KeyedFileStore implements DataStore {
    private readonly log: Logger;
    private readonly keysToFiles = new Map<string, EncryptedFile>();
    private readonly telemetry: ScopedTelemetry;

    constructor(
        private readonly encryptionKey: Buffer,
        private readonly storeName: string,
        private readonly fileDbDir: string,
    ) {
        this.log = LoggerFactory.getLogger(`KeyedFileStore.${storeName}`);
        this.telemetry = TelemetryService.instance.get(`FileStore.${storeName}`);
        this.loadAllKeys();
    }

    get<T>(key: string): T | undefined {
        return this.telemetry.measure('get', () => this.keysToFiles.get(key)?.get<T>(), {
            captureErrorAttributes: true,
        });
    }

    put<T>(key: string, value: T): Promise<boolean> {
        return this.telemetry.measureAsync(
            'put',
            async () => {
                await this.getOrCreate(key).put(value);
                return true;
            },
            { captureErrorAttributes: true },
        );
    }

    remove(key: string): Promise<boolean> {
        return this.telemetry.measureAsync(
            'remove',
            async () => {
                const file = this.keysToFiles.get(key);
                if (!file) {
                    return false;
                }

                this.keysToFiles.delete(key);
                await file.remove();
                return true;
            },
            { captureErrorAttributes: true },
        );
    }

    clear(): Promise<void> {
        return this.telemetry.measureAsync(
            'clear',
            async () => {
                this.loadAllKeys();
                const files = [...this.keysToFiles.values()];
                this.keysToFiles.clear();
                for (const file of files) {
                    await file.remove();
                }
            },
            { captureErrorAttributes: true },
        );
    }

    keys(limit: number): ReadonlyArray<string> {
        return this.telemetry.measure(
            'keys',
            () => {
                this.loadAllKeys();
                return [...this.keysToFiles.keys()].slice(0, limit);
            },
            {
                captureErrorAttributes: true,
            },
        );
    }

    stats(): FileStoreStats {
        this.loadAllKeys();
        let entries = 0;
        let totalSize = 0;
        for (const store of this.keysToFiles.values()) {
            entries++;
            totalSize += store.fileSize();
        }
        return { entries, totalSize };
    }

    private getOrCreate(key: string): EncryptedFile {
        let store = this.keysToFiles.get(key);
        if (!store) {
            store = new EncryptedFile(
                this.encryptionKey,
                this.storeName,
                fileName(this.storeName, key),
                this.fileDbDir,
            );

            const existing = store.entry();
            if (existing && existing.key !== key) {
                throw new Error(
                    `Hash collision in ${this.storeName}: key "${key}" maps to same file as "${existing.key}"`,
                );
            }

            store.setKey(key);
            this.keysToFiles.set(key, store);
        }
        return store;
    }

    private loadAllKeys(): void {
        const prefix = `${this.storeName}.`;
        try {
            for (const entry of readdirSync(this.fileDbDir)) {
                if (entry.startsWith(prefix) && entry.endsWith('.enc')) {
                    this.recoverKey(entry);
                }
            }
        } catch (error) {
            this.log.warn(error, 'Failed to scan existing keyed files');
        }
    }

    private recoverKey(filename: string): void {
        try {
            const store = new EncryptedFile(this.encryptionKey, this.storeName, filename, this.fileDbDir);
            const entry = store.entry();
            if (entry?.key) {
                store.setKey(entry.key);
                this.keysToFiles.set(entry.key, store);
            }
        } catch (error) {
            this.log.warn(error, `Failed to recover key from ${filename}`);
        }
    }
}

type FileStoreStats = {
    entries: number;
    totalSize: number;
};

function fileName(storeName: string, key: string) {
    return `${storeName}.${stableHashCode(key)}.enc`;
}
