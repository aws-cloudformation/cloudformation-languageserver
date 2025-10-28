import { CloudFormationServiceException } from '@aws-sdk/client-cloudformation';
import { CfnService } from '../services/CfnService';
import { LoggerFactory } from '../telemetry/LoggerFactory';
import { ScopedTelemetry } from '../telemetry/ScopedTelemetry';
import { Telemetry, Measure } from '../telemetry/TelemetryDecorator';

export type ResourceStackManagementResult = {
    physicalResourceId: string;
    managedByStack: boolean | undefined;
    stackName?: string;
    stackId?: string;
    error?: string;
};

const log = LoggerFactory.getLogger('StackManagementInfoProvider');

export class StackManagementInfoProvider {
    @Telemetry() private readonly telemetry!: ScopedTelemetry;

    constructor(private readonly cfnService: CfnService) {}

    @Measure({ name: 'getResourceManagementState' })
    public async getResourceManagementState(physicalResourceId: string): Promise<ResourceStackManagementResult> {
        this.telemetry.count('managed', 0);
        this.telemetry.count('unmanaged', 0);
        this.telemetry.count('unknown', 0);

        try {
            const description = await this.cfnService.describeStackResources({
                PhysicalResourceId: physicalResourceId,
            });
            const firstObservedStackResource = description.StackResources?.at(0);
            if (firstObservedStackResource) {
                this.telemetry.count('managed', 1);
                return {
                    physicalResourceId: physicalResourceId,
                    managedByStack: true,
                    stackName: firstObservedStackResource.StackName,
                    stackId: firstObservedStackResource.StackId,
                };
            }
        } catch (error) {
            // below exception is the API behavior for describing resources which are not part of any stack
            if (
                error instanceof CloudFormationServiceException &&
                error.name === 'ValidationError' &&
                error.message.includes(`Stack for ${physicalResourceId} does not exist`)
            ) {
                log.info(error.message);
                this.telemetry.count('unmanaged', 1);
                return {
                    physicalResourceId: physicalResourceId,
                    managedByStack: false,
                    error: error.message,
                };
            }
            log.error(error, `Unexpected Exception from DescribeStackResources for resource '${physicalResourceId}'`);
        }
        const errMsg = 'Unexpected response from CloudFormation Describe Stack Resources with empty resource list';
        log.error(`DescribeStackResources for ${physicalResourceId} failed: ${errMsg}`);
        this.telemetry.count('unknown', 1);
        return {
            physicalResourceId: physicalResourceId,
            managedByStack: undefined,
            error: errMsg,
        };
    }
}
