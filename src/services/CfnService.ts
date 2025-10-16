import {
    CloudFormationClient,
    ListStacksCommand,
    CreateStackCommand,
    CreateStackCommandOutput,
    DescribeStacksCommand,
    DescribeStacksCommandInput,
    DescribeStacksCommandOutput,
    CreateChangeSetCommand,
    CreateChangeSetCommandOutput,
    DescribeChangeSetCommand,
    DescribeChangeSetCommandInput,
    ExecuteChangeSetCommand,
    ExecuteChangeSetCommandOutput,
    DeleteChangeSetCommand,
    DeleteChangeSetCommandOutput,
    DeleteStackCommand,
    DeleteStackCommandOutput,
    DetectStackDriftCommand,
    DetectStackDriftCommandOutput,
    DescribeStackEventsCommand,
    DescribeStackEventsCommandOutput,
    DescribeStackResourcesCommand,
    DescribeStackResourcesCommandOutput,
    DescribeStackResourceCommand,
    DescribeStackResourceCommandOutput,
    ListStackResourcesCommand,
    ListStackResourcesCommandOutput,
    DescribeStackResourceDriftsCommand,
    DescribeStackResourceDriftsCommandOutput,
    ListTypesCommand,
    DescribeTypeCommand,
    Capability,
    StackResourceDriftStatus,
    Parameter,
    ResourceToImport,
    RegistryType,
    ValidateTemplateCommand,
    ValidateTemplateInput,
    ValidateTemplateOutput,
    Visibility,
    TypeSummary,
    DescribeTypeOutput,
    StackSummary,
    StackStatus,
    waitUntilChangeSetCreateComplete,
    waitUntilStackUpdateComplete,
    waitUntilStackCreateComplete,
    waitUntilStackImportComplete,
    DescribeChangeSetCommandOutput,
    Change,
    GetTemplateCommand,
    StackEvent,
} from '@aws-sdk/client-cloudformation';
import { WaiterConfiguration, WaiterResult } from '@smithy/util-waiter';
import { AwsClient } from './AwsClient';

export class CfnService {
    public constructor(private readonly awsClient: AwsClient) {}

    private async withClient<T>(request: (client: CloudFormationClient) => Promise<T>): Promise<T> {
        const client = await this.awsClient.getCloudFormationClient();
        return await request(client);
    }

    public async listStacks(statusToInclude?: StackStatus[], statusToExclude?: StackStatus[]): Promise<StackSummary[]> {
        return await this.withClient(async (client) => {
            const allStacks: StackSummary[] = [];
            let nextToken: string | undefined;

            let stackStatusFilter: StackStatus[] | undefined;
            if (statusToInclude) {
                stackStatusFilter = statusToInclude;
            } else if (statusToExclude) {
                stackStatusFilter = StackStatuses.filter((status) => !statusToExclude.includes(status));
            }

            do {
                const response = await client.send(
                    new ListStacksCommand({
                        NextToken: nextToken,
                        StackStatusFilter: stackStatusFilter,
                    }),
                );

                if (response.StackSummaries) {
                    allStacks.push(...response.StackSummaries);
                }

                nextToken = response.NextToken;
            } while (nextToken);

            return allStacks;
        });
    }

    public async createStack(params: {
        StackName: string;
        TemplateBody?: string;
        TemplateURL?: string;
        Parameters?: Parameter[];
        Capabilities?: Capability[];
    }): Promise<CreateStackCommandOutput> {
        return await this.withClient((client) => client.send(new CreateStackCommand(params)));
    }

    public async describeStacks(params?: {
        StackName?: string;
        NextToken?: string;
    }): Promise<DescribeStacksCommandOutput> {
        return await this.withClient((client) => client.send(new DescribeStacksCommand(params ?? {})));
    }

    public async getTemplate(params: { StackName: string }): Promise<string | undefined> {
        const response = await this.withClient((client) => client.send(new GetTemplateCommand(params)));
        return response.TemplateBody;
    }

