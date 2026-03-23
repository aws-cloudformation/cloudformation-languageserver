import { SinonStub, stub } from 'sinon';
import { createMockAwsClient } from './MockServerComponents';
import { TestExtension } from './TestExtension';

export interface MockAwsTestClient {
    mockCloudControlSend: SinonStub;
    mockCloudFormationSend: SinonStub;
    mockS3Send: SinonStub;
    client: TestExtension;
}

export async function createMockAwsTestClient(): Promise<MockAwsTestClient> {
    const mockCloudControlSend = stub();
    const mockCloudFormationSend = stub();
    const mockS3Send = stub();

    const client = new TestExtension({
        awsClientFactory: createMockAwsClient(mockCloudControlSend, mockCloudFormationSend, mockS3Send),
    });

    await client.ready();

    stub(client.core.awsCredentials, 'credentialsAvailable').returns(true);
    stub(client.core.awsCredentials, 'getIAM').returns({
        accessKeyId: 'mock-key',
        secretAccessKey: 'mock-secret',
        profile: 'default',
        region: 'us-east-1',
    });

    return { mockCloudControlSend, mockCloudFormationSend, mockS3Send, client };
}
