import * as sinon from 'sinon';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { MemoryDataStoreFactoryProvider } from '../../../src/datastore/DataStore';
import { SamStoreKey } from '../../../src/schema/SamSchemas';
import { SchemaStore } from '../../../src/schema/SchemaStore';
import { AwsRegion } from '../../../src/utils/Region';
import { Schemas, schemaFileType } from '../../utils/SchemaUtils';

const OneHourMs = 60 * 60 * 1000;

function regionalSchemas(lastModifiedMs: number, region: AwsRegion) {
    return {
        version: 1,
        region,
        schemas: schemaFileType([Schemas.S3Bucket]),
        firstCreatedMs: lastModifiedMs,
        lastModifiedMs,
    };
}

/**
 * The age gauges are sampled on every telemetry export, and a single store read decrypts and decodes
 * the entire schema payload, so they must not touch the store.
 */
describe('SchemaStore age gauges', () => {
    let schemaStore: SchemaStore;

    beforeEach(() => {
        schemaStore = new SchemaStore(new MemoryDataStoreFactoryProvider());
    });

    afterEach(() => {
        sinon.restore();
    });

    it('should report the public schema age without reading the store', async () => {
        const region = 'us-east-1' as AwsRegion;
        await schemaStore.publicSchemas.put(region, regionalSchemas(Date.now() - OneHourMs, region));
        schemaStore.getPublicSchemas(region);

        const publicGet = sinon.spy(schemaStore.publicSchemas, 'get');
        const publicKeys = sinon.spy(schemaStore.publicSchemas, 'keys');
        const age = schemaStore.getPublicSchemasMaxAge();

        expect(age).toBeGreaterThanOrEqual(OneHourMs);
        expect(publicGet.callCount).toBe(0);
        expect(publicKeys.callCount).toBe(0);
    });

    it('should report the SAM schema age without reading the store', async () => {
        await schemaStore.samSchemas.put(SamStoreKey, {
            version: 1,
            identifier: SamStoreKey,
            schemas: [],
            firstCreatedMs: Date.now() - OneHourMs,
            lastModifiedMs: Date.now() - OneHourMs,
        });
        schemaStore.getSamSchemas();

        const samGet = sinon.spy(schemaStore.samSchemas, 'get');
        const age = schemaStore.getSamSchemaAge();

        expect(age).toBeGreaterThanOrEqual(OneHourMs);
        expect(samGet.callCount).toBe(0);
    });

    it('should report a maximally stale age when no schemas have been stored', () => {
        expect(schemaStore.getPublicSchemasMaxAge()).toBe(Number.MAX_SAFE_INTEGER);
        expect(schemaStore.getSamSchemaAge()).toBe(Number.MAX_SAFE_INTEGER);
    });

    it('should read the store only once across repeated gauge samples', async () => {
        const region = 'us-east-1' as AwsRegion;
        await schemaStore.publicSchemas.put(region, regionalSchemas(Date.now() - OneHourMs, region));

        const publicGet = sinon.spy(schemaStore.publicSchemas, 'get');
        schemaStore.getPublicSchemasMaxAge();
        const readsAfterFirstSample = publicGet.callCount;
        for (let sample = 0; sample < 10; sample++) {
            schemaStore.getPublicSchemasMaxAge();
        }

        expect(readsAfterFirstSample).toBe(1);
        expect(publicGet.callCount).toBe(readsAfterFirstSample);
    });

    it('should report the age of the stalest region when several are cached', async () => {
        const stale = 'us-east-1' as AwsRegion;
        const fresh = 'eu-west-1' as AwsRegion;
        await schemaStore.publicSchemas.put(stale, regionalSchemas(Date.now() - 5 * OneHourMs, stale));
        await schemaStore.publicSchemas.put(fresh, regionalSchemas(Date.now(), fresh));
        schemaStore.getPublicSchemas(stale);
        schemaStore.getPublicSchemas(fresh);

        const age = schemaStore.getPublicSchemasMaxAge();

        expect(age).toBeGreaterThanOrEqual(5 * OneHourMs);
        expect(age).toBeLessThan(6 * OneHourMs);
    });

    it('should re-read the age after invalidate so a stale cached value is never reported', async () => {
        const region = 'us-east-1' as AwsRegion;
        await schemaStore.publicSchemas.put(region, regionalSchemas(Date.now() - 5 * OneHourMs, region));
        schemaStore.getPublicSchemas(region);
        expect(schemaStore.getPublicSchemasMaxAge()).toBeGreaterThanOrEqual(5 * OneHourMs);

        await schemaStore.publicSchemas.put(region, regionalSchemas(Date.now(), region));
        schemaStore.invalidate();

        expect(schemaStore.getPublicSchemasMaxAge()).toBeLessThan(OneHourMs);
    });
});