    public async createChangeSet(params: {
        StackName: string;
        ChangeSetName: string;
        TemplateBody?: string;
        TemplateURL?: string;
        Parameters?: Parameter[];
        Capabilities?: Capability[];
        ChangeSetType?: 'CREATE' | 'UPDATE' | 'IMPORT';
        ResourcesToImport?: ResourceToImport[];
    }): Promise<CreateChangeSetCommandOutput> {
        return await this.withClient((client) => client.send(new CreateChangeSetCommand(params)));
    }

    public async describeChangeSet(params: {
        ChangeSetName: string;
        IncludePropertyValues: boolean;
        StackName?: string;
    }): Promise<DescribeChangeSetCommandOutput> {
        return await this.withClient(async (client) => {
            let nextToken: string | undefined;
            let result: DescribeChangeSetCommandOutput | undefined;
            const changes: Change[] = [];

            do {
                const response = await client.send(new DescribeChangeSetCommand({ ...params, NextToken: nextToken }));

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

    public async detectStackDrift(params: {
        StackName: string;
        LogicalResourceIds?: string[];
    }): Promise<DetectStackDriftCommandOutput> {
        return await this.withClient((client) => client.send(new DetectStackDriftCommand(params)));
    }

    public async describeStackEvents(
        params: {
            StackName: string;
        },
        clientRequestToken: string,
    ): Promise<DescribeStackEventsCommandOutput> {
        return await this.withClient(async (client) => {
            let nextToken: string | undefined;
            let result: DescribeStackEventsCommandOutput | undefined;
            const stackEvents: StackEvent[] = [];

            do {
                const response = await client.send(
                    new DescribeStackEventsCommand({
                        StackName: params.StackName,
                        NextToken: nextToken,
                    }),
                );

                if (result) {
                    stackEvents.push(...(response.StackEvents ?? []));
                } else {
                    result = response;
                    stackEvents.push(...(result.StackEvents ?? []));
                }

                // Stop if no more events in a page match the client request token parameter
                const hasMatchingToken = response.StackEvents?.some(
                    (event) => event.ClientRequestToken === clientRequestToken,
                );
                if (!hasMatchingToken) {
                    break;
                }

                nextToken = response.NextToken;
            } while (nextToken);

            result.StackEvents = stackEvents.filter((event) => event.ClientRequestToken === clientRequestToken);
            result.NextToken = undefined;
            return result;
        });
    }

    public async describeStackResources(params: {
        StackName?: string;
        LogicalResourceId?: string;
        PhysicalResourceId?: string;
    }): Promise<DescribeStackResourcesCommandOutput> {
        return await this.withClient((client) => client.send(new DescribeStackResourcesCommand(params)));
    }

    public async describeStackResource(params: {
        StackName: string;
        LogicalResourceId: string;
    }): Promise<DescribeStackResourceCommandOutput> {
        return await this.withClient((client) => client.send(new DescribeStackResourceCommand(params)));
    }

    public async listStackResources(params: {
        StackName: string;
        NextToken?: string;
    }): Promise<ListStackResourcesCommandOutput> {
        return await this.withClient((client) => client.send(new ListStackResourcesCommand(params)));
    }

    public async describeStackResourceDrifts(params: {
        StackName: string;
        StackResourceDriftStatusFilters?: StackResourceDriftStatus[];
        NextToken?: string;
        MaxResults?: number;
    }): Promise<DescribeStackResourceDriftsCommandOutput> {
        return await this.withClient((client) => client.send(new DescribeStackResourceDriftsCommand(params)));
    }

    public async getAllPrivateResourceSchemas(): Promise<DescribeTypeOutput[]> {
        return await this.withClient(async (client) => {
            const privateResourceSchemas: DescribeTypeOutput[] = [];
            const allTypes = await this.getAllPrivateResourceTypes();

            for (const type of allTypes) {
                if (type.TypeName) {
                    const schemaType = await client.send(
                        new DescribeTypeCommand({
                            Type: RegistryType.RESOURCE,
                            TypeName: type.TypeName,
                        }),
                    );

                    if (schemaType.TypeName && schemaType.Schema) {
                        privateResourceSchemas.push(schemaType);
                    }
                }
            }

            return privateResourceSchemas;
        });
    }

    private async getAllPrivateResourceTypes(): Promise<TypeSummary[]> {
        return await this.withClient(async (client) => {
            const allTypeSummaries: TypeSummary[] = [];
            let nextToken: string | undefined;

            do {
                const listResult = await client.send(
                    new ListTypesCommand({
                        Visibility: Visibility.PRIVATE,
                        Type: RegistryType.RESOURCE,
                        MaxResults: 100,
                        NextToken: nextToken,
                    }),
                );

                if (listResult.TypeSummaries) {
                    allTypeSummaries.push(...listResult.TypeSummaries);
                }

                nextToken = listResult.NextToken;
            } while (nextToken);

            return allTypeSummaries;
        });
    }

    public async executeChangeSet(params: {
        ChangeSetName: string;
        StackName?: string;
        ClientRequestToken: string;
    }): Promise<ExecuteChangeSetCommandOutput> {
        return await this.withClient((client) => client.send(new ExecuteChangeSetCommand(params)));
    }

    public async deleteChangeSet(params: {
        ChangeSetName: string;
        StackName?: string;
    }): Promise<DeleteChangeSetCommandOutput> {
        return await this.withClient((client) => client.send(new DeleteChangeSetCommand(params)));
    }

    public async deleteStack(params: { StackName: string }): Promise<DeleteStackCommandOutput> {
        return await this.withClient((client) => client.send(new DeleteStackCommand(params)));
    }

    public async waitUntilChangeSetCreateComplete(
        params: DescribeChangeSetCommandInput,
        timeoutMinutes: number = 5,
    ): Promise<WaiterResult> {
        return await this.withClient(async (client) => {
            const waiterConfig: WaiterConfiguration<CloudFormationClient> = {
                client,
                maxWaitTime: timeoutMinutes * 60,
            };
            return await waitUntilChangeSetCreateComplete(waiterConfig, params);
        });
    }

    public async waitUntilStackCreateComplete(
        params: DescribeStacksCommandInput,
        timeoutMinutes: number = 30,
    ): Promise<WaiterResult> {
        return await this.withClient(async (client) => {
            const waiterConfig: WaiterConfiguration<CloudFormationClient> = {
                client,
                maxWaitTime: timeoutMinutes * 60,
            };
            return await waitUntilStackCreateComplete(waiterConfig, params);
        });
    }

    public async waitUntilStackUpdateComplete(
        params: DescribeStacksCommandInput,
        timeoutMinutes: number = 30,
    ): Promise<WaiterResult> {
        return await this.withClient(async (client) => {
            const waiterConfig: WaiterConfiguration<CloudFormationClient> = {
                client,
                maxWaitTime: timeoutMinutes * 60,
            };
            return await waitUntilStackUpdateComplete(waiterConfig, params);
        });
    }

    public async waitUntilStackImportComplete(
        params: DescribeStacksCommandInput,
        timeoutMinutes: number = 30,
    ): Promise<WaiterResult> {
        return await this.withClient(async (client) => {
            const waiterConfig: WaiterConfiguration<CloudFormationClient> = {
                client,
                maxWaitTime: timeoutMinutes * 60,
            };
            return await waitUntilStackImportComplete(waiterConfig, params);
        });
    }

    public async validateTemplate(params: ValidateTemplateInput): Promise<ValidateTemplateOutput> {
        return await this.withClient((client) => client.send(new ValidateTemplateCommand(params)));
    }
}

const StackStatuses: ReadonlyArray<StackStatus> = Object.values(StackStatus);
