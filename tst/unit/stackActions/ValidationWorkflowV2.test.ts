import { DateTime } from 'luxon';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { DiagnosticSeverity } from 'vscode-languageserver';
import { FileContextManager } from '../../../src/context/FileContextManager';
import { SyntaxTreeManager } from '../../../src/context/syntaxtree/SyntaxTreeManager';
import { DocumentManager } from '../../../src/document/DocumentManager';
import { CfnServiceV2 } from '../../../src/services/CfnServiceV2';
import { DiagnosticCoordinator } from '../../../src/services/DiagnosticCoordinator';
import {
    processChangeSet,
    waitForChangeSetValidation,
    processWorkflowUpdates,
    deleteStackAndChangeSet,
    deleteChangeSet,
} from '../../../src/stacks/actions/StackActionOperations';
import {
    CreateStackActionParams,
    StackActionPhase,
    StackActionState,
} from '../../../src/stacks/actions/StackActionRequestType';
import { ValidationWorkflowV2, VALIDATION_V2_NAME } from '../../../src/stacks/actions/ValidationWorkflowV2';

vi.mock('../../../src/stacks/actions/StackActionOperations');

describe('ValidationWorkflowV2', () => {
    let validationWorkflowV2: ValidationWorkflowV2;
    let mockCfnServiceV2: CfnServiceV2;
    let mockDocumentManager: DocumentManager;
    let mockDiagnosticCoordinator: DiagnosticCoordinator;
    let mockSyntaxTreeManager: SyntaxTreeManager;
    let mockFileContextManager: FileContextManager;

    beforeEach(() => {
        mockCfnServiceV2 = {
            describeStacks: vi.fn(),
            describeEvents: vi.fn(),
        } as any;
        mockDocumentManager = {} as DocumentManager;
        mockDiagnosticCoordinator = {
            publishDiagnostics: vi.fn().mockResolvedValue(undefined),
        } as any;
        mockSyntaxTreeManager = {
            getSyntaxTree: vi.fn(),
        } as any;
        mockFileContextManager = {} as FileContextManager;

        validationWorkflowV2 = new ValidationWorkflowV2(
            mockCfnServiceV2,
            mockDocumentManager,
            mockDiagnosticCoordinator,
            mockSyntaxTreeManager,
            { add: vi.fn(), get: vi.fn(), remove: vi.fn() } as any, // ValidationManager
            mockFileContextManager,
        );
        vi.clearAllMocks();
    });

    describe('start', () => {
        it('should start validation workflow with CREATE when stack does not exist', async () => {
            const params: CreateStackActionParams = {
                id: 'test-id',
                uri: 'file:///test.yaml',
                stackName: 'test-stack',
            };

            mockCfnServiceV2.describeStacks = vi.fn().mockRejectedValue(new Error('Stack does not exist'));
            (processChangeSet as any).mockResolvedValue('changeset-123');

            const result = await validationWorkflowV2.start(params);

            expect(result).toEqual({
                id: 'test-id',
                changeSetName: 'changeset-123',
                stackName: 'test-stack',
            });

            expect(processChangeSet).toHaveBeenCalledWith(mockCfnServiceV2, mockDocumentManager, params, 'CREATE');
        });

        it('should start validation workflow with UPDATE when stack exists', async () => {
            const params: CreateStackActionParams = {
                id: 'test-id',
                uri: 'file:///test.yaml',
                stackName: 'test-stack',
            };

            mockCfnServiceV2.describeStacks = vi.fn().mockResolvedValue({ Stacks: [{ StackName: 'test-stack' }] });
            (processChangeSet as any).mockResolvedValue('changeset-123');

            const result = await validationWorkflowV2.start(params);

            expect(result).toEqual({
                id: 'test-id',
                changeSetName: 'changeset-123',
                stackName: 'test-stack',
            });

            expect(processChangeSet).toHaveBeenCalledWith(mockCfnServiceV2, mockDocumentManager, params, 'UPDATE');
        });

        it('should start validation workflow with IMPORT when resourcesToImport has items', async () => {
            const params: CreateStackActionParams = {
                id: 'test-id',
                uri: 'file:///test.yaml',
                stackName: 'test-stack',
                resourcesToImport: [
                    {
                        ResourceType: 'AWS::S3::Bucket',
                        LogicalResourceId: 'MyBucket',
                        ResourceIdentifier: { BucketName: 'my-bucket' },
                    },
                ],
            };

            (processChangeSet as any).mockResolvedValue('changeset-123');

            const result = await validationWorkflowV2.start(params);

            expect(result).toEqual({
                id: 'test-id',
                changeSetName: 'changeset-123',
                stackName: 'test-stack',
            });

            expect(processChangeSet).toHaveBeenCalledWith(mockCfnServiceV2, mockDocumentManager, params, 'IMPORT');
            expect(mockCfnServiceV2.describeStacks).not.toHaveBeenCalled();
        });
    });

    describe('parseEvents', () => {
        it('should parse validation events correctly', () => {
            const mockEvents = {
                OperationEvents: [
                    {
                        EventId: 'event-1',
                        EventType: 'VALIDATION_ERROR',
                        Timestamp: '2023-01-01T00:00:00Z',
                        LogicalResourceId: 'MyBucket',
                        ValidationPath: '/Resources/MyBucket/Properties/BucketName',
                        ValidationFailureMode: 'FAIL',
                        ValidationName: 'BucketNameValidation',
                        ValidationStatusReason: 'Invalid bucket name',
                        Details: 'Bucket name must be lowercase',
                    },
                    {
                        EventId: 'event-2',
                        EventType: 'VALIDATION_WARNING',
                        Timestamp: '2023-01-01T00:01:00Z',
                        LogicalResourceId: 'MyRole',
                        ValidationFailureMode: 'WARN',
                        ValidationName: 'RoleValidation',
                        ValidationStatusReason: 'Role has broad permissions',
                    },
                    {
                        EventId: 'event-3',
                        EventType: 'OTHER_EVENT',
                        Timestamp: '2023-01-01T00:02:00Z',
                    },
                ],
            };

            const result = (validationWorkflowV2 as any).parseEvents(mockEvents);

            expect(result).toHaveLength(1); // Only VALIDATION_ERROR events
            expect(result[0]).toEqual({
                Timestamp: DateTime.fromISO('2023-01-01T00:00:00Z'),
                ValidationName: VALIDATION_V2_NAME,
                LogicalId: 'MyBucket',
                Message: 'BucketNameValidation: Invalid bucket name',
                Severity: 'ERROR',
                ResourcePropertyPath: '/Resources/MyBucket/Properties/BucketName',
            });
        });

        it('should handle events with missing optional fields', () => {
            const mockEvents = {
                OperationEvents: [
                    {
                        EventId: 'event-1',
                        EventType: 'VALIDATION_ERROR',
                        Timestamp: '2023-01-01T00:00:00Z',
                        ValidationFailureMode: 'WARN',
                    },
                ],
            };

            const result = (validationWorkflowV2 as any).parseEvents(mockEvents);

            expect(result).toHaveLength(1);
            expect(result[0]).toEqual({
                Timestamp: DateTime.fromISO('2023-01-01T00:00:00Z'),
                ValidationName: VALIDATION_V2_NAME,
                LogicalId: undefined,
                Message: '',
                Severity: 'INFO',
                ResourcePropertyPath: undefined,
            });
        });
    });

    describe('publishDiagnostics', () => {
        it('should publish diagnostics for validation events with property paths', () => {
            const mockSyntaxTree = {
                getNodeByPath: vi.fn().mockReturnValue({
                    node: {
                        startPosition: { row: 5, column: 10 },
                        endPosition: { row: 5, column: 20 },
                    },
                    fullyResolved: true,
                }),
            };
            mockSyntaxTreeManager.getSyntaxTree = vi.fn().mockReturnValue(mockSyntaxTree);

            const validationDetails = [
                {
                    Timestamp: DateTime.now(),
                    ValidationName: VALIDATION_V2_NAME,
                    LogicalId: 'MyBucket',
                    Message: 'Validation error message',
                    Severity: 'ERROR' as const,
                    ResourcePropertyPath: '/Resources/MyBucket/Properties/BucketName',
                },
            ];

            (validationWorkflowV2 as any).publishDiagnostics('file:///test.yaml', validationDetails);

            expect(mockSyntaxTreeManager.getSyntaxTree).toHaveBeenCalledWith('file:///test.yaml');
            expect(mockSyntaxTree.getNodeByPath).toHaveBeenCalledWith([
                'Resources',
                'MyBucket',
                'Properties',
                'BucketName',
            ]);
            expect(mockDiagnosticCoordinator.publishDiagnostics).toHaveBeenCalledWith(
                'CFN Dry-Run',
                'file:///test.yaml',
                [
                    expect.objectContaining({
                        severity: DiagnosticSeverity.Error,
                        range: {
                            start: { line: 5, character: 10 },
                            end: { line: 5, character: 20 },
                        },
                        message: 'Validation error message',
                        source: 'CFN Dry-Run',
                    }),
                ],
            );
        });

        it('should fall back to logical ID when property path is not available', () => {
            const mockSyntaxTree = {
                getNodeByPath: vi.fn(),
                findTopLevelSections: vi.fn().mockReturnValue(
                    new Map([
                        [
                            'Resources',
                            {
                                /* mock node */
                            },
                        ],
                    ]),
                ),
            };

            mockSyntaxTreeManager.getSyntaxTree = vi.fn().mockReturnValue(mockSyntaxTree);

            const validationDetails = [
                {
                    Timestamp: DateTime.now(),
                    ValidationName: VALIDATION_V2_NAME,
                    LogicalId: 'MyBucket',
                    Message: 'Validation error message',
                    Severity: 'ERROR' as const,
                    ResourcePropertyPath: undefined,
                },
            ];

            // Mock getEntityMap to return undefined (no resources found)
            vi.doMock('../../../src/context/SectionContextBuilder', () => ({
                getEntityMap: vi.fn().mockReturnValue(undefined),
            }));

            (validationWorkflowV2 as any).publishDiagnostics('file:///test.yaml', validationDetails);

            // Should not publish diagnostics when no position found
            expect(mockDiagnosticCoordinator.publishDiagnostics).toHaveBeenCalledWith(
                'CFN Dry-Run',
                'file:///test.yaml',
                [],
            );
        });

        it('should handle missing syntax tree gracefully', () => {
            mockSyntaxTreeManager.getSyntaxTree = vi.fn().mockReturnValue(null);

            const validationDetails = [
                {
                    Timestamp: DateTime.now(),
                    ValidationName: VALIDATION_V2_NAME,
                    LogicalId: 'MyBucket',
                    Message: 'Validation error message',
                    Severity: 'ERROR' as const,
                    ResourcePropertyPath: '/Resources/MyBucket/Properties/BucketName',
                },
            ];

            (validationWorkflowV2 as any).publishDiagnostics('file:///test.yaml', validationDetails);

            expect(mockDiagnosticCoordinator.publishDiagnostics).not.toHaveBeenCalled();
        });
    });

    describe('full workflow execution', () => {
        const waitForWorkflowCompletion = async (workflowId: string): Promise<void> => {
            let attempts = 0;
            const maxAttempts = 3;
            while (attempts < maxAttempts) {
                const workflow = (validationWorkflowV2 as any).workflows.get(workflowId);
                if (workflow?.state !== StackActionState.IN_PROGRESS) {
                    return;
                }
                await new Promise((resolve) => setTimeout(resolve, 50));
                attempts++;
            }
        };

        let mockValidationManager: any;

        beforeEach(() => {
            mockValidationManager = { add: vi.fn(), get: vi.fn(), remove: vi.fn() };

            mockCfnServiceV2.describeStacks = vi.fn().mockRejectedValue(new Error('Stack does not exist'));

            (processChangeSet as any).mockResolvedValue('changeset-123');

            (waitForChangeSetValidation as any).mockResolvedValue({
                phase: StackActionPhase.VALIDATION_COMPLETE,
                state: StackActionState.SUCCESSFUL,
                changes: [],
            });

            mockCfnServiceV2.describeEvents = vi.fn().mockResolvedValue({
                OperationEvents: [],
            });

            (deleteStackAndChangeSet as any).mockResolvedValue(undefined);
            (deleteChangeSet as any).mockResolvedValue(undefined);

            (processWorkflowUpdates as any).mockImplementation((map: any, workflow: any, updates: any) => {
                const updated = { ...workflow, ...updates };
                map.set(workflow.id, updated);
                return updated;
            });

            validationWorkflowV2 = new ValidationWorkflowV2(
                mockCfnServiceV2,
                mockDocumentManager,
                mockDiagnosticCoordinator,
                mockSyntaxTreeManager,
                mockValidationManager,
                mockFileContextManager,
            );
        });

        it('should handle successful validation workflow with events', async () => {
            const params: CreateStackActionParams = {
                id: 'test-id',
                uri: 'file:///test.yaml',
                stackName: 'test-stack',
            };

            const mockChanges = [{ resourceChange: { action: 'Add', logicalResourceId: 'TestResource' } }];
            (waitForChangeSetValidation as any).mockResolvedValueOnce({
                phase: StackActionPhase.VALIDATION_COMPLETE,
                state: StackActionState.SUCCESSFUL,
                changes: mockChanges,
            });

            mockCfnServiceV2.describeEvents = vi.fn().mockResolvedValue({
                OperationEvents: [
                    {
                        EventId: 'event-1',
                        EventType: 'VALIDATION_ERROR',
                        Timestamp: '2023-01-01T00:00:00Z',
                        LogicalResourceId: 'TestResource',
                        ValidationFailureMode: 'FAIL',
                        ValidationName: 'TestValidation',
                        ValidationStatusReason: 'Test error',
                    },
                ],
            });

            mockSyntaxTreeManager.getSyntaxTree = vi.fn().mockReturnValue(null);

            const result = await validationWorkflowV2.start(params);
            await waitForWorkflowCompletion('test-id');

            expect(result.changeSetName).toBe('changeset-123');
            expect(mockValidationManager.add).toHaveBeenCalled();
            expect(waitForChangeSetValidation).toHaveBeenCalledWith(mockCfnServiceV2, 'changeset-123', 'test-stack');
            expect(mockCfnServiceV2.describeEvents).toHaveBeenCalledWith({
                ChangeSetName: 'changeset-123',
                StackName: 'test-stack',
            });

            const workflow = (validationWorkflowV2 as any).workflows.get('test-id');
            expect(workflow.changes).toEqual(mockChanges);
            expect(workflow.validationDetails).toBeDefined();
            expect(workflow.validationDetails[0].ValidationName).toBe(VALIDATION_V2_NAME);
        });

        it('should handle validation failure', async () => {
            const params: CreateStackActionParams = {
                id: 'test-id',
                uri: 'file:///test.yaml',
                stackName: 'test-stack',
            };

            (waitForChangeSetValidation as any).mockResolvedValueOnce({
                phase: StackActionPhase.VALIDATION_FAILED,
                state: StackActionState.FAILED,
                failureReason: 'Template validation failed',
            });

            await validationWorkflowV2.start(params);
            await waitForWorkflowCompletion('test-id');

            expect(mockValidationManager.add).toHaveBeenCalled();
            expect(mockValidationManager.remove).toHaveBeenCalledWith('test-stack');

            const workflow = (validationWorkflowV2 as any).workflows.get('test-id');
            expect(workflow.failureReason).toBe('Template validation failed');
        });

        it('should handle validation exception', async () => {
            const params: CreateStackActionParams = {
                id: 'test-id',
                uri: 'file:///test.yaml',
                stackName: 'test-stack',
            };

            (waitForChangeSetValidation as any).mockRejectedValueOnce(new Error('Validation service error'));

            await validationWorkflowV2.start(params);
            await waitForWorkflowCompletion('test-id');

            expect(mockValidationManager.remove).toHaveBeenCalledWith('test-stack');
            expect(deleteStackAndChangeSet).toHaveBeenCalled();

            const workflow = (validationWorkflowV2 as any).workflows.get('test-id');
            expect(workflow.failureReason).toBe('Validation service error');
        });

        it('should handle Describe Events failure', async () => {
            const params: CreateStackActionParams = {
                id: 'test-id',
                uri: 'file:///test.yaml',
                stackName: 'test-stack',
            };

            (waitForChangeSetValidation as any).mockResolvedValueOnce({
                phase: StackActionPhase.VALIDATION_COMPLETE,
                state: StackActionState.SUCCESSFUL,
                changes: [],
            });

            mockCfnServiceV2.describeEvents = vi.fn().mockRejectedValue(new Error('Describe Events failed'));

            await validationWorkflowV2.start(params);
            await waitForWorkflowCompletion('test-id');

            expect(mockValidationManager.remove).toHaveBeenCalledWith('test-stack');

            const workflow = (validationWorkflowV2 as any).workflows.get('test-id');
            expect(workflow.failureReason).toBe('Describe Events failed');
        });
    });
});
