import { DateTime } from 'luxon';
import * as sinon from 'sinon';
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { MemoryDataStoreFactoryProvider } from '../../../src/datastore/DataStore';
import { PrivateStoreKey } from '../../../src/schema/PrivateSchemas';
import { SamStoreKey } from '../../../src/schema/SamSchemas';
import { SchemaStore } from '../../../src/schema/SchemaStore';
import { AwsRegion } from '../../../src/utils/Region';
import { getTestPrivateSchemas, Schemas, SamSchemaFiles, schemaFileType } from '../../utils/SchemaUtils';

describe('SchemaStore', () => {
    let schemaStore: SchemaStore;
    let createSpy: sinon.SinonSpy;

    beforeEach(() => {
        schemaStore = new SchemaStore(new MemoryDataStoreFactoryProvider());
        createSpy = sinon.spy(schemaStore as any, 'createCombinedSchemas');
    });

    afterEach(() => {
        sinon.restore();
    });

    describe('get', () => {
        it('should return combined schemas for region', async () => {
            const region = 'us-east-1' as AwsRegion;
            await schemaStore.publicSchemas.put(region, {
                version: 1,
                region,
                schemas: schemaFileType([Schemas.S3Bucket]),
                firstCreatedMs: Date.now(),
                lastModifiedMs: Date.now(),
            });

            const combined = schemaStore.get(region, 'default');
            expect(createSpy.callCount).toBe(1);

            expect(combined.regionalSchemas?.region).toBe(region);
            expect(combined.regionalSchemas?.schemas.size).toBe(1);

            expect(combined.privateSchemas).toBeUndefined();
            expect(combined.samSchemas).toBeUndefined();
        });

        it('should rebuild combined schemas when region changes', async () => {
            await schemaStore.publicSchemas.put('us-east-1', {
                version: 1,
                region: 'us-east-1',
                schemas: schemaFileType([Schemas.S3Bucket]),
                firstCreatedMs: Date.now(),
                lastModifiedMs: Date.now(),
            });

            await schemaStore.publicSchemas.put('eu-west-1', {
                version: 1,
                region: 'eu-west-1',
                schemas: schemaFileType([Schemas.EC2Instance]),
                firstCreatedMs: Date.now(),
                lastModifiedMs: Date.now(),
            });

            const combined1 = schemaStore.get('us-east-1' as AwsRegion, 'default');
            const combined2 = schemaStore.get('eu-west-1' as AwsRegion, 'default');

            expect(combined1.regionalSchemas?.region).toBe('us-east-1');
            expect(combined2.regionalSchemas?.region).toBe('eu-west-1');
            expect(createSpy.callCount).toBe(2);
        });

        it('should cache combined schemas for same region', async () => {
            const region = 'us-east-1' as AwsRegion;
            await schemaStore.publicSchemas.put(region, {
                version: 1,
                region,
                schemas: schemaFileType([Schemas.S3Bucket]),
                firstCreatedMs: Date.now(),
                lastModifiedMs: Date.now(),
            });

            const combined1 = schemaStore.get(region, 'default');
            const combined2 = schemaStore.get(region, 'default');

            expect(combined1).toBe(combined2);
            expect(createSpy.callCount).toBe(1);
        });

        it('should include private schemas in combined result', async () => {
            await schemaStore.publicSchemas.put('us-east-1', {
                version: 1,
                region: 'us-east-1',
                schemas: schemaFileType([Schemas.S3Bucket]),
                firstCreatedMs: Date.now(),
                lastModifiedMs: Date.now(),
            });

            await schemaStore.privateSchemas.put(PrivateStoreKey, {
                version: 1,
                identifier: PrivateStoreKey,
                schemas: getTestPrivateSchemas(),
                firstCreatedMs: Date.now(),
                lastModifiedMs: Date.now(),
            });

            const combined = schemaStore.get('us-east-1' as AwsRegion, 'default');
            expect(createSpy.callCount).toBe(1);

            expect(combined.regionalSchemas?.region).toBe('us-east-1');
            expect(combined.regionalSchemas?.schemas.size).toBe(1);

            expect(combined.privateSchemas?.schemas.size).toBe(2);
            expect(combined.samSchemas).toBeUndefined();
        });

        it('should include SAM schemas in combined result', async () => {
            await schemaStore.publicSchemas.put('us-east-1', {
                version: 1,
                region: 'us-east-1',
                schemas: schemaFileType([Schemas.S3Bucket]),
                firstCreatedMs: Date.now(),
                lastModifiedMs: Date.now(),
            });

            await schemaStore.samSchemas.put(SamStoreKey, {
                version: 1,
                schemas: schemaFileType([SamSchemaFiles.ServerlessFunction]),
                firstCreatedMs: Date.now(),
                lastModifiedMs: Date.now(),
            });

            const combined = schemaStore.get('us-east-1' as AwsRegion, 'default');

            expect(createSpy.callCount).toBe(1);

            expect(combined.regionalSchemas?.region).toBe('us-east-1');
            expect(combined.regionalSchemas?.schemas.size).toBe(1);

            expect(combined.privateSchemas).toBeUndefined();
            expect(combined.samSchemas?.schemas.size).toBe(1);
        });

        it('should not rebuild when requesting unavailable region', async () => {
            await schemaStore.publicSchemas.put('us-east-1', {
                version: 1,
                region: 'us-east-1',
                schemas: schemaFileType([Schemas.S3Bucket]),
                firstCreatedMs: Date.now(),
                lastModifiedMs: Date.now(),
            });

            const combined1 = schemaStore.get('us-east-1' as AwsRegion, 'default');
            const combined2 = schemaStore.get('ap-south-1' as AwsRegion, 'default');

            expect(combined1).toBe(combined2);
            expect(combined2.regionalSchemas?.region).toBe('us-east-1');
            expect(createSpy.callCount).toBe(1);
        });

        it('should not rebuild combined schemas on repeated calls with same region', async () => {
            await schemaStore.publicSchemas.put('us-east-1', {
                version: 1,
                region: 'us-east-1',
                schemas: schemaFileType([Schemas.S3Bucket]),
                firstCreatedMs: Date.now(),
                lastModifiedMs: Date.now(),
            });

            schemaStore.get('us-east-1' as AwsRegion, 'default');
            schemaStore.get('us-east-1' as AwsRegion, 'default');
            schemaStore.get('us-east-1' as AwsRegion, 'default');

            expect(createSpy.callCount).toBe(1);
        });

        it('should rebuild only when regional data is available', async () => {
            const firstRegion = 'us-east-1';
            const secondRegion = 'us-west-2';
            let combined = schemaStore.get(firstRegion as AwsRegion, 'default');

            expect(createSpy.callCount).toBe(1);
            expect(combined.regionalSchemas).toBeUndefined();

            await schemaStore.publicSchemas.put(firstRegion, {
                version: 1,
                region: firstRegion,
                schemas: schemaFileType([Schemas.S3Bucket]),
                firstCreatedMs: Date.now(),
                lastModifiedMs: Date.now(),
            });

            combined = schemaStore.get(firstRegion as AwsRegion, 'default');
            expect(createSpy.callCount).toBe(2);
            expect(combined.regionalSchemas).toBeDefined();

            combined = schemaStore.get(secondRegion as AwsRegion, 'default');
            expect(createSpy.callCount).toBe(2);
            expect(combined.regionalSchemas?.region).toBe(firstRegion);

            await schemaStore.publicSchemas.put(secondRegion, {
                version: 1,
                region: secondRegion,
                schemas: schemaFileType([Schemas.S3Bucket]),
                firstCreatedMs: Date.now(),
                lastModifiedMs: Date.now(),
            });

            combined = schemaStore.get(secondRegion as AwsRegion, 'default');
            expect(createSpy.callCount).toBe(3);
            expect(combined.regionalSchemas?.region).toBe(secondRegion);
        });
    });

    describe('getPublicSchemas', () => {
        it('should return public schemas for region', async () => {
            const region = 'us-west-2';
            const schemas = schemaFileType([Schemas.S3Bucket, Schemas.EC2Instance]);
            await schemaStore.publicSchemas.put(region, {
                version: 1,
                region,
                schemas,
                firstCreatedMs: Date.now(),
                lastModifiedMs: Date.now(),
            });

            expect(schemaStore.getPublicSchemas(region)?.schemas).toEqual(schemas);
            expect(schemaStore.getPublicSchemas('ap-south-1')).toBeUndefined();
        });

        it('should return undefined for missing region', () => {
            expect(schemaStore.getPublicSchemas('us-east-1')).toBeUndefined();
        });
    });

    describe('getPublicSchemaRegions', () => {
        it('should return all stored regions', async () => {
            await schemaStore.publicSchemas.put('us-east-1', {
                version: 1,
                region: 'us-east-1',
                schemas: schemaFileType([Schemas.S3Bucket]),
                firstCreatedMs: Date.now(),
                lastModifiedMs: Date.now(),
            });

            await schemaStore.publicSchemas.put('eu-west-1', {
                version: 1,
                region: 'eu-west-1',
                schemas: schemaFileType([Schemas.EC2Instance]),
                firstCreatedMs: Date.now(),
                lastModifiedMs: Date.now(),
            });

            expect(schemaStore.getPublicSchemaRegions()).toEqual(['us-east-1', 'eu-west-1']);
        });

        it('should return empty array when no regions stored', () => {
            expect(schemaStore.getPublicSchemaRegions()).toEqual([]);
        });
    });

    describe('getPrivateSchemas', () => {
        it('should return private schemas', async () => {
            const privateSchemas = getTestPrivateSchemas();
            await schemaStore.privateSchemas.put(PrivateStoreKey, {
                version: 1,
                identifier: PrivateStoreKey,
                schemas: privateSchemas,
                firstCreatedMs: Date.now(),
                lastModifiedMs: Date.now(),
            });

            expect(schemaStore.getPrivateSchemas()?.schemas.length).toBe(privateSchemas.length);
        });

        it('should return undefined when no private schemas stored', () => {
            expect(schemaStore.getPrivateSchemas()).toBeUndefined();
        });
    });

    describe('getSamSchemas', () => {
        it('should return SAM schemas', async () => {
            const samSchemas = schemaFileType([SamSchemaFiles.ServerlessFunction, SamSchemaFiles.ServerlessApi]);
            await schemaStore.samSchemas.put(SamStoreKey, {
                version: 1,
                schemas: samSchemas,
                firstCreatedMs: Date.now(),
                lastModifiedMs: Date.now(),
            });

            expect(schemaStore.getSamSchemas()?.schemas.length).toBe(2);
        });

        it('should return undefined when no SAM schemas stored', () => {
            expect(schemaStore.getSamSchemas()).toBeUndefined();
        });
    });

    describe('getSamSchemaAge', () => {
        it('should return age in milliseconds for existing SAM schemas', async () => {
            const pastTime = DateTime.now().minus({ days: 1 }).toMillis();
            await schemaStore.samSchemas.put(SamStoreKey, {
                version: 1,
                schemas: schemaFileType([SamSchemaFiles.ServerlessFunction]),
                firstCreatedMs: pastTime,
                lastModifiedMs: pastTime,
            });

            const expectedAge = DateTime.now().toMillis() - pastTime;
            expect(Math.abs(schemaStore.getSamSchemaAge() - expectedAge)).toBeLessThanOrEqual(60 * 1000);
        });

        it('should return 0 when no SAM schemas exist', () => {
            expect(schemaStore.getSamSchemaAge()).toBe(0);
        });
    });

    describe('getPublicSchemasMaxAge', () => {
        it('should return max age across all regions', async () => {
            const oldTime = DateTime.now().minus({ days: 5 }).toMillis();
            const newTime = DateTime.now().minus({ days: 1 }).toMillis();

            await schemaStore.publicSchemas.put('us-east-1', {
                version: 1,
                region: 'us-east-1',
                schemas: schemaFileType([Schemas.S3Bucket]),
                firstCreatedMs: oldTime,
                lastModifiedMs: oldTime,
            });

            await schemaStore.publicSchemas.put('eu-west-1', {
                version: 1,
                region: 'eu-west-1',
                schemas: schemaFileType([Schemas.EC2Instance]),
                firstCreatedMs: newTime,
                lastModifiedMs: newTime,
            });

            const expectedAge = DateTime.now().toMillis() - oldTime;
            expect(Math.abs(schemaStore.getPublicSchemasMaxAge() - expectedAge)).toBeLessThanOrEqual(60 * 1000);
        });

        it('should return 0 when no public schemas exist', () => {
            expect(schemaStore.getPublicSchemasMaxAge()).toBe(0);
        });
    });

    describe('invalidate', () => {
        it('should clear cached combined schemas', async () => {
            await schemaStore.publicSchemas.put('us-east-1', {
                version: 1,
                region: 'us-east-1',
                schemas: schemaFileType([Schemas.S3Bucket]),
                firstCreatedMs: Date.now(),
                lastModifiedMs: Date.now(),
            });

            const combined1 = schemaStore.get('us-east-1' as AwsRegion, 'default');
            expect(createSpy.callCount).toBe(1);

            schemaStore.invalidate();
            const combined2 = schemaStore.get('us-east-1' as AwsRegion, 'default');
            expect(combined1).not.toBe(combined2);
            expect(createSpy.callCount).toBe(2);
        });
    });
});
