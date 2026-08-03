import { beforeEach, describe, expect, it } from 'vitest';
import {
    DataStore,
    DataStoreFactoryProvider,
    MemoryDataStoreFactoryProvider,
    Persistence,
    StoreName,
} from '../../../src/datastore/DataStore';
import { HookSchemaStore } from '../../../src/hooks/HookSchemaStore';
import type { DescribeHookResult } from '../../../src/hooks/HooksRequestType';

class RecordingFactoryProvider implements DataStoreFactoryProvider {
    readonly requests: Array<{ store: StoreName; persistence: Persistence }> = [];
    private readonly delegate = new MemoryDataStoreFactoryProvider();

    get(store: StoreName, persistence: Persistence): DataStore {
        this.requests.push({ store, persistence });
        return this.delegate.get(store, persistence);
    }

    initialize(): Promise<void> {
        return this.delegate.initialize();
    }

    close(): Promise<void> {
        return this.delegate.close();
    }
}

function schema(typeName: string): DescribeHookResult {
    return {
        typeName,
        arn: `arn:aws:cloudformation:us-east-1:123:type/hook/${typeName.replaceAll('::', '-')}`,
        visibility: 'PRIVATE',
        schema: '{"typeName":"' + typeName + '"}',
    };
}

describe('HookSchemaStore', () => {
    let clock: number;
    const now = () => clock;

    beforeEach(() => {
        clock = 1000;
    });

    it('requests an in-memory store so private hook schemas are never written to disk', () => {
        const factory = new RecordingFactoryProvider();
        new HookSchemaStore(factory, now);

        expect(factory.requests).toEqual([{ store: StoreName.hook_schemas, persistence: Persistence.memory }]);
    });

    it('round-trips a schema by type name', async () => {
        const store = new HookSchemaStore(new MemoryDataStoreFactoryProvider(), now);

        expect(store.get('Private::Guard::A')).toBeUndefined();
        expect(await store.put('Private::Guard::A', schema('Private::Guard::A'))).toBe(true);

        const record = store.get('Private::Guard::A');
        expect(record?.typeName).toBe('Private::Guard::A');
        expect(record?.schema).toEqual(schema('Private::Guard::A'));
        expect(record?.firstCreatedMs).toBe(1000);
        expect(record?.lastModifiedMs).toBe(1000);
    });

    it('preserves firstCreatedMs and advances lastModifiedMs on re-put', async () => {
        const store = new HookSchemaStore(new MemoryDataStoreFactoryProvider(), now);

        await store.put('T', schema('T'));
        clock += 500;
        await store.put('T', schema('T'));

        const record = store.get('T');
        expect(record?.firstCreatedMs).toBe(1000);
        expect(record?.lastModifiedMs).toBe(1500);
    });

    it('namespaces keys so hook records cannot collide with other stored keys', async () => {
        const factory = new MemoryDataStoreFactoryProvider();
        const store = new HookSchemaStore(factory, now);

        await store.put('Private::Guard::A', schema('Private::Guard::A'));

        expect(factory.get(StoreName.hook_schemas, Persistence.memory).keys(10)).toEqual(['hook:Private::Guard::A']);
    });

    it('keeps records for distinct type names separate', async () => {
        const store = new HookSchemaStore(new MemoryDataStoreFactoryProvider(), now);

        await store.put('A', schema('A'));
        await store.put('B', schema('B'));

        expect(store.get('A')?.schema.typeName).toBe('A');
        expect(store.get('B')?.schema.typeName).toBe('B');
    });

    it('removes a single record', async () => {
        const store = new HookSchemaStore(new MemoryDataStoreFactoryProvider(), now);

        await store.put('A', schema('A'));
        await store.put('B', schema('B'));
        await store.remove('A');

        expect(store.get('A')).toBeUndefined();
        expect(store.get('B')).toBeDefined();
    });

    it('clears every record', async () => {
        const store = new HookSchemaStore(new MemoryDataStoreFactoryProvider(), now);

        await store.put('A', schema('A'));
        await store.put('B', schema('B'));
        await store.clear();

        expect(store.get('A')).toBeUndefined();
        expect(store.get('B')).toBeUndefined();
    });

    it('reports age from the last modification, and undefined when absent', async () => {
        const store = new HookSchemaStore(new MemoryDataStoreFactoryProvider(), now);

        expect(store.getAgeMs('T')).toBeUndefined();

        await store.put('T', schema('T'));
        expect(store.getAgeMs('T')).toBe(0);

        clock += 250;
        expect(store.getAgeMs('T')).toBe(250);
    });
});
