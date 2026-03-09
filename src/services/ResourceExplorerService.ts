import {
    SearchCommand,
    SearchCommandOutput,
    ListViewsCommand,
    CreateIndexCommand,
    CreateViewCommand,
} from '@aws-sdk/client-resource-explorer-2';
import { Measure } from '../telemetry/TelemetryDecorator';
import { AwsClient } from './AwsClient';

export interface ResourceExplorerSearchOptions {
    maxResults?: number;
    nextToken?: string;
    viewArn?: string;
}

export interface ResourceExplorerView {
    arn: string;
    name: string;
}

export class ResourceExplorerService {
    constructor(private readonly awsClient: AwsClient) {}

    @Measure({ name: 'resourceExplorerListViews' })
    public async listViews(): Promise<ResourceExplorerView[]> {
        const client = this.awsClient.getResourceExplorerClient();
        const response = await client.send(new ListViewsCommand({}));
        return (response.Views ?? []).map((arn) => {
            // ARN format: arn:aws:resource-explorer-2:region:account:view/view-name/uuid
            const viewPart = arn.split(':view/')[1] ?? '';
            const name = viewPart.split('/')[0] || arn;
            return { arn, name };
        });
    }

    @Measure({ name: 'resourceExplorerCreateDefaultView' })
    public async createDefaultView(): Promise<ResourceExplorerView | undefined> {
        const client = this.awsClient.getResourceExplorerClient();

        // First ensure an index exists
        try {
            await client.send(new CreateIndexCommand({}));
        } catch (error: unknown) {
            // Ignore if index already exists
            if (!(error instanceof Error && error.name === 'ConflictException')) {
                throw error;
            }
        }

        // Create a default view
        const response = await client.send(
            new CreateViewCommand({
                ViewName: 'default-view',
            }),
        );

        if (response.View?.ViewArn) {
            return {
                arn: response.View.ViewArn,
                name: 'default-view',
            };
        }
        return undefined;
    }

    @Measure({ name: 'resourceExplorerSearch' })
    public async search(queryString: string, options?: ResourceExplorerSearchOptions): Promise<SearchCommandOutput> {
        const client = this.awsClient.getResourceExplorerClient();
        return await client.send(
            new SearchCommand({
                QueryString: queryString,
                MaxResults: options?.maxResults,
                NextToken: options?.nextToken,
                ViewArn: options?.viewArn,
            }),
        );
    }
}
