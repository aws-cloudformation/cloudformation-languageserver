import { existsSync, mkdirSync } from 'fs';
import { readdir, rm } from 'fs/promises';
import { join } from 'path';
import { Logger } from 'pino';
import { LoggerFactory } from '../telemetry/LoggerFactory';
import { ScopedTelemetry } from '../telemetry/ScopedTelemetry';
import { Telemetry } from '../telemetry/TelemetryDecorator';
import { formatNumber } from '../utils/String';
import { DataStore, DataStoreFactory, PersistedStores, StoreName } from './DataStore';
import { EncryptedFileStore } from './file/EncryptedFileStore';
import { encryptionKey } from './file/Encryption';

export class FileStoreFactory implements DataStoreFactory {
    private readonly log: Logger;
    @Telemetry({ scope: 'FileStore.Global' }) private readonly telemetry!: ScopedTelemetry;

    private readonly stores = new Map<StoreName, EncryptedFileStore>();
    private readonly fileDbRoot: string;
    private readonly fileDbDir: string;

    private readonly metricsInterval: NodeJS.Timeout;
    private readonly timeout: NodeJS.Timeout;
    private closed = false;

    constructor(
        rootDir: string,
        public readonly storeNames = PersistedStores,
    ) {
        this.log = LoggerFactory.getLogger('FileStore.Global');

        this.fileDbRoot = join(rootDir, 'filedb');
        this.fileDbDir = join(this.fileDbRoot, Version);

        if (!existsSync(this.fileDbDir)) {
            mkdirSync(this.fileDbDir, { recursive: true });
        }

        for (const store of storeNames) {
            this.stores.set(store, new EncryptedFileStore(encryptionKey(VersionNumber), store, this.fileDbDir));
        }

        this.metricsInterval = setInterval(() => {
            this.emitMetrics();
        }, 60 * 1000);

        this.timeout = setTimeout(
            () => {
                void this.cleanupOldVersions();
            },
            2 * 60 * 1000,
        );

        this.log.info(`Initialized FileDB ${Version} and ${formatNumber(this.totalBytes() / (1024 * 1024), 4)} MB`);
    }

    get(store: StoreName): DataStore {
        const val = this.stores.get(store);
        if (val === undefined) {
            throw new Error(`Store ${store} not found. Available stores: ${[...this.stores.keys()].join(', ')}`);
        }
        return val;
    }

    close(): Promise<void> {
        if (this.closed) return Promise.resolve();
        this.closed = true;
        clearTimeout(this.timeout);
        clearInterval(this.metricsInterval);
        return Promise.all([...this.stores.values()].map((store) => store.close())).then(() => {});
    }

    private emitMetrics(): void {
        if (this.closed) return;

        this.telemetry.histogram('version', VersionNumber);
        this.telemetry.histogram('env.entries', this.stores.size);

        for (const [name, store] of this.stores.entries()) {
            const stats = store.stats();

            this.telemetry.histogram(`store.${name}.entries`, stats.entries);
            this.telemetry.histogram(`store.${name}.size.bytes`, stats.totalSize, {
                unit: 'By',
            });
        }

        this.telemetry.histogram('total.size.bytes', this.totalBytes(), {
            unit: 'By',
        });
    }

    private async cleanupOldVersions(): Promise<void> {
        if (this.closed || !existsSync(this.fileDbRoot)) return;

        try {
            const entries = await readdir(this.fileDbRoot, { withFileTypes: true });
            for (const entry of entries) {
                if (entry.name !== Version) {
                    this.telemetry.count('oldVersion.cleanup.count', 1);
                    await rm(join(this.fileDbRoot, entry.name), { recursive: true, force: true });
                }
            }
        } catch (error) {
            this.log.error(error, 'Failed to cleanup old FileDB versions');
            this.telemetry.count('oldVersion.cleanup.error', 1);
        }
    }

    private totalBytes() {
        let totalBytes = 0;

        for (const store of this.stores.values()) {
            totalBytes += store.stats().totalSize;
        }

        return totalBytes;
    }
}

const VersionNumber = 2;
const Version = `v${VersionNumber}`;
