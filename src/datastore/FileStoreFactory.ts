import { existsSync, mkdirSync } from 'fs';
import { join } from 'path';
import { LoggerFactory } from '../telemetry/LoggerFactory';
import { ScopedTelemetry } from '../telemetry/ScopedTelemetry';
import { Telemetry } from '../telemetry/TelemetryDecorator';
import { diskUsage } from '../utils/Disk';
import { DataStoreError } from '../utils/errors/ErrorClasses';
import { formatNumber } from '../utils/String';
import { DataStore, DataStoreFactory, PersistedStores, StoreName, TotalMaxDatastoreSize } from './DataStore';
import { encryptionKey } from './file/Encryption';
import { KeyedFileStore } from './file/KeyedFileStore';
import { recordDiscardedData, recordDiskUsage, recordOutOfDiskFailure, StoreOperation } from './Utils';
import {
    getFileDbRoot,
    getLmdbRoot,
    touchHeartbeat,
    cleanupOldStorageDirs,
    FileDbVersionNumber as VersionNumber,
    LmdbVersionNumber,
} from './VersionDirectory';

export class FileStoreFactory implements DataStoreFactory {
    private readonly log = LoggerFactory.getLogger('FileStore.Global');
    @Telemetry({ scope: 'FileStore.Global' }) private readonly telemetry!: ScopedTelemetry;

    private readonly stores = new Map<StoreName, KeyedFileStore>();
    private readonly fileDbRoot: string;
    private readonly fileDbDir: string;
    private readonly lmdbRoot: string;

    private readonly metricsInterval: NodeJS.Timeout;
    private readonly timeout: NodeJS.Timeout;
    private closed = false;

    constructor(
        rootDir: string,
        public readonly storeNames = PersistedStores,
    ) {
        this.fileDbRoot = getFileDbRoot(rootDir);
        this.fileDbDir = join(this.fileDbRoot, Version);
        this.lmdbRoot = getLmdbRoot(rootDir);

        if (!existsSync(this.fileDbDir)) {
            mkdirSync(this.fileDbDir, { recursive: true });
        }
        this.recordHeartbeat();

        for (const store of storeNames) {
            this.stores.set(
                store,
                new KeyedFileStore(
                    encryptionKey(VersionNumber),
                    store,
                    this.fileDbDir,
                    (e, op) => this.onError(e, op),
                    (e) => {
                        recordDiscardedData(this.telemetry, e);
                    },
                ),
            );
        }

        this.metricsInterval = setInterval(() => {
            this.emitMetrics();
        }, 60 * 1000);

        this.timeout = setTimeout(
            () => {
                this.cleanupOldVersions();
            },
            2 * 60 * 1000,
        );

        this.metricsInterval.unref();
        this.timeout.unref();

        this.log.info(`Initialized FileDB ${Version} and ${formatNumber(this.totalBytes() / (1024 * 1024), 4)} MB`);
    }

    get(store: StoreName): DataStore {
        const val = this.stores.get(store);
        if (val === undefined) {
            throw new DataStoreError(
                `Store ${store} not found. Available stores: ${[...this.stores.keys()].join(', ')}`,
            );
        }
        return val;
    }

    initialize(): Promise<void> {
        return Promise.resolve();
    }

    private onError(error: unknown, op: StoreOperation) {
        recordOutOfDiskFailure(this.telemetry, op, error);
    }

    private emitMetrics(): void {
        if (this.closed) return;

        this.recordHeartbeat();
        this.telemetry.histogram('version', VersionNumber);
        this.telemetry.histogram('env.entries', this.stores.size);

        let totalBytes = 0;
        for (const [name, store] of this.stores.entries()) {
            const stats = store.stats();

            this.telemetry.histogram(`store.${name}.entries`, stats.entries);
            this.telemetry.histogram(`store.${name}.size.bytes`, stats.totalSize, {
                unit: 'By',
            });

            totalBytes += stats.totalSize;
        }

        this.telemetry.histogram('total.size.bytes', totalBytes, {
            unit: 'By',
        });
        this.telemetry.histogram('total.usage', 100 * (totalBytes / TotalMaxDatastoreSize), { unit: '%' });

        const usage = diskUsage(this.fileDbRoot);
        if (usage !== undefined) {
            recordDiskUsage(this.telemetry, usage);
        }
    }

    private recordHeartbeat(): void {
        if (!touchHeartbeat(this.fileDbDir)) {
            this.telemetry.count('heartbeat.error', 1);
        }
    }

    private cleanupOldVersions(): void {
        if (this.closed) return;

        cleanupOldStorageDirs(this.fileDbRoot, VersionNumber, this.telemetry, 'filedb', this.log);
        cleanupOldStorageDirs(this.lmdbRoot, LmdbVersionNumber, this.telemetry, 'lmdb', this.log, false);
    }

    private totalBytes() {
        let totalBytes = 0;

        for (const store of this.stores.values()) {
            totalBytes += store.stats().totalSize;
        }

        return totalBytes;
    }

    close(): Promise<void> {
        if (this.closed) {
            return Promise.resolve();
        }

        this.closed = true;
        clearTimeout(this.timeout);
        clearInterval(this.metricsInterval);
        return Promise.resolve();
    }
}

const Version = `v${VersionNumber}`;
