import { readdirSync } from 'fs';
import { join } from 'path';
import { Logger } from 'pino';
import { LoggerFactory } from '../../telemetry/LoggerFactory';
import { ScopedTelemetry } from '../../telemetry/ScopedTelemetry';
import { TelemetryService } from '../../telemetry/TelemetryService';
import { LocalFile } from '../../utils/LocalFile';
import { stableHashCode } from '../../utils/StableHash';
import { DataStore } from '../DataStore';
import { ErrorHandler, StoreOperation } from '../Utils';
import { EncryptedFile } from './EncryptedFile';

export class KeyedFileStore implements DataStore {
    private readonly log: Logger;
    private readonly fileNames = new Set();
    private readonly keysToFiles = new Map<string, EncryptedFile>();
    private readonly telemetry: ScopedTelemetry;

    constructor(
        private readonly encryptionKey: Buffer,
        private readonly storeName: string,
        private readonly fileDbDir: string,
        private readonly onError: ErrorHandler,
        private readonly onDiscard: (error: unknown) => void,
    ) {
        this.log = LoggerFactory.getLogger(`KeyedFileStore.${storeName}`);
        this.telemetry = TelemetryService.instance.get(`FileStore.${storeName}`);
        this.loadAllFiles();
    }

    get<T>(key: string): T | undefined {
        return this.exec(StoreOperation.get, () => this.keysToFiles.get(key)?.get<T>());
    }

    put<T>(key: string, value: T): Promise<boolean> {
        return this.execAsync(StoreOperation.put, async () => {
            return await this.getOrCreate(key).put(value);
        });
    }

    remove(key: string): Promise<boolean> {
        return this.execAsync(StoreOperation.remove, async () => {
            const file = this.keysToFiles.get(key);
            if (!file) {
                return false;
            }

            await file.remove();
            this.keysToFiles.delete(key);
            return true;
        });
    }

    clear(): Promise<void> {
        return this.execAsync(StoreOperation.clear, async () => {
            this.loadAllFiles();
            const files = [...this.keysToFiles.values()];
            for (const file of files) {
                await file.remove();
            }
            this.keysToFiles.clear();
        });
    }

    keys(limit: number): ReadonlyArray<string> {
        return this.exec(StoreOperation.keys, () => {
            this.loadAllFiles();
            return [...this.keysToFiles.keys()].slice(0, limit);
        });
    }

    stats(): FileStoreStats {
        return this.exec(StoreOperation.stats, () => {
            this.loadAllFiles();
            let entries = 0;
            let totalSize = 0;
            for (const store of this.keysToFiles.values()) {
                entries++;
                totalSize += store.fileSize();
            }
            return { entries, totalSize };
        });
    }

    private exec<T>(op: StoreOperation, fn: () => T): T {
        return this.telemetry.measure(
            op,
            () => {
                try {
                    return fn();
                } catch (e) {
                    this.onError(e, op);
                    throw e;
                }
            },
            { captureErrorAttributes: true },
        );
    }

    private async execAsync<T>(op: StoreOperation, fn: () => Promise<T>): Promise<T> {
        return await this.telemetry.measureAsync(
            op,
            async () => {
                try {
                    return await fn();
                } catch (e) {
                    this.onError(e, op);
                    throw e;
                }
            },
            { captureErrorAttributes: true },
        );
    }

    private getOrCreate(key: string): EncryptedFile {
        let store = this.keysToFiles.get(key);
        if (!store) {
            const fileName = keyStoreToFileName(this.storeName, key);
            store = this.createEncryptedFile(fileName);

            const existing = store.entry();
            if (existing && existing.key !== key) {
                throw new Error(
                    `Hash collision in ${this.storeName}: key "${key}" maps to same file as "${existing.key}"`,
                );
            }

            store.setKey(key);
            this.keysToFiles.set(key, store);
            this.fileNames.add(fileName);
        }
        return store;
    }

    private loadAllFiles(): void {
        const prefix = `${this.storeName}.`;
        try {
            for (const entry of readdirSync(this.fileDbDir)) {
                if (entry.startsWith(prefix) && entry.endsWith('.enc')) {
                    this.recoverFile(entry);
                }
            }
        } catch (error) {
            this.log.warn(error, 'Failed to scan existing keyed files');
        }
    }

    private recoverFile(fileName: string): void {
        if (this.fileNames.has(fileName)) {
            return;
        }

        try {
            const store = this.createEncryptedFile(fileName);
            const entry = store.entry();
            if (entry?.key) {
                store.setKey(entry.key);
                this.keysToFiles.set(entry.key, store);
                this.fileNames.add(fileName);
            }
        } catch (error) {
            this.log.warn(error, `Failed to recover key from ${fileName}`);
        }
    }

    private createEncryptedFile(fileName: string) {
        const file = new LocalFile(join(this.fileDbDir, fileName));

        try {
            return new EncryptedFile(this.encryptionKey, file);
        } catch (e) {
            this.onDiscard(e);
            file.unsafeRemove();

            return new EncryptedFile(this.encryptionKey, file);
        }
    }
}

type FileStoreStats = {
    entries: number;
    totalSize: number;
};

function keyStoreToFileName(storeName: string, key: string) {
    return `${storeName}.${stableHashCode(key)}.enc`;
}
