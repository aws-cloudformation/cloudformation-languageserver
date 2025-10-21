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
    GetTemplateCommand,
} from '@aws-sdk/client-cloudformation';
import { WaiterConfiguration, WaiterResult } from '@smithy/util-waiter';
import { AwsClient } from './AwsClient';

export class CfnService {
    public constructor(private readonly awsClient: AwsClient) {}

    private async withClient<T>(request: (client: CloudFormationClient) => Promise<T>): Promise<T> {
        const client = await this.awsClient.getCloudFormationClient();
        return await request(client);
    }

    public async listStacks(
        statusToInclude?: StackStatus[],
        statusToExclude?: StackStatus[],
        options?: { nextToken?: string },
    ): Promise<{ stacks: StackSummary[]; nextToken?: string }> {
        return await this.withClient(async (client) => {
            let stackStatusFilter: StackStatus[] | undefined;
            if (statusToInclude) {
                stackStatusFilter = statusToInclude;
            } else if (statusToExclude) {
                stackStatusFilter = StackStatuses.filter((status) => !statusToExclude.includes(status));
            }

            const response = await client.send(
                new ListStacksCommand({
                    NextToken: options?.nextToken,
                    StackStatusFilter: stackStatusFilter,
                }),
            );

            return {
                stacks: response.StackSummaries ?? [],
                nextToken: response.NextToken,
            };
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

    public async describeChangeSet(
        params: {
            ChangeSetName: string;
            IncludePropertyValues: boolean;
            StackName?: string;
        },
        options?: { nextToken?: string },
    ): Promise<DescribeChangeSetCommandOutput> {
        return await this.withClient(async (client) => {
            return await client.send(
                new DescribeChangeSetCommand({
                    ...params,
                    NextToken: options?.nextToken,
                }),
            );
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
        options?: { nextToken?: string },
    ): Promise<DescribeStackEventsCommandOutput> {
        return await this.withClient(async (client) => {
            return await client.send(
                new DescribeStackEventsCommand({
                    StackName: params.StackName,
                    NextToken: options?.nextToken,
                }),
            );
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
            let nextToken: string | undefined;
            const allTypes: TypeSummary[] = [];

            // Fetch all types
            do {
                const result = await this.getAllPrivateResourceTypes({ nextToken });
                allTypes.push(...result.types);
                nextToken = result.nextToken;
            } while (nextToken);

            // Fetch schemas for each type
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

    private async getAllPrivateResourceTypes(options?: {
        nextToken?: string;
    }): Promise<{ types: TypeSummary[]; nextToken?: string }> {
        return await this.withClient(async (client) => {
            const listResult = await client.send(
                new ListTypesCommand({
                    Visibility: Visibility.PRIVATE,
                    Type: RegistryType.RESOURCE,
                    MaxResults: 100,
                    NextToken: options?.nextToken,
                }),
            );

            return {
                types: listResult.TypeSummaries ?? [],
                nextToken: listResult.NextToken,
            };
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
