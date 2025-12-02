import { existsSync, mkdirSync, readdirSync, rmSync } from 'fs';
import { join } from 'path';
import { Logger } from 'pino';
import { LoggerFactory } from '../telemetry/LoggerFactory';
import { ScopedTelemetry } from '../telemetry/ScopedTelemetry';
import { Telemetry } from '../telemetry/TelemetryDecorator';
import { DataStore, DataStoreFactory, StoreName } from './DataStore';
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

    constructor(rootDir: string) {
        this.log = LoggerFactory.getLogger('FileStore.Global');

        this.fileDbRoot = join(rootDir, 'filedb');
        this.fileDbDir = join(this.fileDbRoot, Version);

        if (!existsSync(this.fileDbDir)) {
            mkdirSync(this.fileDbDir, { recursive: true });
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

        this.log.info(`Initialized FileDB ${Version}`);
    }

    get(store: StoreName): DataStore {
        let val = this.stores.get(store);
        if (!val) {
            val = new EncryptedFileStore(encryptionKey(VersionNumber), store, this.fileDbDir);
            this.stores.set(store, val);
        }
        return val;
    }

    storeNames(): ReadonlyArray<string> {
        return [...this.stores.keys()];
    }

    close(): Promise<void> {
        clearTimeout(this.timeout);
        clearInterval(this.metricsInterval);
        return Promise.resolve();
    }

    private emitMetrics(): void {
        this.telemetry.histogram('version', VersionNumber);
        this.telemetry.histogram('env.entries', this.stores.size);

        let totalBytes = 0;
        for (const [name, store] of this.stores.entries()) {
            const stats = store.stats();

            totalBytes += stats.totalSize;
            this.telemetry.histogram(`store.${name}.entries`, stats.entries);
            this.telemetry.histogram(`store.${name}.size.bytes`, stats.totalSize, {
                unit: 'By',
            });
        }

        this.telemetry.histogram('total.size.bytes', totalBytes, {
            unit: 'By',
        });
    }

    private cleanupOldVersions(): void {
        const entries = readdirSync(this.fileDbRoot, { withFileTypes: true });
        for (const entry of entries) {
            try {
                if (entry.name !== Version) {
                    this.telemetry.count('oldVersion.cleanup.count', 1);
                    rmSync(join(this.fileDbRoot, entry.name), { recursive: true, force: true });
                }
            } catch (error) {
                this.log.error(error, 'Failed to cleanup old FileDB versions');
                this.telemetry.count('oldVersion.cleanup.error', 1);
            }
        }
    }
}

const VersionNumber = 2;
const Version = `v${VersionNumber}`;
