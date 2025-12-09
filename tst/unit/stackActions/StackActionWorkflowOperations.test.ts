import {
    Change,
    ChangeSetType,
    StackStatus,
    OnStackFailure,
    EventType,
    HookFailureMode,
    OperationEvent,
} from '@aws-sdk/client-cloudformation';
import { WaiterState } from '@smithy/util-waiter';
import { DateTime } from 'luxon';
import { stubInterface } from 'ts-sinon';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ResponseError } from 'vscode-languageserver';
import { SyntaxTree } from '../../../src/context/syntaxtree/SyntaxTree';
import { DocumentManager } from '../../../src/document/DocumentManager';
import { CfnService } from '../../../src/services/CfnService';
import { S3Service } from '../../../src/services/S3Service';
import {
    processChangeSet,
    waitForChangeSetValidation,
    waitForDeployment,
    cleanupReviewStack,
    deleteChangeSet,
    mapChangesToStackChanges,
    parseValidationEvents,
    publishValidationDiagnostics,
    isStackInReview,
    computeEligibleDeploymentMode,
} from '../../../src/stacks/actions/StackActionOperations';
import {
    CreateValidationParams,
    StackActionPhase,
    StackActionState,
    ValidationDetail,
    DeploymentMode,
} from '../../../src/stacks/actions/StackActionRequestType';
import { StackActionWorkflowState } from '../../../src/stacks/actions/StackActionWorkflowType';
import { ExtensionName } from '../../../src/utils/ExtensionConfig';
import { createMockSyntaxTreeManager, createMockDiagnosticCoordinator } from '../../utils/MockServerComponents';

vi.mock('../../../src/utils/Retry', () => ({
    retryWithExponentialBackoff: vi.fn(),
}));

vi.mock('../../../src/context/SectionContextBuilder', () => ({
    getEntityMap: vi.fn().mockImplementation(() => new Map()),
}));

vi.mock('../../../src/artifactexporter/ArtifactExporter', () => ({
    ArtifactExporter: vi.fn().mockImplementation(() => ({
        export: vi.fn().mockResolvedValue({ Resources: {} }),
    })),
}));

