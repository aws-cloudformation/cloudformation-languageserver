import {
    CloudControlClient,
    GetResourceCommand,
    GetResourceInput,
    ListResourcesCommand,
    ListResourcesOutput,
} from '@aws-sdk/client-cloudcontrol';
import { Measure } from '../telemetry/TelemetryDecorator';
import { AwsClient } from './AwsClient';

export interface ListResourcesOptions {
    nextToken?: string;
    maxResults?: number;
}

export class CcapiService {
    constructor(private readonly awsClient: AwsClient) {}

    private async withClient<T>(request: (client: CloudControlClient) => Promise<T>): Promise<T> {
        const client = this.awsClient.getCloudControlClient();
        return await request(client);
    }

    @Measure({ name: 'listResources' })
    public async listResources(typeName: string, options?: ListResourcesOptions): Promise<ListResourcesOutput> {
        return await this.withClient(async (client) => {
            const response = await client.send(
                new ListResourcesCommand({
                    TypeName: typeName,
                    NextToken: options?.nextToken,
                    MaxResults: options?.maxResults,
                }),
            );

            return {
                TypeName: response.TypeName,
                ResourceDescriptions: response.ResourceDescriptions,
                NextToken: response.NextToken,
            };
        });
    }

    @Measure({ name: 'getResource' })
    public async getResource(typeName: string, identifier: string) {
        return await this.withClient(async (client) => {
            const getResourceInput: GetResourceInput = {
                TypeName: typeName,
                Identifier: identifier,
            };
            return await client.send(new GetResourceCommand(getResourceInput));
        });
    }
}
