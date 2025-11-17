import { StackResourceDriftStatus, StackStatus, ChangeSetStatus, ResourceStatus } from '@aws-sdk/client-cloudformation';
import { Templates } from '../../utils/TemplateUtils';

/**
 * Test values used to test api calls with the aws-sdk-client-mock library
 */
export const TEST_CONSTANTS = {
    STACK_NAME: 'test-stack',
    STACK_ID: 'arn:aws:cloudformation:us-east-1:123456789012:stack/test-stack/12345678-1234-1234-1234-123456789012',

    CHANGE_SET_NAME: 'test-changeset',
    CHANGE_SET_ID:
        'arn:aws:cloudformation:us-east-1:123456789012:changeSet/test-changeset/12345678-1234-1234-1234-123456789012',

    LOGICAL_RESOURCE_ID: 'MyResource',
    PHYSICAL_RESOURCE_ID: 'i-1234567890abcdef0',
    RESOURCE_TYPE: 'AWS::EC2::Instance',

    TEMPLATE_BODY: Templates.simple.json.contents,
    TEMPLATE_URL: 'SomeRandomUrl',

    NEXT_TOKEN: 'next-token-123',

    ERROR_MESSAGES: {
        CLIENT_UNAVAILABLE: 'CloudFormation client not available',
        STACK_NOT_FOUND: 'Stack with id test-stack does not exist',
        ACCESS_DENIED: 'User is not authorized to perform this action',
        CHANGESET_NOT_FOUND: 'ChangeSet [test-changeset] does not exist',
    },
};

export const MOCK_RESPONSES = {
    LIST_STACKS: {
        StackSummaries: [
            {
                StackName: TEST_CONSTANTS.STACK_NAME,
                StackId: TEST_CONSTANTS.STACK_ID,
                StackStatus: StackStatus.CREATE_COMPLETE,
                CreationTime: new Date('2023-01-01T00:00:00Z'),
            },
        ],
    },

    CREATE_STACK: {
        StackId: TEST_CONSTANTS.STACK_ID,
    },

    DESCRIBE_STACKS: {
        Stacks: [
            {
                StackName: TEST_CONSTANTS.STACK_NAME,
                StackId: TEST_CONSTANTS.STACK_ID,
                StackStatus: StackStatus.CREATE_COMPLETE,
                CreationTime: new Date('2023-01-01T00:00:00Z'),
            },
        ],
    },

    CREATE_CHANGE_SET: {
        Id: TEST_CONSTANTS.CHANGE_SET_ID,
        StackId: TEST_CONSTANTS.STACK_ID,
    },

    DESCRIBE_CHANGE_SET: {
        ChangeSetName: TEST_CONSTANTS.CHANGE_SET_NAME,
        ChangeSetId: TEST_CONSTANTS.CHANGE_SET_ID,
        Status: ChangeSetStatus.CREATE_COMPLETE,
    },

    DELETE_CHANGE_SET: {
        $metadata: {},
    },

    DETECT_STACK_DRIFT: {
        StackDriftDetectionId: 'drift-detection-123',
    },

    DESCRIBE_STACK_EVENTS: {
        StackEvents: [
            {
                StackId: TEST_CONSTANTS.STACK_ID,
                EventId: 'event-123',
                StackName: TEST_CONSTANTS.STACK_NAME,
                LogicalResourceId: TEST_CONSTANTS.STACK_NAME,
                ResourceStatus: ResourceStatus.CREATE_COMPLETE,
                Timestamp: new Date('2023-01-01T00:00:00Z'),
            },
        ],
    },

    DESCRIBE_EVENTS: {
        OperationEvents: [
            {
                EventId: 'event-1',
                EventType: 'VALIDATION_ERROR',
                Timestamp: '2023-01-01T00:00:00Z',
                LogicalResourceId: 'TestResource',
                ValidationPath: '/Resources/TestResource/Properties/BucketName',
                ValidationFailureMode: 'FAIL',
                ValidationName: 'TestValidation',
                ValidationStatusReason: 'Test error',
            },
        ],
    },

    DESCRIBE_STACK_RESOURCES: {
        StackResources: [
            {
                StackName: TEST_CONSTANTS.STACK_NAME,
                LogicalResourceId: TEST_CONSTANTS.LOGICAL_RESOURCE_ID,
                PhysicalResourceId: TEST_CONSTANTS.PHYSICAL_RESOURCE_ID,
                ResourceType: TEST_CONSTANTS.RESOURCE_TYPE,
                ResourceStatus: ResourceStatus.CREATE_COMPLETE,
                Timestamp: new Date('2023-01-01T00:00:00Z'),
            },
        ],
    },

    DESCRIBE_STACK_RESOURCE: {
        StackResourceDetail: {
            StackName: TEST_CONSTANTS.STACK_NAME,
            LogicalResourceId: TEST_CONSTANTS.LOGICAL_RESOURCE_ID,
            PhysicalResourceId: TEST_CONSTANTS.PHYSICAL_RESOURCE_ID,
            ResourceType: TEST_CONSTANTS.RESOURCE_TYPE,
            ResourceStatus: ResourceStatus.CREATE_COMPLETE,
            LastUpdatedTimestamp: new Date('2023-01-01T00:00:00Z'),
        },
    },

    LIST_STACK_RESOURCES: {
        StackResourceSummaries: [
            {
                LogicalResourceId: TEST_CONSTANTS.LOGICAL_RESOURCE_ID,
                PhysicalResourceId: TEST_CONSTANTS.PHYSICAL_RESOURCE_ID,
                ResourceType: TEST_CONSTANTS.RESOURCE_TYPE,
                ResourceStatus: ResourceStatus.CREATE_COMPLETE,
                LastUpdatedTimestamp: new Date('2023-01-01T00:00:00Z'),
            },
        ],
    },

    DESCRIBE_STACK_RESOURCE_DRIFTS: {
        StackResourceDrifts: [
            {
                StackId: TEST_CONSTANTS.STACK_ID,
                LogicalResourceId: TEST_CONSTANTS.LOGICAL_RESOURCE_ID,
                ResourceType: TEST_CONSTANTS.RESOURCE_TYPE,
                StackResourceDriftStatus: StackResourceDriftStatus.IN_SYNC,
                Timestamp: new Date('2023-01-01T00:00:00Z'),
            },
        ],
    },
};
