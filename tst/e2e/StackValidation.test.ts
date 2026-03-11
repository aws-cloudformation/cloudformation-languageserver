import { stub, restore, SinonStub } from 'sinon';
import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { CreateValidationRequest, DescribeValidationStatusRequest } from '../../src/stacks/actions/StackActionProtocol';
import {
    CreateValidationParams,
    DescribeValidationStatusResult,
    CreateStackActionResult,
    StackActionPhase,
} from '../../src/stacks/actions/StackActionRequestType';
import { createMockAwsClient } from '../utils/MockServerComponents';
import { TestExtension } from '../utils/TestExtension';

describe('Stack Validation E2E', () => {
    let mockCloudControlSend: SinonStub;
    let mockCloudFormationSend: SinonStub;
    let mockS3Send: SinonStub;
    let client: TestExtension;

    beforeAll(async () => {
        mockCloudControlSend = stub();
        mockCloudFormationSend = stub();
        mockS3Send = stub();

        client = new TestExtension({
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
    });

    beforeEach(async () => {
        await client.reset();
        mockCloudFormationSend.reset();
    });

    afterAll(async () => {
        restore();
        await client.close();
    });

    it('should show StatusReason when waiter throws exception', async () => {
        const template = `AWSTemplateFormatVersion: '2010-09-09'
Transform: AWS::Serverless-2016-10-31
Resources:
  InvalidFunction:
    Type: AWS::Serverless::Function
    Properties:
      Handler: index.handler
      Runtime: nodejs18.x
`;

        const uri = await client.openYamlTemplate(template);

        // Mock DescribeStacks to check if stack exists (first call)
        mockCloudFormationSend.onFirstCall().rejects({ name: 'ResourceNotFoundException' });

        // Mock CreateChangeSet to succeed (second call)
        mockCloudFormationSend.onSecondCall().resolves({
            Id: 'arn:aws:cloudformation:us-east-1:123456789012:changeSet/test-changeset/abc123',
            StackId: 'arn:aws:cloudformation:us-east-1:123456789012:stack/test-stack/def456',
        });

        // Mock waiter DescribeChangeSet calls - waiter polls multiple times
        // First poll: still creating
        mockCloudFormationSend.onThirdCall().resolves({
            Status: 'CREATE_IN_PROGRESS',
            ChangeSetName: 'test-changeset',
            StackName: 'test-stack-validation-failure',
        });

        // Second poll: failed
        mockCloudFormationSend.onCall(3).resolves({
            Status: 'FAILED',
            StatusReason:
                'The following hook(s)/validation failed: [AWS::EarlyValidation::ResourceExistenceCheck]. To troubleshoot Early Validation errors, use the DescribeEvents API for detailed failure information.',
            ChangeSetName: 'test-changeset',
            StackName: 'test-stack-validation-failure',
        });

        // Mock DescribeEvents to return detailed validation errors
        mockCloudFormationSend.onCall(4).resolves({
            OperationEvents: [
                {
                    EventType: 'VALIDATION_ERROR',
                    Timestamp: new Date(),
                    LogicalResourceId: 'InvalidFunction',
                    ValidationName: 'AWS::EarlyValidation::ResourceExistenceCheck',
                    ValidationStatusReason: 'Resource does not exist in the account',
                    ValidationFailureMode: 'FAIL',
                    ValidationPath: '/Resources/InvalidFunction/Properties/Handler',
                },
            ],
            NextToken: undefined,
        });

        const params: CreateValidationParams = {
            id: 'test-validation-id',
            uri: uri,
            stackName: 'test-stack-validation-failure',
        };

        const createResult = (await client.send(CreateValidationRequest.method, params)) as CreateStackActionResult;
        expect(createResult.id).toBeDefined();

        // Poll for validation status
        let result: DescribeValidationStatusResult | undefined;
        let attempts = 0;
        const maxAttempts = 20;

        while (attempts < maxAttempts) {
            result = (await client.send(DescribeValidationStatusRequest.method, {
                id: createResult.id,
            })) as DescribeValidationStatusResult;

            if (
                result.phase === StackActionPhase.VALIDATION_FAILED ||
                result.phase === StackActionPhase.VALIDATION_COMPLETE
            ) {
                break;
            }

            await new Promise((resolve) => setTimeout(resolve, 200));
            attempts++;
        }

        expect(result).toBeDefined();

        // The test expectation - failureReason should be formatted from validation details
        expect(result?.phase).toBe(StackActionPhase.VALIDATION_FAILED);
        if (result?.FailureReason) {
            expect(typeof result.FailureReason).toBe('string');
            // Should NOT contain metadata or object serialization
            expect(result.FailureReason).not.toContain('"$metadata"');
            expect(result.FailureReason).not.toContain('[object Object]');
            expect(result.FailureReason).not.toContain('To troubleshoot Early Validation errors');
            // Should contain the actual detailed error from DescribeEvents
            expect(result.FailureReason).toContain('InvalidFunction');
            expect(result.FailureReason).toContain('Resource does not exist');
        }

        await client.closeDocument({ textDocument: { uri } });
    }, 30000);
});
