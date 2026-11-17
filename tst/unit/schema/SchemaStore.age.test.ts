import * as sinon from 'sinon';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { MemoryDataStoreFactoryProvider } from '../../../src/datastore/DataStore';
import { SamStoreKey } from '../../../src/schema/SamSchemas';
import { SchemaStore } from '../../../src/schema/SchemaStore';
import { AwsRegion } from '../../../src/utils/Region';
import { SamSchemaFiles, Schemas, schemaFileType } from '../../utils/SchemaUtils';

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

function samSchemas(lastModifiedMs: number) {
    return {
        version: 1,
        schemas: schemaFileType([SamSchemaFiles.ServerlessFunction]),
        firstCreatedMs: lastModifiedMs,
        lastModifiedMs,
    };
}

describe('SchemaStore age gauges', () => {
    let schemaStore: SchemaStore;

    beforeEach(() => {
        schemaStore = new SchemaStore(new MemoryDataStoreFactoryProvider());
    });

    afterEach(() => {
        sinon.restore();
    });

    it('should report a maximally stale age when no schemas have been stored', () => {
        expect(schemaStore.getPublicSchemasMaxAge()).toBe(Number.MAX_SAFE_INTEGER);
        expect(schemaStore.getSamSchemaAge()).toBe(Number.MAX_SAFE_INTEGER);
    });

    it('should read the public store only once across repeated gauge samples', async () => {
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

    it('should read the SAM store only once across repeated gauge samples', async () => {
        await schemaStore.samSchemas.put(SamStoreKey, samSchemas(Date.now() - OneHourMs));

        const samGet = sinon.spy(schemaStore.samSchemas, 'get');
        schemaStore.getSamSchemaAge();
        const readsAfterFirstSample = samGet.callCount;
        for (let sample = 0; sample < 10; sample++) {
            schemaStore.getSamSchemaAge();
        }

        expect(readsAfterFirstSample).toBe(1);
        expect(samGet.callCount).toBe(readsAfterFirstSample);
    });

    it('should cache a missing SAM schema across repeated gauge samples', () => {
        const samGet = sinon.spy(schemaStore.samSchemas, 'get');

        for (let sample = 0; sample < 10; sample++) {
            schemaStore.getSamSchemaAge();
        }

        expect(samGet.callCount).toBe(1);
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

    it('should re-read the public age after invalidate so a stale cached value is never reported', async () => {
        const region = 'us-east-1' as AwsRegion;
        await schemaStore.publicSchemas.put(region, regionalSchemas(Date.now() - 5 * OneHourMs, region));
        schemaStore.getPublicSchemas(region);
        expect(schemaStore.getPublicSchemasMaxAge()).toBeGreaterThanOrEqual(5 * OneHourMs);

        await schemaStore.publicSchemas.put(region, regionalSchemas(Date.now(), region));
        schemaStore.invalidate();

        expect(schemaStore.getPublicSchemasMaxAge()).toBeLessThan(OneHourMs);
    });

    it('should re-read the SAM age after invalidate so a stale cached value is never reported', async () => {
        await schemaStore.samSchemas.put(SamStoreKey, samSchemas(Date.now() - 5 * OneHourMs));
        expect(schemaStore.getSamSchemaAge()).toBeGreaterThanOrEqual(5 * OneHourMs);

        await schemaStore.samSchemas.put(SamStoreKey, samSchemas(Date.now()));
        schemaStore.invalidate();

        expect(schemaStore.getSamSchemaAge()).toBeLessThan(OneHourMs);
    });
});
