import { existsSync, mkdirSync } from 'fs';
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
    private readonly fileDbDir: string;
    private readonly metricsInterval: NodeJS.Timeout;

    constructor(rootDir: string) {
        this.log = LoggerFactory.getLogger('FileStore.Global');

        this.fileDbDir = join(rootDir, 'filedb', `${Version}`);
        if (!existsSync(this.fileDbDir)) {
            mkdirSync(this.fileDbDir, { recursive: true });
        }

        this.metricsInterval = setInterval(() => {
            this.emitMetrics();
        }, 60 * 1000);
        this.log.info(`Initialized FileStore v${Version}`);
    }

    get(store: StoreName): DataStore {
        let val = this.stores.get(store);
        if (!val) {
            val = new EncryptedFileStore(encryptionKey(Version), store, this.fileDbDir);
            this.stores.set(store, val);
        }
        return val;
    }

    storeNames(): ReadonlyArray<string> {
        return [...this.stores.keys()];
    }

    close(): Promise<void> {
        clearInterval(this.metricsInterval);
        return Promise.resolve();
    }

    private emitMetrics(): void {
        this.telemetry.histogram('version', Version);
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
}

const Version = 1;
