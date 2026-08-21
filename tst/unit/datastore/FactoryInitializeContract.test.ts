import { describe, expect, it } from 'vitest';
import { MultiDataStoreFactoryProvider, Persistence, StoreName } from '../../../src/datastore/DataStore';

/**
 * The two persisted-store backends disagree about whether get() is legal before initialize():
 * FileStoreFactory populates its store map in the constructor, LMDBStoreFactory only in
 * initialize(). Consumers that resolve stores eagerly — SchemaStore does, in its field
 * initialisers — therefore work on one backend and throw on the other, which is only reachable
 * with FileDb disabled. Pin both halves so the asymmetry cannot regress silently again.
 */
describe('datastore factory initialize contract', () => {
    it('should throw when the LMDB-backed provider is used before initialize', () => {
        const provider = new MultiDataStoreFactoryProvider({ isEnabled: () => false } as never);

        expect(() => provider.get(StoreName.public_schemas, Persistence.local)).toThrow(
            /Store public_schemas not found/,
        );
    });

    it('should resolve the store once the LMDB-backed provider is initialized', async () => {
        const provider = new MultiDataStoreFactoryProvider({ isEnabled: () => false } as never);
        await provider.initialize();

        expect(provider.get(StoreName.public_schemas, Persistence.local)).toBeDefined();

        await provider.close();
    });

    it('should resolve the store on the file-backed provider without initialize', async () => {
        const provider = new MultiDataStoreFactoryProvider({ isEnabled: () => true } as never);

        expect(provider.get(StoreName.public_schemas, Persistence.local)).toBeDefined();

        await provider.close();
    });
});
