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

    constructor(rootDir: string) {
        this.log = LoggerFactory.getLogger('FileStore.Global');

        this.fileDbDir = join(rootDir, 'filedb', `${Version}`);
        if (!existsSync(this.fileDbDir)) {
            mkdirSync(this.fileDbDir, { recursive: true });
        }

        this.registerFileStoreGauges();
        this.log.info('Initialized');
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
        return Promise.resolve();
    }

    private registerFileStoreGauges(): void {
        this.telemetry.registerGaugeProvider('version', () => Version);
        this.telemetry.registerGaugeProvider('env.entries', () => this.stores.size);

        for (const [name, store] of this.stores.entries()) {
            this.telemetry.registerGaugeProvider(`store.${name}.entries`, () => store.stats().entries);
            this.telemetry.registerGaugeProvider(`store.${name}.size`, () => store.stats().totalSize, {
                unit: 'By',
            });
        }
    }
}

const Version = 1;
