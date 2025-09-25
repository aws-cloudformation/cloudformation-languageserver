import { CloudFormationClient } from '@aws-sdk/client-cloudformation';
import { describe, it, expect, beforeEach, vi, MockedClass } from 'vitest';
import { AwsClient } from '../../../src/services/AwsClient';
import { AwsRegion } from '../../../src/utils/Region';
import { createMockComponents } from '../../utils/MockServerComponents';

// Mock AWS SDK clients
vi.mock('@aws-sdk/client-cloudformation');

const MockedCloudFormationClient = CloudFormationClient as MockedClass<typeof CloudFormationClient>;

describe('AwsClient', () => {
    let component: AwsClient;
    let mockComponents: ReturnType<typeof createMockComponents>;

    beforeEach(() => {
        vi.clearAllMocks();
        mockComponents = createMockComponents();
        component = AwsClient.create(mockComponents);
    });

    describe('getCloudFormationClient', () => {
        it('should create and return new CloudFormation client', async () => {
            mockComponents.awsCredentials.getIAM.resolves({
                accessKeyId: 'test-access-key',
                secretAccessKey: 'test-secret-key',
                sessionToken: 'test-session-token',
            });

            const client = await component.getCloudFormationClient();

            expect(MockedCloudFormationClient).toHaveBeenCalledWith({
                region: AwsRegion.US_EAST_1, // Default region
                credentials: {
                    accessKeyId: 'test-access-key',
                    secretAccessKey: 'test-secret-key',
                    sessionToken: 'test-session-token',
                },
            });
            expect(client).toBeInstanceOf(CloudFormationClient);
        });

        it('should handle credentials provider errors', async () => {
            mockComponents.awsCredentials.getIAM.rejects(new Error('Credential provider error'));

            await expect(component.getCloudFormationClient()).rejects.toThrow('Credential provider error');
        });
    });

    describe('configure', () => {
        it('should subscribe to profile settings changes', () => {
            component.configure(mockComponents.settingsManager);

            expect(mockComponents.settingsManager.subscribe.calledWith('profile')).toBe(true);
        });

        it('should unsubscribe from previous subscription when reconfigured', () => {
            const mockUnsubscribe = vi.fn();
            const mockSubscription = {
                unsubscribe: mockUnsubscribe,
                isActive: vi.fn().mockReturnValue(true),
            };
            mockComponents.settingsManager.subscribe.returns(mockSubscription);

            // First configuration
            component.configure(mockComponents.settingsManager);

            // Second configuration should unsubscribe from first
            component.configure(mockComponents.settingsManager);

            expect(mockUnsubscribe).toHaveBeenCalledOnce();
        });
    });
});
