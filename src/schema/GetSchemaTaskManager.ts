import { DescribeTypeOutput } from '@aws-sdk/client-cloudformation';
import { LoggerFactory } from '../telemetry/LoggerFactory';
import { AwsRegion, getRegion } from '../utils/Region';
import { GetSamSchemaTask } from './GetSamSchemaTask';
import { GetPrivateSchemasTask, GetPublicSchemaTask } from './GetSchemaTask';
import { SchemaFileType } from './RegionalSchemas';
import { CloudFormationResourceSchema } from './SamSchemaTransformer';
import { SchemaStore } from './SchemaStore';

export class GetSchemaTaskManager {
    private readonly processedRegions = new Set<AwsRegion>();
    private readonly tasks: GetPublicSchemaTask[] = [];
    private readonly privateTask: GetPrivateSchemasTask;

    private didSamTaskRun = false;
    private readonly samTask: GetSamSchemaTask;
    private readonly log = LoggerFactory.getLogger(GetSchemaTaskManager);
    private isRunning = false;

    constructor(
        private readonly schemas: SchemaStore,
        private readonly getPublicSchemas: (region: AwsRegion) => Promise<SchemaFileType[]>,
        getPrivateResources: () => Promise<DescribeTypeOutput[]>,
        private readonly getSamSchemas: () => Promise<Map<string, CloudFormationResourceSchema>>,
    ) {
        this.privateTask = new GetPrivateSchemasTask(getPrivateResources);
        this.samTask = new GetSamSchemaTask(getSamSchemas);
    }

    addTask(reg: string, regionFirstCreatedMs?: number) {
        const region = getRegion(reg);

        if (!this.processedRegions.has(region)) {
            this.tasks.push(new GetPublicSchemaTask(region, this.getPublicSchemas, regionFirstCreatedMs));
            this.processedRegions.add(region);
        }

        if (!this.isRunning) {
            this.runNextTask();
        }
    }

    private runNextTask() {
        const task = this.tasks.shift();
        if (!task) {
            this.isRunning = false;
            return;
        }

        this.isRunning = true;
        task.run(this.schemas.publicSchemas)
            .catch((err) => {
                this.log.error(err);
                this.tasks.push(task);
            })
            .finally(() => {
                this.isRunning = false;
                this.runNextTask();
            });
    }

    runPrivateTask() {
        this.privateTask
            .run(this.schemas.privateSchemas)
            .then(() => this.schemas.invalidate())
            .catch(this.log.error);
    }

    runSamTask(firstCreatedMs?: number) {
        if (!this.didSamTaskRun) {
            new GetSamSchemaTask(this.getSamSchemas, firstCreatedMs)
                .run(this.schemas.samSchemas)
                .then(() => this.schemas.invalidate())
                .catch(this.log.error);
        }
        this.didSamTaskRun = true;
    }
}
