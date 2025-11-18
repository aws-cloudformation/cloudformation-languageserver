import { readdirSync, rmSync } from 'fs';
import { join } from 'path';
import { open, RootDatabase, RootDatabaseOptionsWithPath } from 'lmdb';
import { Logger } from 'pino';
import { LoggerFactory } from '../telemetry/LoggerFactory';
import { ScopedTelemetry } from '../telemetry/ScopedTelemetry';
import { Telemetry } from '../telemetry/TelemetryDecorator';
import { isWindows } from '../utils/Environment';
import { toString } from '../utils/String';
import { DataStore, DataStoreFactory, StoreName } from './DataStore';
import { LMDBStore } from './lmdb/LMDBStore';
import { LockedLMDBStore } from './lmdb/LockedLMDBStore';
import { stats } from './lmdb/Stats';
import { encryptionStrategy } from './lmdb/Utils';

export class LMDBStoreFactory implements DataStoreFactory {
    private readonly log: Logger;
    @Telemetry({ scope: 'LMDB.Global' }) private readonly telemetry!: ScopedTelemetry;

    private readonly lmdbDir: string;
    private readonly timeout: NodeJS.Timeout;
    private readonly env: RootDatabase;

    private readonly stores = new Map<StoreName, LMDBStore>();

    constructor(rootDir: string, storeNames: StoreName[] = [StoreName.public_schemas, StoreName.sam_schemas]) {
        this.log = LoggerFactory.getLogger('LMDB.Global');

        this.lmdbDir = join(rootDir, 'lmdb');
        const config: RootDatabaseOptionsWithPath = {
            path: join(this.lmdbDir, Version),
            maxDbs: 10,
            mapSize: TotalMaxDbSize,
            encoding: Encoding,
            encryptionKey: encryptionStrategy(VersionNumber),
        };

        if (isWindows) {
            config.noSubdir = false;
            config.overlappingSync = false;
        }

        this.log.info(
            {
                path: config.path,
                maxDbs: config.maxDbs,
                mapSize: config.mapSize,
                encoding: config.encoding,
                noSubdir: config.noSubdir,
                overlappingSync: config.overlappingSync,
            },
            `Initializing LMDB v${VersionNumber} with stores: ${toString(storeNames)}`,
        );

        this.env = open(config);

        for (const store of storeNames) {
            const database = this.env.openDB<unknown, string>({
                name: store,
                encoding: Encoding,
            });

            let lmdbStore: LMDBStore;
            if (isWindows) {
                lmdbStore = new LockedLMDBStore(store, database);
            } else {
                lmdbStore = new LMDBStore(store, database);
            }
            this.stores.set(store, lmdbStore);
        }
        this.registerLMDBGauges();

        this.timeout = setTimeout(
            () => {
                this.cleanupOldVersions();
            },
            2 * 60 * 1000,
        );

        this.log.info('Initialized');
    }

    get(store: StoreName): DataStore {
        const val = this.stores.get(store);
        if (val === undefined) {
            throw new Error(`Store ${store} not found. Available stores: ${[...this.stores.keys()].join(', ')}`);
        }
        return val;
    }

    storeNames(): ReadonlyArray<string> {
        return [...this.stores.keys()];
    }

    async close(): Promise<void> {
        // Clear the stores map but don't close individual stores
        // LMDB will close them when we close the environment
        clearTimeout(this.timeout);
        this.stores.clear();
        await this.env.close();
    }

    private cleanupOldVersions(): void {
        const entries = readdirSync(this.lmdbDir, { withFileTypes: true });
        for (const entry of entries) {
            try {
                if (entry.name !== Version) {
                    this.telemetry.count('oldVersion.cleanup.count', 1);
                    rmSync(join(this.lmdbDir, entry.name), { recursive: true, force: true });
                }
            } catch (error) {
                this.log.error(error, 'Failed to cleanup old LMDB versions');
                this.telemetry.count('oldVersion.cleanup.error', 1);
            }
        }
    }

    private registerLMDBGauges(): void {
        let totalBytes = 0;
        const envStat = stats(this.env);
        this.telemetry.registerGaugeProvider('version', () => VersionNumber);
        this.telemetry.registerGaugeProvider('env.size', () => envStat.totalSize, { unit: 'By' });
        this.telemetry.registerGaugeProvider('env.max.size', () => envStat.maxSize, {
            unit: 'By',
        });
        this.telemetry.registerGaugeProvider('env.entries', () => envStat.entries);
        totalBytes += envStat.totalSize;

        for (const [name, store] of this.stores.entries()) {
            const stat = store.stats();
            totalBytes += stat.totalSize;

            this.telemetry.registerGaugeProvider(`store.${name}.size`, () => stat.totalSize, {
                unit: 'By',
            });
            this.telemetry.registerGaugeProvider(`store.${name}.entries`, () => stat.entries);
        }

        this.telemetry.registerGaugeProvider('total.usage', () => 100 * (totalBytes / TotalMaxDbSize), {
            unit: '%',
        });
        this.telemetry.registerGaugeProvider('total.size', () => totalBytes, {
            unit: 'By',
        });
    }
}

const VersionNumber = 4;
const Version = `v${VersionNumber}`;
const Encoding: 'msgpack' | 'json' | 'string' | 'binary' | 'ordered-binary' = 'msgpack';
const TotalMaxDbSize = 250 * 1024 * 1024; // 250MB max size
