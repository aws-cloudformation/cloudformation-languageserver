import * as sinon from 'sinon';
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { MemoryDataStoreFactoryProvider } from '../../../src/datastore/DataStore';
import { GetSchemaTaskManager } from '../../../src/schema/GetSchemaTaskManager';
import { SchemaStore } from '../../../src/schema/SchemaStore';
import { getTestPrivateSchemas, samFileType, Schemas, SamSchemaFiles, schemaFileType } from '../../utils/SchemaUtils';
import { waitFor } from '../../utils/Utils';

describe('GetSchemaTaskManager', () => {
    const timeout = 250;

    let schemaStore: SchemaStore;
    let taskManager: GetSchemaTaskManager;
    let getPublicSchemasStub: sinon.SinonStub;
    let getPrivateResourcesStub: sinon.SinonStub;
    let getSamSchemasStub: sinon.SinonStub;

    beforeEach(() => {
        schemaStore = new SchemaStore(new MemoryDataStoreFactoryProvider());

        getPublicSchemasStub = sinon.stub().resolves(schemaFileType([Schemas.S3Bucket]));
        getPrivateResourcesStub = sinon.stub().resolves(getTestPrivateSchemas());
        getSamSchemasStub = sinon.stub().resolves(samFileType([SamSchemaFiles.ServerlessFunction]));

        taskManager = new GetSchemaTaskManager(
            schemaStore,
            getPublicSchemasStub,
            getPrivateResourcesStub,
            getSamSchemasStub,
        );
    });

    afterEach(() => {
        sinon.restore();
    });

    describe('addTask', () => {
        it('should add and run public schema task for new region', async () => {
            taskManager.addTask('us-east-1');
            taskManager.addTask('us-east-1');
            taskManager.addTask('eu-west-1');
            taskManager.addTask('eu-west-2');

            await waitFor(() => {
                expect(getPublicSchemasStub.calledWith('eu-west-2')).toBe(true);
                expect(getPublicSchemasStub.calledWith('eu-west-1')).toBe(true);
                expect(getPublicSchemasStub.calledWith('us-east-1')).toBe(true);
            }, timeout);
        });

        it('should store schemas in datastore after task completion', async () => {
            taskManager.addTask('us-west-2');

            await waitFor(() => {
                const schemas = schemaStore.getPublicSchemas('us-west-2');
                expect(schemas).toBeDefined();
                expect(schemas?.region).toBe('us-west-2');
            }, timeout);
        });

        it('should preserve firstCreatedMs when provided', async () => {
            const firstCreatedMs = Date.now() - 10000;
            taskManager.addTask('ap-south-1', firstCreatedMs);
            await waitFor(() => {
                const schemas = schemaStore.getPublicSchemas('ap-south-1');
                expect(schemas?.firstCreatedMs).toBe(firstCreatedMs);
            }, timeout);
        });

        it('should retry failed tasks', async () => {
            getPublicSchemasStub.onFirstCall().rejects(new Error('Network error'));
            getPublicSchemasStub.onSecondCall().resolves(schemaFileType([Schemas.EC2Instance]));

            taskManager.addTask('us-east-1');
            await waitFor(() => expect(getPublicSchemasStub.callCount).toBe(2), timeout);
        });
    });

    describe('runPrivateTask', () => {
        it('should fetch private schemas', async () => {
            taskManager.runPrivateTask();
            await waitFor(() => expect(getPrivateResourcesStub.called).toBe(true), timeout);
        });

        it('should store private schemas in datastore', async () => {
            taskManager.runPrivateTask();
            await waitFor(() => {
                const schemas = schemaStore.getPrivateSchemas();
                expect(schemas).toBeDefined();
                expect(schemas?.schemas.length).toBeGreaterThan(0);
            }, timeout);
        });

        it('should invalidate combined schemas after completion', async () => {
            const invalidateSpy = sinon.spy(schemaStore, 'invalidate');

            taskManager.runPrivateTask();
            await waitFor(() => expect(invalidateSpy.called).toBe(true), timeout);
        });

        it('should handle errors gracefully', async () => {
            getPrivateResourcesStub.rejects(new Error('Auth error'));

            taskManager.runPrivateTask();
            await waitFor(() => {
                const schemas = schemaStore.getPrivateSchemas();
                expect(schemas).toBeUndefined();
            }, timeout);
        });
    });

    describe('runSamTask', () => {
        it('should fetch SAM schemas', async () => {
            taskManager.runSamTask();
            await waitFor(() => expect(getSamSchemasStub.called).toBe(true), timeout);
        });

        it('should store SAM schemas in datastore', async () => {
            taskManager.runSamTask();
            await waitFor(() => {
                const schemas = schemaStore.getSamSchemas();
                expect(schemas).toBeDefined();
                expect(schemas?.schemas.length).toBeGreaterThan(0);
            }, timeout);
        });

        it('should invalidate combined schemas after completion', async () => {
            const invalidateSpy = sinon.spy(schemaStore, 'invalidate');

            taskManager.runSamTask();
            await waitFor(() => expect(invalidateSpy.called).toBe(true), timeout);
        });

        it('should handle errors gracefully', async () => {
            getSamSchemasStub.rejects(new Error('Download error'));

            taskManager.runSamTask();
            await waitFor(() => {
                const schemas = schemaStore.getSamSchemas();
                expect(schemas).toBeUndefined();
            }, timeout);
        });
    });
});
