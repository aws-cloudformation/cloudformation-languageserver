import { DateTime } from 'luxon';
import * as sinon from 'sinon';
import { StubbedInstance, stubInterface } from 'ts-sinon';
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { CombinedSchemas } from '../../../src/schema/CombinedSchemas';
import { GetSchemaTaskManager } from '../../../src/schema/GetSchemaTaskManager';
import { RegionalSchemasType } from '../../../src/schema/RegionalSchemas';
import { SamSchemasType } from '../../../src/schema/SamSchemas';
import { SchemaRetriever } from '../../../src/schema/SchemaRetriever';
import { SchemaStore } from '../../../src/schema/SchemaStore';
import { ISettingsSubscriber } from '../../../src/settings/ISettingsSubscriber';
import { DefaultSettings, Settings } from '../../../src/settings/Settings';
import { AwsRegion } from '../../../src/utils/Region';
import { PartialDataObserver } from '../../../src/utils/SubscriptionManager';
import { getTestPrivateSchemas, samFileType, Schemas, SamSchemaFiles, schemaFileType } from '../../utils/SchemaUtils';

describe('SchemaRetriever', () => {
    const defaultRegion = DefaultSettings.profile.region;
    const schemaStore = stubInterface<SchemaStore>();
    const getPublicSchemasStub = sinon.stub().resolves(schemaFileType([Schemas.S3Bucket]));
    const getPrivateResourcesStub = sinon.stub().resolves(getTestPrivateSchemas());
    const getSamSchemasStub = sinon.stub().resolves(samFileType([SamSchemaFiles.ServerlessFunction]));

    let settingsManager: ISettingsSubscriber;
    let taskManagerStub: StubbedInstance<GetSchemaTaskManager>;
    let schemaRetriever: SchemaRetriever;

    beforeEach(() => {
        schemaStore.getPublicSchemaRegions.returns([]);
        schemaStore.getPublicSchemas.returns(undefined);
        schemaStore.getSamSchemas.returns(undefined);

        getPublicSchemasStub.resetHistory();
        getPrivateResourcesStub.resetHistory();
        getSamSchemasStub.resetHistory();

        settingsManager = {
            subscribe: sinon.stub(),
            getCurrentSettings: sinon.stub(),
        };

        taskManagerStub = stubInterface<GetSchemaTaskManager>();
        schemaRetriever = new SchemaRetriever(
            schemaStore,
            getPublicSchemasStub,
            getPrivateResourcesStub,
            getSamSchemasStub,
            taskManagerStub,
        );

        expect(taskManagerStub.addTask.calledWith(DefaultSettings.profile.region)).toBe(true);
        expect(taskManagerStub.runPrivateTask.called).toBe(false);
        expect(taskManagerStub.runSamTask.called).toBe(false);
    });

    afterEach(() => {
        sinon.restore();
    });

    describe('constructor', () => {
        it('should not add task if schemas already present', () => {
            const newStore = stubInterface<SchemaStore>();
            const newTaskManagerStub = stubInterface<GetSchemaTaskManager>();

            newStore.getPublicSchemas.returns(createPublicSchema(1, defaultRegion));
            new SchemaRetriever(
                newStore,
                getPublicSchemasStub,
                getPrivateResourcesStub,
                getSamSchemasStub,
                newTaskManagerStub,
            );

            expect(newTaskManagerStub.addTask.called).toBe(false);
        });
    });

    describe('initialize', () => {
        it('should add task for stale public schemas', () => {
            const staleDate = DateTime.now().minus({ days: 8 }).toMillis();
            schemaStore.getPublicSchemaRegions.returns([defaultRegion]);
            schemaStore.getPublicSchemas.returns(createPublicSchema(staleDate, defaultRegion));

            taskManagerStub.addTask.resetHistory();
            schemaRetriever.initialize();

            expect(taskManagerStub.addTask.called).toBe(true);
        });

        it('should not add task for fresh public schemas', () => {
            const freshDate = DateTime.now().minus({ days: 3 }).toMillis();
            schemaStore.getPublicSchemaRegions.returns([defaultRegion]);
            schemaStore.getPublicSchemas.returns(createPublicSchema(freshDate, defaultRegion));

            taskManagerStub.addTask.resetHistory();
            schemaRetriever.initialize();

            expect(taskManagerStub.addTask.called).toBe(false);
        });

        it('should run SAM task for missing SAM schemas', () => {
            schemaStore.getSamSchemas.returns(undefined);
            schemaRetriever.initialize();

            expect(taskManagerStub.runSamTask.called).toBe(true);
        });

        it('should run SAM task for stale SAM schemas', () => {
            const staleDate = DateTime.now().minus({ days: 10 }).toMillis();
            schemaStore.getSamSchemas.returns(createSamSchema(staleDate));

            taskManagerStub.runSamTask.resetHistory();
            schemaRetriever.initialize();

            expect(taskManagerStub.runSamTask.called).toBe(true);
        });

        it('should not run SAM task for fresh SAM schemas', () => {
            const freshDate = DateTime.now().minus({ days: 1 }).toMillis();
            schemaStore.getSamSchemas.returns(createSamSchema(freshDate));

            taskManagerStub.runSamTask.resetHistory();
            schemaRetriever.initialize();

            expect(taskManagerStub.runSamTask.called).toBe(false);
        });

        it('should run private task', () => {
            schemaRetriever.initialize();

            expect(taskManagerStub.runPrivateTask.called).toBe(true);
        });
    });

    describe('configure', () => {
        it('should add task for new region on settings change and run private task', () => {
            let profileObserver: PartialDataObserver<Settings['profile']> | undefined;
            (settingsManager.subscribe as sinon.SinonStub).callsFake((path, observer) => {
                if (path === 'profile') {
                    profileObserver = observer;
                }
                return { unsubscribe: sinon.stub() };
            });

            schemaRetriever.configure(settingsManager);
            taskManagerStub.addTask.resetHistory();

            expect(taskManagerStub.addTask.calledWith('eu-west-1')).toBe(false);
            expect(taskManagerStub.runPrivateTask.called).toBe(false);

            profileObserver?.({ region: 'eu-west-1' as AwsRegion, profile: 'test-profile' });
            expect(taskManagerStub.addTask.calledWith('eu-west-1')).toBe(true);
            expect(taskManagerStub.runPrivateTask.called).toBe(true);
        });
    });

    describe('get', () => {
        it('should return combined schemas for default region', () => {
            const combinedResult1 = stubInterface<CombinedSchemas>();
            schemaStore.get.withArgs(defaultRegion, DefaultSettings.profile.profile).returns(combinedResult1);

            const combinedResult2 = stubInterface<CombinedSchemas>();
            schemaStore.get.withArgs(AwsRegion.EU_WEST_1, 'anotherProfile').returns(combinedResult2);

            expect(schemaRetriever.getDefault()).toBe(combinedResult1);
            expect(schemaRetriever.get(AwsRegion.EU_WEST_1, 'anotherProfile')).toBe(combinedResult2);
        });
    });
});

function createPublicSchema(date: number, region: string): RegionalSchemasType {
    return {
        version: '1',
        region,
        schemas: schemaFileType([Schemas.S3Bucket]),
        firstCreatedMs: date,
        lastModifiedMs: date,
    };
}

function createSamSchema(date: number): SamSchemasType {
    return {
        version: '1',
        schemas: schemaFileType([SamSchemaFiles.ServerlessFunction]),
        firstCreatedMs: date,
        lastModifiedMs: date,
    };
}
