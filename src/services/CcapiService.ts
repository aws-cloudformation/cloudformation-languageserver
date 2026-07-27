import {
    CloudControlClient,
    CreateResourceCommand,
    GetResourceCommand,
    GetResourceInput,
    GetResourceRequestStatusCommand,
    ListResourcesCommand,
    ListResourcesOutput,
    ProgressEvent,
} from '@aws-sdk/client-cloudcontrol';
import { LoggerFactory } from '../telemetry/LoggerFactory';
import { Measure } from '../telemetry/TelemetryDecorator';
import { markIfClientError } from '../utils/errors/FaultSuppression';
import { AwsClient } from './AwsClient';

const log = LoggerFactory.getLogger('CcapiService');

interface ListResourcesOptions {
    nextToken?: string;
    maxResults?: number;
}

export class CcapiService {
    constructor(private readonly awsClient: AwsClient) {}

    private async withClient<T>(request: (client: CloudControlClient) => Promise<T>): Promise<T> {
        try {
            const client = this.awsClient.getCloudControlClient();
            return await request(client);
        } catch (error) {
            log.error(error, 'CloudControl API call failed');
            markIfClientError(error);
            throw error;
        }
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

    @Measure({ name: 'getResource', captureErrorType: true })
    public async getResource(typeName: string, identifier: string) {
        return await this.withClient(async (client) => {
            const getResourceInput: GetResourceInput = {
                TypeName: typeName,
                Identifier: identifier,
            };
            return await client.send(new GetResourceCommand(getResourceInput));
        });
    }

    /**
     * Create a resource via the Cloud Control API and poll until the operation reaches a
     * terminal state. CloudControl create is asynchronous: CreateResource returns a
     * RequestToken and an initial ProgressEvent, which we poll via
     * GetResourceRequestStatus until SUCCESS/FAILED (or a timeout).
     */
    @Measure({ name: 'createResource', captureErrorType: true })
    public async createResource(
        typeName: string,
        desiredState: string,
        options?: { pollIntervalMs?: number; timeoutMs?: number },
    ): Promise<ProgressEvent> {
        const pollIntervalMs = options?.pollIntervalMs ?? 2000;
        const timeoutMs = options?.timeoutMs ?? 120_000;
        return await this.withClient(async (client) => {
            const create = await client.send(
                new CreateResourceCommand({ TypeName: typeName, DesiredState: desiredState }),
            );
            let progress: ProgressEvent | undefined = create.ProgressEvent;
            const token = progress?.RequestToken;

            const deadline = Date.now() + timeoutMs;
            while (
                token &&
                progress &&
                (progress.OperationStatus === 'IN_PROGRESS' || progress.OperationStatus === 'PENDING') &&
                Date.now() < deadline
            ) {
                await new Promise((resolve) => setTimeout(resolve, pollIntervalMs));
                const status = await client.send(new GetResourceRequestStatusCommand({ RequestToken: token }));
                progress = status.ProgressEvent;
            }

            if (!progress) {
                throw new Error('CloudControl CreateResource returned no progress event');
            }
            if (progress.OperationStatus === 'IN_PROGRESS' || progress.OperationStatus === 'PENDING') {
                throw new Error(
                    `CloudControl CreateResource for ${typeName} did not complete within ${timeoutMs}ms (last status: ${progress.OperationStatus}).`,
                );
            }
            return progress;
        });
    }
}
