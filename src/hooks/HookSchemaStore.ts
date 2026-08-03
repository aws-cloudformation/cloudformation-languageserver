import { DataStore, DataStoreFactoryProvider, Persistence, StoreName } from '../datastore/DataStore';
import type { DescribeHookResult } from './HooksRequestType';

export type HookSchemaRecord = {
    version: string;
    typeName: string;
    schema: DescribeHookResult;
    firstCreatedMs: number;
    lastModifiedMs: number;
};

const HookSchemaVersion = 'v1';

export class HookSchemaStore {
    private readonly store: DataStore;

    constructor(
        dataStoreFactory: DataStoreFactoryProvider,
        private readonly now: () => number = Date.now,
    ) {
        this.store = dataStoreFactory.get(StoreName.hook_schemas, Persistence.memory);
    }

    get(typeName: string): HookSchemaRecord | undefined {
        return this.store.get<HookSchemaRecord>(this.key(typeName));
    }

    async put(typeName: string, schema: DescribeHookResult): Promise<boolean> {
        const now = this.now();
        const existing = this.get(typeName);
        const record: HookSchemaRecord = {
            version: HookSchemaVersion,
            typeName,
            schema,
            firstCreatedMs: existing?.firstCreatedMs ?? now,
            lastModifiedMs: now,
        };
        return await this.store.put(this.key(typeName), record);
    }

    async remove(typeName: string): Promise<void> {
        await this.store.remove(this.key(typeName));
    }

    async clear(): Promise<void> {
        await this.store.clear();
    }

    getAgeMs(typeName: string): number | undefined {
        const record = this.get(typeName);
        return record === undefined ? undefined : this.now() - record.lastModifiedMs;
    }

    private key(typeName: string): string {
        return `hook:${typeName}`;
    }
}
