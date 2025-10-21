import {
    CloudFormationClient,
    CreateGeneratedTemplateCommand,
    CreateGeneratedTemplateCommandInput,
    DescribeGeneratedTemplateCommand,
    DescribeGeneratedTemplateCommandInput,
    DescribeResourceScanCommand,
    GetGeneratedTemplateCommand,
    GetGeneratedTemplateCommandInput,
    ListResourceScanResourcesCommand,
    ListResourceScanResourcesInput,
    ListResourceScansCommand,
    ListResourceScansInput,
    ResourceScanSummary,
    ScannedResource,
    StartResourceScanCommand,
    StartResourceScanInput,
    UpdateGeneratedTemplateCommand,
    UpdateGeneratedTemplateCommandInput,
} from '@aws-sdk/client-cloudformation';
import { AwsClient } from './AwsClient';

export class IacGeneratorService {
    constructor(private readonly awsClient: AwsClient) {}

    private async withClient<T>(request: (client: CloudFormationClient) => Promise<T>): Promise<T> {
        const client = await this.awsClient.getCloudFormationClient();
        return await request(client);
    }

    public async startResourceScan(types?: string[]): Promise<string | undefined> {
        return await this.withClient(async (client) => {
            let input: StartResourceScanInput = {};
            if (types && types.length > 0) {
                input = {
                    ScanFilters: [{ Types: types }],
                };
            }
            const response = await client.send(new StartResourceScanCommand(input));
            return response.ResourceScanId;
        });
    }

    public async listResourceScanResources(
        scanId: string,
        options?: { nextToken?: string; maxResults?: number },
    ): Promise<{ resources: ScannedResource[]; nextToken?: string }> {
        return await this.withClient(async (client) => {
            const input: ListResourceScanResourcesInput = {
                ResourceScanId: scanId,
                NextToken: options?.nextToken,
                MaxResults: options?.maxResults,
            };
            const response = await client.send(new ListResourceScanResourcesCommand(input));
            return {
                resources: response.Resources ?? [],
                nextToken: response.NextToken,
            };
        });
    }

    public async listResourceScans(options?: {
        nextToken?: string;
        maxResults?: number;
    }): Promise<{ scans: ResourceScanSummary[]; nextToken?: string }> {
        return await this.withClient(async (client) => {
            const input: ListResourceScansInput = {
                NextToken: options?.nextToken,
                MaxResults: options?.maxResults,
            };
            const response = await client.send(new ListResourceScansCommand(input));
            return {
                scans: response.ResourceScanSummaries ?? [],
                nextToken: response.NextToken,
            };
        });
    }

    public async describeResourceScan(scanId: string) {
        return await this.withClient(async (client) => {
            return await client.send(new DescribeResourceScanCommand({ ResourceScanId: scanId }));
        });
    }

    public async createGeneratedTemplate(input: CreateGeneratedTemplateCommandInput) {
        return await this.withClient(async (client) => {
            return await client.send(new CreateGeneratedTemplateCommand(input));
        });
    }

    public async updateGeneratedTemplate(input: UpdateGeneratedTemplateCommandInput) {
        return await this.withClient(async (client) => {
            return await client.send(new UpdateGeneratedTemplateCommand(input));
        });
    }

    public async describeGeneratedTemplate(input: DescribeGeneratedTemplateCommandInput) {
        return await this.withClient(async (client) => {
            return await client.send(new DescribeGeneratedTemplateCommand(input));
        });
    }

    public async getGeneratedTemplate(input: GetGeneratedTemplateCommandInput) {
        return await this.withClient(async (client) => {
            return await client.send(new GetGeneratedTemplateCommand(input));
        });
    }
}
