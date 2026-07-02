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
import { LoggerFactory } from '../telemetry/LoggerFactory';
import { Count } from '../telemetry/TelemetryDecorator';
import { markIfClientError } from '../utils/FaultSuppression';
import { AwsClient } from './AwsClient';

const log = LoggerFactory.getLogger('IacGeneratorService');

export class IacGeneratorService {
    constructor(private readonly awsClient: AwsClient) {}

    private async withClient<T>(request: (client: CloudFormationClient) => Promise<T>): Promise<T> {
        try {
            const client = this.awsClient.getCloudFormationClient();
            return await request(client);
        } catch (error) {
            log.error(error, 'IaC Generator API call failed');
            markIfClientError(error);
            throw error;
        }
    }

    @Count({ name: 'startResourceScan' })
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

    @Count({ name: 'listResourceScanResources' })
    public async listResourceScanResources(scanId: string): Promise<ScannedResource[]> {
        return await this.withClient(async (client) => {
            const input: ListResourceScanResourcesInput = {
                ResourceScanId: scanId,
            };
            let nextToken: string | undefined;
            const scannedResources: ScannedResource[] = [];
            do {
                const response = await client.send(new ListResourceScanResourcesCommand(input));
                if (response.Resources) {
                    scannedResources.push(...response.Resources);
                }
                input.NextToken = response.NextToken;
                nextToken = response.NextToken;
            } while (nextToken);
            return scannedResources;
        });
    }

    @Count({ name: 'listResourceScans' })
    public async listResourceScans(): Promise<ResourceScanSummary[]> {
        return await this.withClient(async (client) => {
            const input: ListResourceScansInput = {};
            let nextToken: string | undefined;
            const resourceScans: ResourceScanSummary[] = [];
            do {
                const response = await client.send(new ListResourceScansCommand(input));
                if (response.ResourceScanSummaries) {
                    resourceScans.push(...response.ResourceScanSummaries);
                }
                input.NextToken = response.NextToken;
                nextToken = response.NextToken;
            } while (nextToken);
            return resourceScans;
        });
    }

    @Count({ name: 'describeResourceScan' })
    public async describeResourceScan(scanId: string) {
        return await this.withClient(async (client) => {
            return await client.send(new DescribeResourceScanCommand({ ResourceScanId: scanId }));
        });
    }

    @Count({ name: 'createGeneratedTemplate' })
    public async createGeneratedTemplate(input: CreateGeneratedTemplateCommandInput) {
        return await this.withClient(async (client) => {
            return await client.send(new CreateGeneratedTemplateCommand(input));
        });
    }

    @Count({ name: 'updateGeneratedTemplate' })
    public async updateGeneratedTemplate(input: UpdateGeneratedTemplateCommandInput) {
        return await this.withClient(async (client) => {
            return await client.send(new UpdateGeneratedTemplateCommand(input));
        });
    }

    @Count({ name: 'describeGeneratedTemplate' })
    public async describeGeneratedTemplate(input: DescribeGeneratedTemplateCommandInput) {
        return await this.withClient(async (client) => {
            return await client.send(new DescribeGeneratedTemplateCommand(input));
        });
    }

    @Count({ name: 'getGeneratedTemplate' })
    public async getGeneratedTemplate(input: GetGeneratedTemplateCommandInput) {
        return await this.withClient(async (client) => {
            return await client.send(new GetGeneratedTemplateCommand(input));
        });
    }
}
