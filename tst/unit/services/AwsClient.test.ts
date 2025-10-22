import { CloudFormationClient } from '@aws-sdk/client-cloudformation';
import { describe, it, expect, beforeEach, vi, MockedClass } from 'vitest';
import { AwsClient } from '../../../src/services/AwsClient';
import { ExtensionId, ExtensionVersion } from '../../../src/utils/ExtensionConfig';
import { createMockComponents } from '../../utils/MockServerComponents';

// Mock AWS SDK clients
vi.mock('@aws-sdk/client-cloudformation');

const MockedCloudFormationClient = CloudFormationClient as MockedClass<typeof CloudFormationClient>;

describe('AwsClient', () => {
    let component: AwsClient;
    let mockComponents: ReturnType<typeof createMockComponents>;
    const iam = {
        region: 'test-region',
        profile: 'test-profile',
        accessKeyId: 'test-access-key',
        secretAccessKey: 'test-secret-key',
        sessionToken: 'test-session-token',
    };

    beforeEach(() => {
        vi.clearAllMocks();
        mockComponents = createMockComponents();
        component = new AwsClient(mockComponents.awsCredentials);
    });

    describe('getCloudFormationClient', () => {
        it('should create and return new CloudFormation client', () => {
            mockComponents.awsCredentials.getIAM.returns({
                region: 'test-region',
                profile: 'test-profile',
                accessKeyId: 'test-access-key',
                secretAccessKey: 'test-secret-key',
                sessionToken: 'test-session-token',
            });

            const client = component.getCloudFormationClient();

            expect(MockedCloudFormationClient).toHaveBeenCalledWith({
                region: iam.region,
                credentials: iam,
                customUserAgent: `${ExtensionId}/${ExtensionVersion}`,
            });
            expect(client).toBeInstanceOf(CloudFormationClient);
        });

        it('should handle credentials provider errors', () => {
            mockComponents.awsCredentials.getIAM.throws(new Error('Credential provider error'));

            expect(() => component.getCloudFormationClient()).toThrow('Credential provider error');
        });
    });
});
