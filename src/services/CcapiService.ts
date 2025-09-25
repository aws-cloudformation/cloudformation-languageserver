import {
    CloudControlClient,
    GetResourceCommand,
    GetResourceInput,
    ListResourcesCommand,
    ListResourcesInput,
    ListResourcesOutput,
} from '@aws-sdk/client-cloudcontrol';
import { ServerComponents } from '../server/ServerComponents';
import { AwsClient } from './AwsClient';

export class CcapiService {
    constructor(private readonly awsClient: AwsClient) {}

    private async withClient<T>(request: (client: CloudControlClient) => Promise<T>): Promise<T> {
        const client = await this.awsClient.getCloudControlClient();
        return await request(client);
    }

    public async listResources(typeName: string) {
        return await this.withClient(async (client) => {
            let nextToken: string | undefined;
            const resourceList: ListResourcesOutput = {
                TypeName: typeName,
                ResourceDescriptions: [],
            };
            const listResourcesInput: ListResourcesInput = {
                TypeName: typeName,
            };
            do {
                const response = await client.send(new ListResourcesCommand(listResourcesInput));
                if (response.ResourceDescriptions) {
                    resourceList.ResourceDescriptions?.push(...response.ResourceDescriptions);
                }
                nextToken = response.NextToken;
                listResourcesInput.NextToken = response.NextToken;
            } while (nextToken);

            return resourceList;
        });
    }

    public async getResource(typeName: string, identifier: string) {
        return await this.withClient(async (client) => {
            const getResourceInput: GetResourceInput = {
                TypeName: typeName,
                Identifier: identifier,
            };
            return await client.send(new GetResourceCommand(getResourceInput));
        });
    }

    static create(components: ServerComponents) {
        return new CcapiService(components.awsClient);
    }
}
