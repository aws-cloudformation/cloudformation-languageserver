/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-unsafe-argument */
import { CFN_CLIENT_PATH } from '../utils/ClientUtil';
import { DynamicModuleLoader } from '../utils/DynamicModuleLoader';
import { CfnService } from './CfnService';
import { CreateChangeSetCommandOutput, Parameter, Capability, ResourceToImport, DescribeChangeSetCommandOutput, ResourceTargetDefinition, Change, ResourceChangeDetail } from '@aws-sdk/client-cloudformation';

export type ResourceTargetDefinitionV2 = ResourceTargetDefinition & {
    BeforeValueFrom?: string;
    AfterValueFrom?: string;
    Drift?: {
        PreviousValue: string;
        ActualValue?: string;
    };
    LiveResourceDrift?: {
        PreviousValue: string;
        ActualValue?: string;
    };
};

export type ResourceChangeDetailV2 = Omit<ResourceChangeDetail, 'Target'> & {
    Target?: ResourceTargetDefinitionV2;
};

export type ChangeV2 = Omit<Change, 'ResourceChange'> & {
    ResourceDriftStatus?: string;
    ResourceChange?: Omit<Change['ResourceChange'], 'Details'> & {
        Details?: ResourceChangeDetailV2[];
    };
};

export type DescribeChangeSetOutputV2 = Omit<DescribeChangeSetCommandOutput, 'Changes'> & {
    Changes?: ChangeV2[];
};

export type DescribeEventsOutput = {
    OperationEvents: {
        EventType: string;
        Timestamp: string | Date;
        LogicalResourceId?: string;
        ValidationPath?: string;
        ValidationFailureMode?: string;
        ValidationName?: string;
        ValidationStatusReason?: string;
        Details?: string;
    }[];
    NextToken?: string;
};

export class CfnServiceV2 extends CfnService {
    public override async createChangeSet(params: {
        StackName: string;
        ChangeSetName: string;
        TemplateBody?: string;
        TemplateURL?: string;
        Parameters?: Parameter[];
        Capabilities?: Capability[];
        ChangeSetType?: 'CREATE' | 'UPDATE' | 'IMPORT';
        ResourcesToImport?: ResourceToImport[];
        CompareWith?: string;
    }): Promise<CreateChangeSetCommandOutput> {
        type CfnClient = typeof import('@aws-sdk/client-cloudformation') & {
            CreateChangeSetCommand: new (input: any) => any;
        };

        const cfn = DynamicModuleLoader.load<CfnClient>(CFN_CLIENT_PATH);

        if (!cfn?.CreateChangeSetCommand) {
            throw new Error('CreateChangeSetCommand not available in loaded module');
        }

        const { CreateChangeSetCommand } = cfn;

        return await this.withClient(async (client) => {
            return await client.send(new CreateChangeSetCommand(params));
        });
    }

    public override async describeChangeSet(params: {
        ChangeSetName: string;
        IncludePropertyValues: boolean;
        StackName?: string;
    }): Promise<DescribeChangeSetOutputV2> {
        type CfnClient = typeof import('@aws-sdk/client-cloudformation') & {
            DescribeChangeSetCommand: new (input: any) => any;
        };

        const cfn = DynamicModuleLoader.load<CfnClient>(CFN_CLIENT_PATH);

        if (!cfn?.DescribeChangeSetCommand) {
            throw new Error('DescribeChangeSetCommand not available in loaded module');
        }

        const { DescribeChangeSetCommand } = cfn;

        return await this.withClient(async (client) => {
            let nextToken: string | undefined;
            let result: DescribeChangeSetOutputV2 | undefined;
            const changes: any[] = [];

            do {
                const response = await client.send(new DescribeChangeSetCommand({ ...params, NextToken: nextToken })) as DescribeChangeSetOutputV2;

                if (result) {
                    changes.push(...(response.Changes ?? []));
                } else {
                    result = response;
                    changes.push(...(result.Changes ?? []));
                }

                nextToken = response.NextToken;
            } while (nextToken);

            result.Changes = changes;
            result.NextToken = undefined;
            return result;
        });
    }

    public async describeEvents(params: { ChangeSetName: string; StackName: string }): Promise<DescribeEventsOutput> {
        type CfnClient = typeof import('@aws-sdk/client-cloudformation') & {
            DescribeEventsCommand: new (input: { ChangeSetName: string; StackName: string; NextToken?: string }) => any;
        };

        const cfn = DynamicModuleLoader.load<CfnClient>(CFN_CLIENT_PATH);

        if (!cfn?.DescribeEventsCommand) {
            throw new Error('DescribeEventsCommand not available in loaded module');
        }

        const { DescribeEventsCommand } = cfn;

        return await this.withClient(async (client) => {
            let nextToken: string | undefined;
            let result: DescribeEventsOutput | undefined;
            const operationEvents: DescribeEventsOutput['OperationEvents'] = [];

            do {
                const response = (await client.send(
                    new DescribeEventsCommand({
                        ...params,
                        NextToken: nextToken,
                    }),
                )) as unknown as DescribeEventsOutput;

                if (result) {
                    operationEvents.push(...(response.OperationEvents ?? []));
                } else {
                    result = response;
                    operationEvents.push(...(result.OperationEvents ?? []));
                }

                nextToken = response.NextToken;
            } while (nextToken);

            result.OperationEvents = operationEvents;
            result.NextToken = undefined;
            return result;
        });
    }
}