describe('StackActionWorkflowOperations', () => {
    let mockCfnService: CfnService;
    let mockDocumentManager: DocumentManager;
    let mockS3Service: S3Service;

    beforeEach(() => {
        mockCfnService = {
            createChangeSet: vi.fn(),
            describeChangeSet: vi.fn(),
            deleteChangeSet: vi.fn(),
            waitUntilChangeSetCreateComplete: vi.fn(),
            waitUntilStackUpdateComplete: vi.fn(),
            waitUntilStackCreateComplete: vi.fn(),
            deleteStack: vi.fn(),
            describeStacks: vi.fn(),
        } as any;

        mockDocumentManager = {
            get: vi.fn(),
            getLine: vi.fn(),
        } as any;

        mockS3Service = {} as any;

        vi.clearAllMocks();
    });

    describe('processChangeSet', () => {
        it('should create change set successfully', async () => {
            const params: CreateValidationParams = {
                id: 'test-id',
                uri: 'file:///test.yaml',
                stackName: 'test-stack',
            };

            (mockDocumentManager.get as any).mockReturnValue({
                contents: () => 'template content',
            });

            (mockCfnService.createChangeSet as any).mockResolvedValue({
                Id: 'changeset-123',
            });

            const result = await processChangeSet(mockCfnService, mockDocumentManager, params, 'CREATE', mockS3Service);

            expect(result).toContain('AWS-CloudFormation');
            expect(mockCfnService.createChangeSet).toHaveBeenCalledWith({
                StackName: 'test-stack',
                ChangeSetName: expect.stringContaining(ExtensionName.replaceAll(' ', '-')),
                TemplateBody: 'template content',
                TemplateURL: undefined,
                Parameters: undefined,
                Capabilities: undefined,
                ChangeSetType: 'CREATE',
                ResourcesToImport: undefined,
            });
        });

        it('should create change set with S3 URL when provided', async () => {
            const params: CreateValidationParams = {
                id: 'test-id',
                uri: 'file:///test.yaml',
                stackName: 'test-stack',
                s3Bucket: 'test-bucket',
                s3Key: 'template.yaml',
            };

            const mockDocument = {
                contents: () => 'template content',
                documentType: 'YAML',
            };
            (mockDocumentManager.get as any).mockReturnValue(mockDocument);

            (mockCfnService.createChangeSet as any).mockResolvedValue({
                Id: 'changeset-123',
            });

            mockS3Service.putObjectContent = vi.fn().mockResolvedValue({ ETag: '"test-etag"' });
            mockS3Service.getHeadObject = vi.fn().mockResolvedValue({ ETag: '"test-etag"' });

            const result = await processChangeSet(mockCfnService, mockDocumentManager, params, 'CREATE', mockS3Service);

            expect(result).toContain('AWS-CloudFormation');
            expect(mockS3Service.putObjectContent).toHaveBeenCalledWith(
                expect.any(String),
                'test-bucket',
                'template.yaml',
            );
            expect(mockS3Service.getHeadObject).toHaveBeenCalledWith('test-bucket', 'template.yaml');
            expect(mockCfnService.createChangeSet).toHaveBeenCalledWith({
                StackName: 'test-stack',
                ChangeSetName: expect.stringContaining(ExtensionName.replaceAll(' ', '-')),
                TemplateBody: undefined,
                TemplateURL: 'https://s3.amazonaws.com/test-bucket/template.yaml',
                Parameters: undefined,
                Capabilities: undefined,
                ChangeSetType: 'CREATE',
                ResourcesToImport: undefined,
            });
        });

        it('should throw error when S3 ETag mismatch occurs', async () => {
            const params: CreateValidationParams = {
                id: 'test-id',
                uri: 'file:///test.yaml',
                stackName: 'test-stack',
                s3Bucket: 'test-bucket',
                s3Key: 'template.yaml',
            };

            const mockDocument = {
                contents: () => 'template content',
                documentType: 'YAML',
            };
            (mockDocumentManager.get as any).mockReturnValue(mockDocument);

            mockS3Service.putObjectContent = vi.fn().mockResolvedValue({ ETag: '"original-etag"' });
            mockS3Service.getHeadObject = vi.fn().mockResolvedValue({ ETag: '"different-etag"' });

            await expect(
                processChangeSet(mockCfnService, mockDocumentManager, params, 'CREATE', mockS3Service),
            ).rejects.toThrow(ResponseError);

            expect(mockS3Service.getHeadObject).toHaveBeenCalledWith('test-bucket', 'template.yaml');
        });

        it('should throw error when document not found', async () => {
            const params: CreateValidationParams = {
                id: 'test-id',
                uri: 'file:///missing.yaml',
                stackName: 'test-stack',
            };

            (mockDocumentManager.get as any).mockReturnValue(undefined);

            await expect(
                processChangeSet(mockCfnService, mockDocumentManager, params, 'CREATE', mockS3Service),
            ).rejects.toThrow(ResponseError);
        });
    });

    describe('waitForDeployment', () => {
        it('should return successful deployment result', async () => {
            (mockCfnService.waitUntilStackCreateComplete as any).mockResolvedValue({
                state: WaiterState.SUCCESS,
            });

            const result = await waitForDeployment(mockCfnService, 'test-stack', ChangeSetType.CREATE);

            expect(result).toEqual({
                phase: StackActionPhase.DEPLOYMENT_COMPLETE,
                state: StackActionState.SUCCESSFUL,
                reason: undefined,
            });
            expect(mockCfnService.waitUntilStackCreateComplete).toHaveBeenCalledWith({
                StackName: 'test-stack',
            });
        });

        it('should return failed deployment result', async () => {
            (mockCfnService.waitUntilStackCreateComplete as any).mockResolvedValue({
                state: WaiterState.FAILURE,
            });

            const result = await waitForDeployment(mockCfnService, 'test-stack', ChangeSetType.CREATE);

            expect(result).toEqual({
                phase: StackActionPhase.DEPLOYMENT_FAILED,
                state: StackActionState.FAILED,
                reason: undefined,
            });
        });

        it('should use UPDATE waiter for UPDATE changeset type', async () => {
            (mockCfnService.waitUntilStackUpdateComplete as any).mockResolvedValue({
                state: WaiterState.SUCCESS,
            });

            const result = await waitForDeployment(mockCfnService, 'test-stack', ChangeSetType.UPDATE);

            expect(result).toEqual({
                phase: StackActionPhase.DEPLOYMENT_COMPLETE,
                state: StackActionState.SUCCESSFUL,
                reason: undefined,
            });
            expect(mockCfnService.waitUntilStackUpdateComplete).toHaveBeenCalledWith({
                StackName: 'test-stack',
            });
        });
    });

    describe('cleanupReviewStack', () => {
        it('should call retryWithExponentialBackoff with correct parameters', async () => {
            const { retryWithExponentialBackoff } = await import('../../../src/utils/Retry');
            (retryWithExponentialBackoff as any).mockResolvedValue(undefined);

            const workflow: StackActionWorkflowState = {
                id: 'test-id',
                changeSetName: 'changeset-123',
                stackName: 'test-stack',
                phase: StackActionPhase.VALIDATION_COMPLETE,
                startTime: Date.now(),
                state: StackActionState.SUCCESSFUL,
            };

            await cleanupReviewStack(mockCfnService, workflow, 'workflow-id');

            expect(retryWithExponentialBackoff).toHaveBeenCalledWith(
                expect.any(Function),
                {
                    maxRetries: 3,
                    initialDelayMs: 1000,
                    operationName: 'Delete stack test-stack',
                    totalTimeoutMs: 30000,
                },
                expect.any(Object), // logger
            );
        });
    });

    describe('deleteChangeSet', () => {
        it('should delete changeset only', async () => {
            const { retryWithExponentialBackoff } = await import('../../../src/utils/Retry');
            (retryWithExponentialBackoff as any).mockResolvedValue(undefined);

            const workflow: StackActionWorkflowState = {
                id: 'test-id',
                changeSetName: 'changeset-123',
                stackName: 'test-stack',
                phase: StackActionPhase.VALIDATION_COMPLETE,
                startTime: Date.now(),
                state: StackActionState.SUCCESSFUL,
            };

            await deleteChangeSet(mockCfnService, workflow, 'workflow-id');

            expect(retryWithExponentialBackoff).toHaveBeenCalledWith(
                expect.any(Function),
                {
                    maxRetries: 3,
                    initialDelayMs: 1000,
                    operationName: 'Delete change set changeset-123',
                    totalTimeoutMs: 30000,
                },
                expect.any(Object), // logger
            );
        });
    });

    describe('mapChangesToStackChanges', () => {
        it('should map AWS SDK changes to stack changes', () => {
            const changes: Change[] = [
                {
                    Type: 'Resource',
                    ResourceChange: {
                        Action: 'Add',
                        LogicalResourceId: 'TestBucket',
                        PhysicalResourceId: 'test-bucket-123',
                        ResourceType: 'AWS::S3::Bucket',
                        Replacement: 'False',
                        Scope: ['Properties'],
                        Details: [
                            {
                                Target: {
                                    Attribute: 'BucketName' as any,
                                    Name: 'TestBucket',
                                    RequiresRecreation: 'Never',
                                },
                            },
                        ],
                    },
                },
            ];

            const result = mapChangesToStackChanges(changes);

            expect(result).toHaveLength(1);
            expect(result![0]).toEqual({
                type: 'Resource',
                resourceChange: {
                    action: 'Add',
                    logicalResourceId: 'TestBucket',
                    physicalResourceId: 'test-bucket-123',
                    resourceType: 'AWS::S3::Bucket',
                    replacement: 'False',
                    scope: ['Properties'],
                    details: [
                        {
                            Target: {
                                Attribute: 'BucketName',
                                Name: 'TestBucket',
                                RequiresRecreation: 'Never',
                            },
                        },
                    ],
                },
            });
        });

        it('should handle undefined changes', () => {
            const result = mapChangesToStackChanges(undefined);
            expect(result).toBeUndefined();
        });

        it('should handle empty changes array', () => {
            const result = mapChangesToStackChanges([]);
            expect(result).toEqual([]);
        });
    });

    describe('waitForValidation', () => {
        it('should return successful result when changeset creation succeeds', async () => {
            (mockCfnService.waitUntilChangeSetCreateComplete as any).mockResolvedValue({
                state: WaiterState.SUCCESS,
            });

            (mockCfnService.describeChangeSet as any).mockResolvedValue({
                Changes: [
                    {
                        Type: 'Resource',
                        ResourceChange: {
                            Action: 'Add',
                            LogicalResourceId: 'TestBucket',
                        },
                    },
                ],
            });

            const result = await waitForChangeSetValidation(mockCfnService, 'test-changeset', 'test-stack');

            expect(result.phase).toBe(StackActionPhase.VALIDATION_COMPLETE);
            expect(result.state).toBe(StackActionState.SUCCESSFUL);
            expect(result.changes).toBeDefined();
            expect(mockCfnService.waitUntilChangeSetCreateComplete).toHaveBeenCalledWith({
                ChangeSetName: 'test-changeset',
                StackName: 'test-stack',
            });
            expect(mockCfnService.describeChangeSet).toHaveBeenCalledWith({
                ChangeSetName: 'test-changeset',
                StackName: 'test-stack',
                IncludePropertyValues: true,
            });
        });

        it('should return failed result when changeset creation fails', async () => {
            (mockCfnService.waitUntilChangeSetCreateComplete as any).mockResolvedValue({
                state: WaiterState.FAILURE,
                reason: 'Test failure',
            });

            const result = await waitForChangeSetValidation(mockCfnService, 'test-changeset', 'test-stack');

            expect(result.phase).toBe(StackActionPhase.VALIDATION_FAILED);
            expect(result.state).toBe(StackActionState.FAILED);
            expect(result.failureReason).toBe('Test failure');
        });

        it('should handle exceptions with error message', async () => {
            (mockCfnService.waitUntilChangeSetCreateComplete as any).mockRejectedValue(new Error('Network error'));

            const result = await waitForChangeSetValidation(mockCfnService, 'test-changeset', 'test-stack');

            expect(result.phase).toBe(StackActionPhase.VALIDATION_FAILED);
            expect(result.state).toBe(StackActionState.FAILED);
            expect(result.failureReason).toBe('Network error');
        });

        it('should handle non-Error exceptions', async () => {
            (mockCfnService.waitUntilChangeSetCreateComplete as any).mockRejectedValue('String error');

            const result = await waitForChangeSetValidation(mockCfnService, 'test-changeset', 'test-stack');

            expect(result.phase).toBe(StackActionPhase.VALIDATION_FAILED);
            expect(result.state).toBe(StackActionState.FAILED);
            expect(result.failureReason).toBe('String error');
        });
    });

    describe('parseValidationEvents', () => {
        it('should parse validation events correctly', () => {
            const events = [
                {
                    EventId: 'event-1',
                    EventType: EventType.VALIDATION_ERROR,
                    Timestamp: new Date('2023-01-01T00:00:00Z'),
                    LogicalResourceId: 'MyS3Bucket',
                    ValidationPath: '/Resources/MyS3Bucket/Properties/BucketName',
                    ValidationFailureMode: HookFailureMode.FAIL,
                    ValidationName: 'S3BucketValidation',
                    ValidationStatusReason: 'Bucket name must be globally unique',
                },
                {
                    EventId: 'event-2',
                    EventType: EventType.VALIDATION_ERROR,
                    Timestamp: new Date('2023-01-01T00:01:00Z'),
                    LogicalResourceId: 'MyLambda',
                    ValidationFailureMode: HookFailureMode.WARN,
                    ValidationName: 'LambdaValidation',
                    ValidationStatusReason: 'Runtime version is deprecated',
                },
                {
                    EventId: 'event-3',
                    EventType: EventType.HOOK_INVOCATION_ERROR,
                    Timestamp: new Date('2023-01-01T00:02:00Z'),
                    LogicalResourceId: 'MyResource',
                },
            ];

            const validationName = 'Enhanced Validation';
            const result = parseValidationEvents(events, validationName);

            expect(result).toHaveLength(2); // Only VALIDATION_ERROR events

            expect(result[0]).toEqual({
                Timestamp: expect.any(Object), // DateTime object
                ValidationName: validationName,
                LogicalId: 'MyS3Bucket',
                Message: 'S3BucketValidation: Bucket name must be globally unique',
                Severity: 'ERROR',
                ResourcePropertyPath: '/Resources/MyS3Bucket/Properties/BucketName',
            });

            expect(result[1]).toEqual({
                Timestamp: expect.any(Object), // DateTime object
                ValidationName: validationName,
                LogicalId: 'MyLambda',
                Message: 'LambdaValidation: Runtime version is deprecated',
                Severity: 'INFO',
                ResourcePropertyPath: undefined,
            });
        });

        it('should handle empty events', () => {
            const events: OperationEvent[] = [];

            const result = parseValidationEvents(events, 'Test Validation');

            expect(result).toHaveLength(0);
        });
    });

    describe('publishValidationDiagnostics', () => {
        let mockSyntaxTreeManager: ReturnType<typeof createMockSyntaxTreeManager>;
        let mockDiagnosticCoordinator: ReturnType<typeof createMockDiagnosticCoordinator>;

        beforeEach(() => {
            mockSyntaxTreeManager = createMockSyntaxTreeManager();
            mockDiagnosticCoordinator = createMockDiagnosticCoordinator();
        });

        it('should publish diagnostics with position information', async () => {
            const mockSyntaxTree = stubInterface<SyntaxTree>();
            mockSyntaxTreeManager.getSyntaxTree.returns(mockSyntaxTree);

            mockDiagnosticCoordinator.getKeyRangeFromPath.returns({
                start: { line: 5, character: 10 },
                end: { line: 5, character: 20 },
            });

            const validationDetails: ValidationDetail[] = [
                {
                    Timestamp: DateTime.fromISO('2023-01-01T00:00:00.000Z'),
                    ValidationName: 'Enhanced Validation',
                    LogicalId: 'MyS3Bucket',
                    Message: 'S3BucketValidation: Bucket name must be globally unique',
                    Severity: 'ERROR',
                    ResourcePropertyPath: '/Resources/MyS3Bucket/Properties/BucketName',
                },
                {
                    Timestamp: DateTime.fromISO('2023-01-01T00:01:00.000Z'),
                    ValidationName: 'Enhanced Validation',
                    LogicalId: 'MyLambda',
                    Message: 'LambdaValidation: Runtime version is deprecated',
                    Severity: 'INFO',
                    ResourcePropertyPath: undefined,
                },
            ];

            await publishValidationDiagnostics(
                'file:///test.yaml',
                validationDetails,
                mockSyntaxTreeManager,
                mockDiagnosticCoordinator,
            );

            expect(mockDiagnosticCoordinator.publishDiagnostics.calledOnce).toBe(true);
            expect(validationDetails[0].diagnosticId).toBeDefined();
        });
    });

    describe('isStackInReview', () => {
        it('should return true when stack status is REVIEW_IN_PROGRESS', async () => {
            (mockCfnService.describeStacks as any).mockResolvedValue({
                Stacks: [
                    {
                        StackName: 'test-stack',
                        StackStatus: StackStatus.REVIEW_IN_PROGRESS,
                    },
                ],
            });

            const result = await isStackInReview('test-stack', mockCfnService);

            expect(result).toBe(true);
            expect(mockCfnService.describeStacks).toHaveBeenCalledWith({
                StackName: 'test-stack',
            });
        });

        it('should return false when stack status is not REVIEW_IN_PROGRESS', async () => {
            (mockCfnService.describeStacks as any).mockResolvedValue({
                Stacks: [
                    {
                        StackName: 'test-stack',
                        StackStatus: StackStatus.CREATE_COMPLETE,
                    },
                ],
            });

            const result = await isStackInReview('test-stack', mockCfnService);

            expect(result).toBe(false);
        });

        it('should throw error when stack is not found', async () => {
            (mockCfnService.describeStacks as any).mockResolvedValue({
                Stacks: [],
            });

            await expect(isStackInReview('missing-stack', mockCfnService)).rejects.toThrow(
                'Stack not found: missing-stack',
            );
        });

        it('should throw error when Stacks array is undefined', async () => {
            (mockCfnService.describeStacks as any).mockResolvedValue({
                Stacks: undefined,
            });

            await expect(isStackInReview('test-stack', mockCfnService)).rejects.toThrow('Stack not found: test-stack');
        });

        it('should handle multiple stacks and find the correct one', async () => {
            (mockCfnService.describeStacks as any).mockResolvedValue({
                Stacks: [
                    {
                        StackName: 'other-stack',
                        StackStatus: StackStatus.CREATE_COMPLETE,
                    },
                    {
                        StackName: 'test-stack',
                        StackStatus: StackStatus.REVIEW_IN_PROGRESS,
                    },
                ],
            });

            const result = await isStackInReview('test-stack', mockCfnService);

            expect(result).toBe(true);
        });
    });

    describe('computeEligibleDeploymentMode', () => {
        it('should return undefined when deploymentMode is not provided', () => {
            const result = computeEligibleDeploymentMode(ChangeSetType.UPDATE, undefined);
            expect(result).toBeUndefined();
        });

        it('should return deploymentMode when all conditions are met for REVERT_DRIFT', () => {
            const result = computeEligibleDeploymentMode(
                ChangeSetType.UPDATE,
                DeploymentMode.REVERT_DRIFT,
                false,
                undefined,
                false,
                OnStackFailure.ROLLBACK,
            );
            expect(result).toBe(DeploymentMode.REVERT_DRIFT);
        });

        it('should return undefined when changeSetType is CREATE', () => {
            const result = computeEligibleDeploymentMode(ChangeSetType.CREATE, DeploymentMode.REVERT_DRIFT);
            expect(result).toBeUndefined();
        });

        it('should return undefined when importExistingResources is true', () => {
            const result = computeEligibleDeploymentMode(ChangeSetType.UPDATE, DeploymentMode.REVERT_DRIFT, true);
            expect(result).toBeUndefined();
        });

        it('should return undefined when resourcesToImport has items', () => {
            const result = computeEligibleDeploymentMode(ChangeSetType.UPDATE, DeploymentMode.REVERT_DRIFT, false, [
                { LogicalResourceId: 'test', ResourceType: 'AWS::S3::Bucket', ResourceIdentifier: {} },
            ]);
            expect(result).toBeUndefined();
        });

        it('should return undefined when includeNestedStacks is true', () => {
            const result = computeEligibleDeploymentMode(
                ChangeSetType.UPDATE,
                DeploymentMode.REVERT_DRIFT,
                false,
                undefined,
                true,
            );
            expect(result).toBeUndefined();
        });

        it('should return undefined when onStackFailure is DO_NOTHING', () => {
            const result = computeEligibleDeploymentMode(
                ChangeSetType.UPDATE,
                DeploymentMode.REVERT_DRIFT,
                false,
                undefined,
                false,
                OnStackFailure.DO_NOTHING,
            );
            expect(result).toBeUndefined();
        });
    });
});
