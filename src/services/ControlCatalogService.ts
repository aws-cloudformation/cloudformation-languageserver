import { ControlCatalogClient, ListControlsCommand } from '@aws-sdk/client-controlcatalog';
import { LoggerFactory } from '../telemetry/LoggerFactory';
import { Measure } from '../telemetry/TelemetryDecorator';
import { markIfClientError } from '../utils/errors/FaultSuppression';
import { AwsClient } from './AwsClient';

const log = LoggerFactory.getLogger('ControlCatalogService');

export interface ProactiveControl {
    controlId: string;
    name: string;
    resource?: string;
}

export class ControlCatalogService {
    constructor(private readonly awsClient: AwsClient) {}

    private async withClient<T>(request: (client: ControlCatalogClient) => Promise<T>): Promise<T> {
        try {
            const client = this.awsClient.getControlCatalogClient();
            return await request(client);
        } catch (error) {
            log.error(error, 'Control Catalog API call failed');
            markIfClientError(error);
            throw error;
        }
    }

    @Measure({ name: 'listProactiveControls', captureErrorType: true })
    public async listProactiveControls(maxControls = 2000): Promise<ProactiveControl[]> {
        return await this.withClient(async (client) => {
            const controls: ProactiveControl[] = [];
            let nextToken: string | undefined;
            do {
                const response = await client.send(new ListControlsCommand({ NextToken: nextToken }));
                for (const control of response.Controls ?? []) {
                    if (control.Behavior !== 'PROACTIVE') {
                        continue;
                    }
                    const controlId = (control.Aliases ?? []).find((alias) => alias.startsWith('CT.'));
                    if (!controlId) {
                        continue;
                    }
                    controls.push({
                        controlId,
                        name: control.Name ?? controlId,
                        resource: control.GovernedResources?.[0],
                    });
                }
                nextToken = response.NextToken;
            } while (nextToken && controls.length < maxControls);
            return controls.toSorted((a, b) => a.controlId.localeCompare(b.controlId));
        });
    }
}
