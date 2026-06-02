import { DataStore, DataStoreFactoryProvider, Persistence, StoreName } from '../datastore/DataStore';
import type { DescribeHookResult } from './HooksRequestType';

/** A persisted hook schema record. */
export type HookSchemaRecord = {
    version: string;
    typeName: string;
    schema: DescribeHookResult;
    firstCreatedMs: number;
    lastModifiedMs: number;
};

const HookSchemaVersion = 'v1';

/**
 * Persistent cache of hook schemas, keyed by typeName.
 *
 * Hook schemas are slow to fetch (DescribeType API), change rarely, and are
 * valuable across IDE restarts. Mirrors the SchemaStore pattern used for CFN
 * resource schemas.
 */
export class HookSchemaStore {
    private readonly store: DataStore;

    constructor(dataStoreFactory: DataStoreFactoryProvider) {
        this.store = dataStoreFactory.get(StoreName.hook_schemas, Persistence.local);
    }

    get(typeName: string): HookSchemaRecord | undefined {
        return this.store.get<HookSchemaRecord>(this.key(typeName));
    }

    async put(typeName: string, schema: DescribeHookResult): Promise<void> {
        const now = Date.now();
        const existing = this.get(typeName);
        const record: HookSchemaRecord = {
            version: HookSchemaVersion,
            typeName,
            schema,
            firstCreatedMs: existing?.firstCreatedMs ?? now,
            lastModifiedMs: now,
        };
        await this.store.put(this.key(typeName), record);
    }

    async remove(typeName: string): Promise<void> {
        await this.store.remove(this.key(typeName));
    }

    async clear(): Promise<void> {
        await this.store.clear();
    }

    /** Returns the age (ms) of the record's last modification, or undefined if missing. */
    getAgeMs(typeName: string): number | undefined {
        const record = this.get(typeName);
        return record === undefined ? undefined : Date.now() - record.lastModifiedMs;
    }

    private key(typeName: string): string {
        return `hook:${typeName}`;
    }
}
