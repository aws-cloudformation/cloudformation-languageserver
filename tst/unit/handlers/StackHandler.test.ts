import {
    Capability,
    StackSummary,
    StackStatus,
    StackResourceSummary,
    ChangeSetStatus,
} from '@aws-sdk/client-cloudformation';
import { StubbedInstance } from 'ts-sinon';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { CancellationToken, ResponseError, ErrorCodes } from 'vscode-languageserver';
import { Template } from '../../../src/artifactexporter/ArtifactExporter';
import { Context } from '../../../src/context/Context';
import * as SectionContextBuilder from '../../../src/context/SectionContextBuilder';
import { SyntaxTree } from '../../../src/context/syntaxtree/SyntaxTree';
import { SyntaxTreeManager } from '../../../src/context/syntaxtree/SyntaxTreeManager';
import { Document } from '../../../src/document/Document';
import {
    getCapabilitiesHandler,
    getParametersHandler,
    getTemplateArtifactsHandler,
    createValidationHandler,
    createDeploymentHandler,
    getValidationStatusHandler,
    getDeploymentStatusHandler,
    listStacksHandler,
    listStackResourcesHandler,
    describeValidationStatusHandler,
    describeDeploymentStatusHandler,
    getTemplateResourcesHandler,
    deleteChangeSetHandler,
    describeChangeSetDeletionStatusHandler,
    getChangeSetDeletionStatusHandler,
    describeStackHandler,
    describeChangeSetHandler,
} from '../../../src/handlers/StackHandler';
import { analyzeCapabilities } from '../../../src/stacks/actions/CapabilityAnalyzer';
import { mapChangesToStackChanges } from '../../../src/stacks/actions/StackActionOperations';
import {
    TemplateUri,
    GetCapabilitiesResult,
    GetParametersResult,
    GetTemplateArtifactsResult,
    GetTemplateResourcesResult,
    StackActionPhase,
    StackActionState,
} from '../../../src/stacks/actions/StackActionRequestType';
import {
    ListStacksParams,
    ListStacksResult,
    ListStackResourcesResult,
    DescribeStackResult,
    DescribeChangeSetParams,
    DescribeChangeSetResult,
} from '../../../src/stacks/StackRequestType';
import {
    createMockComponents,
    createMockSyntaxTreeManager,
    MockedServerComponents,
} from '../../utils/MockServerComponents';
import { combinedSchemas } from '../../utils/SchemaUtils';

vi.mock('../../../src/context/SectionContextBuilder', () => ({
    getEntityMap: vi.fn(),
}));

vi.mock('../../../src/artifactexporter/ArtifactExporter', () => ({
    Template: vi.fn().mockImplementation(() => ({
        getTemplateArtifacts: vi.fn().mockReturnValue([]),
    })),
}));

// Mock the parsers
vi.mock('../../../src/protocol/LspParser', () => ({
    parseIdentifiable: vi.fn((input) => input),
}));

vi.mock('../../../src/stacks/actions/StackActionParser', () => ({
    parseCreateValidationParams: vi.fn((input) => input),
    parseTemplateUriParams: vi.fn((input) => input),
    parseCreateDeploymentParams: vi.fn((input) => input),
    parseDeleteChangeSetParams: vi.fn((input) => input),
    parseListStackResourcesParams: vi.fn((input) => input),
    parseDescribeStackParams: vi.fn((input) => input),
    parseDescribeChangeSetParams: vi.fn((input) => input),
}));

vi.mock('../../../src/utils/ZodErrorWrapper', () => ({
    parseWithPrettyError: vi.fn((parser, input) => parser(input)),
}));

vi.mock('../../../src/stacks/actions/CapabilityAnalyzer', () => ({
    analyzeCapabilities: vi.fn(),
}));

vi.mock('../../../src/stacks/actions/StackActionOperations', () => ({
    mapChangesToStackChanges: vi.fn(),
}));

describe('StackActionHandler', () => {
    let mockComponents: MockedServerComponents;
    let syntaxTreeManager: StubbedInstance<SyntaxTreeManager>;
    let getEntityMapSpy: any;
    const mockToken = {} as CancellationToken;

    beforeEach(() => {
        syntaxTreeManager = createMockSyntaxTreeManager();
        mockComponents = createMockComponents({ syntaxTreeManager });
        getEntityMapSpy = vi.mocked(SectionContextBuilder.getEntityMap);
        mockComponents.validationWorkflowService.start.reset();
        mockComponents.validationWorkflowService.getStatus.reset();
        mockComponents.deploymentWorkflowService.start.reset();
        mockComponents.deploymentWorkflowService.getStatus.reset();
        vi.clearAllMocks();
    });

    describe('getParametersHandler', () => {
        it('returns empty array when no syntax tree found', () => {
            const templateUri: TemplateUri = 'test://template.yaml';
            syntaxTreeManager.getSyntaxTree.withArgs(templateUri).returns(undefined);

            const handler = getParametersHandler(mockComponents);
            const result = handler(templateUri, mockToken) as GetParametersResult;

            expect(result).toEqual({ parameters: [] });
        });

        it('returns empty array when getEntityMap returns undefined', () => {
            const templateUri: TemplateUri = 'test://template.yaml';
            const mockSyntaxTree = {} as SyntaxTree;

            syntaxTreeManager.getSyntaxTree.withArgs(templateUri).returns(mockSyntaxTree);
            getEntityMapSpy.mockReturnValue(undefined);

            const handler = getParametersHandler(mockComponents);
            const result = handler(templateUri, mockToken) as GetParametersResult;

            expect(result).toEqual({ parameters: [] });
        });

        it('returns parameters when parameters section exists', () => {
            const templateUri: TemplateUri = 'test://template.yaml';
            const mockSyntaxTree = {} as SyntaxTree;
            const mockParam1 = { name: 'param1', type: 'String' };
            const mockParam2 = { name: 'param2', type: 'Number' };
            const mockContext1 = { entity: mockParam1 } as unknown as Context;
            const mockContext2 = { entity: mockParam2 } as unknown as Context;
            const parametersMap = new Map([
                ['param1', mockContext1],
                ['param2', mockContext2],
            ]);

            syntaxTreeManager.getSyntaxTree.withArgs(templateUri).returns(mockSyntaxTree);
            getEntityMapSpy.mockReturnValue(parametersMap);

            const handler = getParametersHandler(mockComponents);
            const result = handler(templateUri, mockToken) as GetParametersResult;

            expect(result.parameters).toHaveLength(2);
            expect(result.parameters[0]).toBe(mockParam1);
            expect(result.parameters[1]).toBe(mockParam2);
        });
    });

    describe('getTemplateArtifactsHandler', () => {
        it('should return artifacts when document is available', () => {
            const templateUri: TemplateUri = 'test://template.yaml';
            const mockDocument = { uri: templateUri } as unknown as Document;
            const mockArtifacts = [
                { resourceType: 'AWS::Lambda::Function', filePath: './src/handler.js' },
                { resourceType: 'AWS::S3::Bucket', filePath: './assets/data.json' },
            ];

            mockComponents.documentManager.get.withArgs(templateUri).returns(mockDocument);

            // Mock the Template constructor to return a mock with getTemplateArtifacts
            const mockTemplateInstance = {
                getTemplateArtifacts: vi.fn().mockReturnValue(mockArtifacts),
            };
            vi.mocked(Template).mockImplementation(() => mockTemplateInstance as any);

            const handler = getTemplateArtifactsHandler(mockComponents);
            const result = handler(templateUri, mockToken) as GetTemplateArtifactsResult;

            expect(result.artifacts).toEqual(mockArtifacts);
        });

        it('should throw error when document is not found', () => {
            const templateUri: TemplateUri = 'test://template.yaml';

            mockComponents.documentManager.get.withArgs(templateUri).returns(undefined);

            const handler = getTemplateArtifactsHandler(mockComponents);

            expect(() => handler(templateUri, mockToken)).toThrow(
                'Cannot retrieve file with uri: test://template.yaml',
            );
        });
    });

    describe('getCapabilitiesHandler', () => {
        it('should return capabilities when document is available', async () => {
            const templateUri: TemplateUri = 'test://template.yaml';
            const mockDocument = { getText: vi.fn().mockReturnValue('template content') } as unknown as Document;
            const mockCapabilities = ['CAPABILITY_IAM', 'CAPABILITY_NAMED_IAM'] as Capability[];

            mockComponents.documentManager.get.withArgs(templateUri).returns(mockDocument);
            vi.mocked(analyzeCapabilities).mockResolvedValue(mockCapabilities);

            const handler = getCapabilitiesHandler(mockComponents);
            const result = (await handler(templateUri, mockToken)) as GetCapabilitiesResult;

            expect(result.capabilities).toEqual(mockCapabilities);
        });

        it('should throw error when document is not available', async () => {
            const templateUri: TemplateUri = 'test://template.yaml';
            mockComponents.documentManager.get.withArgs(templateUri).returns(undefined);

            const handler = getCapabilitiesHandler(mockComponents);

            await expect(handler(templateUri, mockToken)).rejects.toThrow(ResponseError);
        });
    });

    describe('createValidationHandler', () => {
        it('should delegate to validation service', async () => {
            const mockResult = { id: 'test-id', changeSetName: 'cs-123', stackName: 'test-stack' };
            mockComponents.validationWorkflowService.start.resolves(mockResult);

            const handler = createValidationHandler(mockComponents);
            const params = { id: 'test-id', uri: 'file:///test.yaml', stackName: 'test-stack' };

            const result = await handler(params, {} as any);

            expect(mockComponents.validationWorkflowService.start.calledWith(params)).toBe(true);
            expect(result).toEqual(mockResult);
        });

        it('should propagate ResponseError from service', async () => {
            const responseError = new ResponseError(ErrorCodes.InternalError, 'Service error');
            mockComponents.validationWorkflowService.start.rejects(responseError);

            const handler = createValidationHandler(mockComponents);
            const params = { id: 'test-id', uri: 'file:///test.yaml', stackName: 'test-stack' };

            await expect(handler(params, {} as any)).rejects.toThrow(responseError);
        });

        it('should wrap other errors as InternalError', async () => {
            mockComponents.validationWorkflowService.start.rejects(new Error('Generic error'));

            const handler = createValidationHandler(mockComponents);
            const params = { id: 'test-id', uri: 'file:///test.yaml', stackName: 'test-stack' };

            await expect(handler(params, {} as any)).rejects.toThrow(ResponseError);
        });
    });

    describe('createDeploymentHandler', () => {
        it('should delegate to deployment service', async () => {
            const mockResult = { id: 'test-id', changeSetName: 'cs-123', stackName: 'test-stack' };
            mockComponents.deploymentWorkflowService.start.resolves(mockResult);

            const handler = createDeploymentHandler(mockComponents);
            const params = { id: 'test-id', stackName: 'test-stack', changeSetName: 'test-change-set' };

            const result = await handler(params, {} as any);

            expect(mockComponents.deploymentWorkflowService.start.calledWith(params)).toBe(true);
            expect(result).toEqual(mockResult);
        });
    });

    describe('getValidationStatusHandler', () => {
        it('should delegate to validation service get', async () => {
            const mockResult = {
                id: 'test-id',
                status: StackActionPhase.VALIDATION_COMPLETE,
                result: StackActionState.SUCCESSFUL,
            };
            mockComponents.validationWorkflowService.getStatus.resolves(mockResult);

            const handler = getValidationStatusHandler(mockComponents);
            const params = { id: 'test-id' };

            const result = await handler(params, {} as any);

            expect(mockComponents.validationWorkflowService.getStatus.calledWith(params)).toBe(true);
            expect(result).toEqual(mockResult);
        });
    });

    describe('getDeploymentStatusHandler', () => {
        it('should delegate to deployment service get', async () => {
            const mockResult = {
                id: 'test-id',
                status: StackActionPhase.DEPLOYMENT_COMPLETE,
                result: StackActionState.SUCCESSFUL,
            };
            mockComponents.deploymentWorkflowService.getStatus.resolves(mockResult);

            const handler = getDeploymentStatusHandler(mockComponents);
            const params = { id: 'test-id' };

            const result = await handler(params, {} as any);

            expect(mockComponents.deploymentWorkflowService.getStatus.calledWith(params)).toBe(true);
            expect(result).toEqual(mockResult);
        });
    });

    describe('describeValidationStatusHandler', () => {
        it('should delegate to validation service describe', async () => {
            const mockResult = {
                id: 'test-id',
                status: StackActionPhase.VALIDATION_COMPLETE,
                result: StackActionState.SUCCESSFUL,
                ValidationDetails: [],
            };
            mockComponents.validationWorkflowService.describeStatus.resolves(mockResult);

            const handler = describeValidationStatusHandler(mockComponents);
            const params = { id: 'test-id' };

            const result = await handler(params, {} as any);

            expect(mockComponents.validationWorkflowService.describeStatus.calledWith(params)).toBe(true);
            expect(result).toEqual(mockResult);
        });
    });

    describe('describeDeploymentStatusHandler', () => {
        it('should delegate to deployment service describe', async () => {
            const mockResult = {
                id: 'test-id',
                status: StackActionPhase.DEPLOYMENT_COMPLETE,
                result: StackActionState.SUCCESSFUL,
                DeploymentEvents: [],
            };
            mockComponents.deploymentWorkflowService.describeStatus.resolves(mockResult);

            const handler = describeDeploymentStatusHandler(mockComponents);
            const params = { id: 'test-id' };

            const result = await handler(params, {} as any);

            expect(mockComponents.deploymentWorkflowService.describeStatus.calledWith(params)).toBe(true);
            expect(result).toEqual(mockResult);
        });
    });

    describe('deleteChangeSetHandler', () => {
        it('should delegate to deletion service', async () => {
            const mockResult = { id: 'test-id', changeSetName: 'cs-123', stackName: 'test-stack' };
            mockComponents.changeSetDeletionWorkflowService.start.resolves(mockResult);

            const handler = deleteChangeSetHandler(mockComponents);
            const params = { id: 'test-id', stackName: 'test-stack', changeSetName: 'cs-123' };

            const result = await handler(params, {} as any);

            expect(mockComponents.changeSetDeletionWorkflowService.start.calledWith(params)).toBe(true);
            expect(result).toEqual(mockResult);
        });

        it('should propagate ResponseError from service', async () => {
            const responseError = new ResponseError(ErrorCodes.InternalError, 'Service error');
            mockComponents.changeSetDeletionWorkflowService.start.rejects(responseError);

            const handler = deleteChangeSetHandler(mockComponents);
            const params = { id: 'test-id', stackName: 'test-stack', changeSetName: 'cs-123' };

            await expect(handler(params, {} as any)).rejects.toThrow(responseError);
        });

        it('should wrap other errors as InternalError', async () => {
            mockComponents.changeSetDeletionWorkflowService.start.rejects(new Error('Generic error'));

            const handler = deleteChangeSetHandler(mockComponents);
            const params = { id: 'test-id', stackName: 'test-stack', changeSetName: 'cs-123' };

            await expect(handler(params, {} as any)).rejects.toThrow(ResponseError);
        });
    });

    describe('getChangeSetDeletionStatusHandler', () => {
        it('should delegate to deletion service get', async () => {
            const mockResult = {
                id: 'test-id',
                status: StackActionPhase.DEPLOYMENT_COMPLETE,
                result: StackActionState.SUCCESSFUL,
            };
            mockComponents.changeSetDeletionWorkflowService.getStatus.resolves(mockResult);

            const handler = getChangeSetDeletionStatusHandler(mockComponents);
            const params = { id: 'test-id' };

            const result = await handler(params, {} as any);

            expect(mockComponents.changeSetDeletionWorkflowService.getStatus.calledWith(params)).toBe(true);
            expect(result).toEqual(mockResult);
        });
    });

    describe('describeChangeSetDeletionStatusHandler', () => {
        it('should delegate to deletion service describe', async () => {
            const mockResult = {
                id: 'test-id',
                status: StackActionPhase.VALIDATION_COMPLETE,
                result: StackActionState.SUCCESSFUL,
            };
            mockComponents.changeSetDeletionWorkflowService.describeStatus.resolves(mockResult);

            const handler = describeChangeSetDeletionStatusHandler(mockComponents);
            const params = { id: 'test-id' };

            const result = await handler(params, {} as any);

            expect(mockComponents.changeSetDeletionWorkflowService.describeStatus.calledWith(params)).toBe(true);
            expect(result).toEqual(mockResult);
        });
    });

    describe('listStacksHandler', () => {
        const mockParams = {} as ListStacksParams;
        const mockToken = {} as CancellationToken;

        it('should return stacks on success', async () => {
            const mockStacks: StackSummary[] = [
                {
                    StackName: 'test-stack',
                    StackStatus: 'CREATE_COMPLETE',
                } as StackSummary,
            ];

            const mockComponents = {
                stackManager: {
                    listStacks: vi.fn().mockResolvedValue({ stacks: mockStacks, nextToken: undefined }),
                },
            } as any;

            const handler = listStacksHandler(mockComponents);
            const result = (await handler(mockParams, mockToken)) as ListStacksResult;

            expect(result.stacks).toEqual(mockStacks);
        });

        it('should return empty array on error', async () => {
            const mockComponents = {
                stackManager: {
                    listStacks: vi.fn().mockRejectedValue(new Error('API Error')),
                },
            } as any;

            const handler = listStacksHandler(mockComponents);
            const result = (await handler(mockParams, mockToken)) as ListStacksResult;

            expect(result.stacks).toEqual([]);
        });

        it('should pass statusToInclude to stackManager', async () => {
            const mockStacks: StackSummary[] = [];
            const mockComponents = {
                stackManager: {
                    listStacks: vi.fn().mockResolvedValue({ stacks: mockStacks, nextToken: undefined }),
                },
            } as any;

            const paramsWithInclude: ListStacksParams = {
                statusToInclude: [StackStatus.CREATE_COMPLETE],
            };

            const handler = listStacksHandler(mockComponents);
            await handler(paramsWithInclude, mockToken);

            expect(mockComponents.stackManager.listStacks).toHaveBeenCalledWith(
                [StackStatus.CREATE_COMPLETE],
                undefined,
                undefined,
            );
        });

        it('should pass statusToExclude to stackManager', async () => {
            const mockStacks: StackSummary[] = [];
            const mockComponents = {
                stackManager: {
                    listStacks: vi.fn().mockResolvedValue({ stacks: mockStacks, nextToken: undefined }),
                },
            } as any;

            const paramsWithExclude: ListStacksParams = {
                statusToExclude: [StackStatus.DELETE_COMPLETE],
            };

            const handler = listStacksHandler(mockComponents);
            await handler(paramsWithExclude, mockToken);

            expect(mockComponents.stackManager.listStacks).toHaveBeenCalledWith(
                undefined,
                [StackStatus.DELETE_COMPLETE],
                undefined,
            );
        });

        it('should return empty array when both statusToInclude and statusToExclude are provided', async () => {
            const mockComponents = {
                stackManager: {
                    listStacks: vi.fn(),
                },
            } as any;

            const paramsWithBoth: ListStacksParams = {
                statusToInclude: [StackStatus.CREATE_COMPLETE],
                statusToExclude: [StackStatus.DELETE_COMPLETE],
            };

            const handler = listStacksHandler(mockComponents);
            const result = (await handler(paramsWithBoth, mockToken)) as ListStacksResult;

            expect(result.stacks).toEqual([]);
            expect(mockComponents.stackManager.listStacks).not.toHaveBeenCalled();
        });
    });

    describe('listStackResourcesHandler', () => {
        it('should return resources on success', async () => {
            const mockResources: StackResourceSummary[] = [
                {
                    LogicalResourceId: 'MyBucket',
                    ResourceType: 'AWS::S3::Bucket',
                    ResourceStatus: 'CREATE_COMPLETE',
                } as StackResourceSummary,
            ];

            mockComponents.cfnService.listStackResources.resolves({
                StackResourceSummaries: mockResources,
                NextToken: 'nextToken456',
                $metadata: {},
            });

            const handler = listStackResourcesHandler(mockComponents);
            const params = { stackName: 'test-stack', nextToken: 'token123' };
            const result = (await handler(params, {} as any)) as ListStackResourcesResult;

            expect(result.resources).toEqual(mockResources);
            expect(result.nextToken).toBe('nextToken456');
            expect(
                mockComponents.cfnService.listStackResources.calledWith({
                    StackName: 'test-stack',
                    NextToken: 'token123',
                }),
            ).toBe(true);
        });

        it('should return empty array on error', async () => {
            mockComponents.cfnService.listStackResources.rejects(new Error('API Error'));

            const handler = listStackResourcesHandler(mockComponents);
            const params = { stackName: 'test-stack' };
            const result = (await handler(params, {} as any)) as ListStackResourcesResult;

            expect(result.resources).toEqual([]);
        });

        it('should handle undefined StackResourceSummaries', async () => {
            mockComponents.cfnService.listStackResources.resolves({ StackResourceSummaries: undefined, $metadata: {} });

            const handler = listStackResourcesHandler(mockComponents);
            const params = { stackName: 'test-stack' };
            const result = (await handler(params, {} as any)) as ListStackResourcesResult;

            expect(result.resources).toEqual([]);
            expect(result.nextToken).toBeUndefined();
        });
    });

    describe('getTemplateResourcesHandler', () => {
        it('returns empty array when no syntax tree found', () => {
            const templateUri: TemplateUri = 'test://template.yaml';
            syntaxTreeManager.getSyntaxTree.withArgs(templateUri).returns(undefined);

            const handler = getTemplateResourcesHandler(mockComponents);
            const result = handler(templateUri, mockToken) as GetTemplateResourcesResult;

            expect(result).toEqual({ resources: [] });
        });

        it('returns empty array when getEntityMap returns undefined', () => {
            const templateUri: TemplateUri = 'test://template.yaml';
            const mockSyntaxTree = {} as SyntaxTree;

            syntaxTreeManager.getSyntaxTree.withArgs(templateUri).returns(mockSyntaxTree);
            getEntityMapSpy.mockReturnValue(undefined);

            const handler = getTemplateResourcesHandler(mockComponents);
            const result = handler(templateUri, mockToken) as GetTemplateResourcesResult;

            expect(result).toEqual({ resources: [] });
        });

        it('returns resources with primary identifier keys from schema', () => {
            const templateUri: TemplateUri = 'test://template.yaml';
            const mockSyntaxTree = {} as SyntaxTree;
            const mockResource = {
                name: 'MyBucket',
                Type: 'AWS::S3::Bucket',
                Metadata: undefined,
            };
            const mockContext = { entity: mockResource } as unknown as Context;
            const resourcesMap = new Map([['MyBucket', mockContext]]);

            syntaxTreeManager.getSyntaxTree.withArgs(templateUri).returns(mockSyntaxTree);
            getEntityMapSpy.mockReturnValue(resourcesMap);

            mockComponents.schemaRetriever.getDefault.returns(combinedSchemas());

            const handler = getTemplateResourcesHandler(mockComponents);
            const result = handler(templateUri, mockToken) as GetTemplateResourcesResult;

            expect(result.resources).toHaveLength(1);
            expect(result.resources[0]).toEqual({
                logicalId: 'MyBucket',
                type: 'AWS::S3::Bucket',
                primaryIdentifierKeys: ['BucketName'],
                primaryIdentifier: undefined,
            });
        });

        it('returns resources with primary identifier from metadata string', () => {
            const templateUri: TemplateUri = 'test://template.yaml';
            const mockSyntaxTree = {} as SyntaxTree;
            const mockResource = {
                name: 'MyBucket',
                Type: 'AWS::S3::Bucket',
                Metadata: {
                    PrimaryIdentifier: 'my-existing-bucket',
                },
            };
            const mockContext = { entity: mockResource } as unknown as Context;
            const resourcesMap = new Map([['MyBucket', mockContext]]);

            syntaxTreeManager.getSyntaxTree.withArgs(templateUri).returns(mockSyntaxTree);
            getEntityMapSpy.mockReturnValue(resourcesMap);

            mockComponents.schemaRetriever.getDefault.returns(combinedSchemas());

            const handler = getTemplateResourcesHandler(mockComponents);
            const result = handler(templateUri, mockToken) as GetTemplateResourcesResult;

            expect(result.resources).toHaveLength(1);
            expect(result.resources[0]).toEqual({
                logicalId: 'MyBucket',
                type: 'AWS::S3::Bucket',
                primaryIdentifierKeys: ['BucketName'],
                primaryIdentifier: {
                    BucketName: 'my-existing-bucket',
                },
            });
        });

        it('ignores non-string primary identifier in metadata', () => {
            const templateUri: TemplateUri = 'test://template.yaml';
            const mockSyntaxTree = {} as SyntaxTree;
            const mockResource = {
                name: 'MyBucket',
                Type: 'AWS::S3::Bucket',
                Metadata: {
                    PrimaryIdentifier: { BucketName: 'invalid-object' },
                },
            };
            const mockContext = { entity: mockResource } as unknown as Context;
            const resourcesMap = new Map([['MyBucket', mockContext]]);

            syntaxTreeManager.getSyntaxTree.withArgs(templateUri).returns(mockSyntaxTree);
            getEntityMapSpy.mockReturnValue(resourcesMap);

            mockComponents.schemaRetriever.getDefault.returns(combinedSchemas());

            const handler = getTemplateResourcesHandler(mockComponents);
            const result = handler(templateUri, mockToken) as GetTemplateResourcesResult;

            expect(result.resources).toHaveLength(1);
            expect(result.resources[0]).toEqual({
                logicalId: 'MyBucket',
                type: 'AWS::S3::Bucket',
                primaryIdentifierKeys: ['BucketName'],
                primaryIdentifier: undefined,
            });
        });

        it('handles multiple primary identifier keys with pipe-separated values', () => {
            const templateUri: TemplateUri = 'test://template.yaml';
            const mockSyntaxTree = {} as SyntaxTree;
            const mockResource = {
                name: 'MyDevice',
                Type: 'AWS::SageMaker::Device',
                Metadata: {
                    PrimaryIdentifier: 'my-device|my-fleet',
                },
            };
            const mockContext = { entity: mockResource } as unknown as Context;
            const resourcesMap = new Map([['MyDevice', mockContext]]);

            syntaxTreeManager.getSyntaxTree.withArgs(templateUri).returns(mockSyntaxTree);
            getEntityMapSpy.mockReturnValue(resourcesMap);

            // the actual schema does not have composite primary id; simulating for testing
            const mockSchema = {
                primaryIdentifier: ['/properties/Device/DeviceName', '/properties/DeviceFleetName'],
            };
            mockComponents.schemaRetriever.getDefault.returns({
                schemas: new Map([['AWS::SageMaker::Device', mockSchema]]),
            } as any);

            const handler = getTemplateResourcesHandler(mockComponents);
            const result = handler(templateUri, mockToken) as GetTemplateResourcesResult;

            expect(result.resources).toHaveLength(1);
            expect(result.resources[0]).toEqual({
                logicalId: 'MyDevice',
                type: 'AWS::SageMaker::Device',
                primaryIdentifierKeys: ['Device/DeviceName', 'DeviceFleetName'],
                primaryIdentifier: {
                    'Device/DeviceName': 'my-device',
                    DeviceFleetName: 'my-fleet',
                },
            });
        });

        it('filters out resources without Type', () => {
            const templateUri: TemplateUri = 'test://template.yaml';
            const mockSyntaxTree = {} as SyntaxTree;
            const mockResource1 = {
                name: 'MyBucket',
                Type: 'AWS::S3::Bucket',
            };
            const mockResource2 = {
                name: 'InvalidResource',
                Type: undefined,
            };
            const mockContext1 = { entity: mockResource1 } as unknown as Context;
            const mockContext2 = { entity: mockResource2 } as unknown as Context;
            const resourcesMap = new Map([
                ['MyBucket', mockContext1],
                ['InvalidResource', mockContext2],
            ]);

            syntaxTreeManager.getSyntaxTree.withArgs(templateUri).returns(mockSyntaxTree);
            getEntityMapSpy.mockReturnValue(resourcesMap);

            mockComponents.schemaRetriever.getDefault.returns(combinedSchemas());

            const handler = getTemplateResourcesHandler(mockComponents);
            const result = handler(templateUri, mockToken) as GetTemplateResourcesResult;

            expect(result.resources).toHaveLength(1);
            expect(result.resources[0].logicalId).toBe('MyBucket');
        });
    });

    describe('describeStackHandler', () => {
        it('returns stack info', async () => {
            const params = { stackName: 'MyStack' };
            const mockOutputs = [
                { OutputKey: 'BucketName', OutputValue: 'my-bucket', Description: 'S3 Bucket' },
                { OutputKey: 'FunctionArn', OutputValue: 'arn:aws:lambda:...', ExportName: 'MyFunction' },
            ];
            const mockParams = [
                { ParameterKey: 'RoleName', ParameterValue: 'MyRole' },
                { ParameterKey: 'LambdaName', ParameterValue: 'MyLambda' },
            ];
            const mockTags = [
                { Key: 'Org', Value: 'Aws' },
                { Key: 'CostCenter', Value: '123' },
            ];

            mockComponents.cfnService.describeStacks.resolves({
                Stacks: [{ StackName: 'MyStack', Outputs: mockOutputs, Parameters: mockParams, Tags: mockTags }],
            } as any);

            const handler = describeStackHandler(mockComponents);
            const result = (await handler(params, {} as any)) as DescribeStackResult;

            expect(result.stack?.Outputs).toHaveLength(2);
            expect(result.stack?.Outputs?.[0].OutputKey).toBe('BucketName');
            expect(result.stack?.Outputs?.[1].ExportName).toBe('MyFunction');
            expect(result.stack?.Parameters?.[0].ParameterKey).toBe('RoleName');
            expect(result.stack?.Parameters?.[1].ParameterValue).toBe('MyLambda');
            expect(result.stack?.Tags?.[0].Key).toBe('Org');
            expect(result.stack?.Tags?.[1].Value).toBe('123');
        });

        it('returns undefined when Stacks array is empty', async () => {
            const params = { stackName: 'MyStack' };

            mockComponents.cfnService.describeStacks.resolves({
                Stacks: [],
            } as any);

            const handler = describeStackHandler(mockComponents);
            const result = (await handler(params, {} as any)) as DescribeStackResult;

            expect(result.stack).toBeUndefined();
        });

        it('throws ResponseError for invalid stack name', async () => {
            const params = { stackName: '' };

            const handler = describeStackHandler(mockComponents);

            await expect(handler(params, {} as any)).rejects.toThrow(ResponseError);
        });

        it('throws ResponseError when API call fails', async () => {
            const params = { stackName: 'MyStack' };

            mockComponents.cfnService.describeStacks.rejects(new Error('Stack not found'));

            const handler = describeStackHandler(mockComponents);

            await expect(handler(params, {} as any)).rejects.toThrow(ResponseError);
        });
    });

    describe('describeChangeSetHandler', () => {
        it('should return changeset details on success', async () => {
            const mockChangeSetResponse = {
                Status: ChangeSetStatus.CREATE_COMPLETE,
                CreationTime: new Date('2023-01-01T00:00:00Z'),
                Description: 'Test changeset',
                Changes: [
                    {
                        Action: 'Add',
                        ResourceChange: {
                            LogicalResourceId: 'MyBucket',
                            ResourceType: 'AWS::S3::Bucket',
                        },
                    },
                ],
                $metadata: {},
            };

            const mockMappedChanges = [
                {
                    type: 'Resource',
                    resourceChange: {
                        action: 'Add',
                        logicalResourceId: 'MyBucket',
                        resourceType: 'AWS::S3::Bucket',
                    },
                },
            ];

            mockComponents.cfnService.describeChangeSet.resolves(mockChangeSetResponse);
            vi.mocked(mapChangesToStackChanges).mockReturnValue(mockMappedChanges);

            const handler = describeChangeSetHandler(mockComponents);
            const params: DescribeChangeSetParams = {
                changeSetName: 'test-changeset',
                stackName: 'test-stack',
            };

            const result = (await handler(params, {} as any)) as DescribeChangeSetResult;

            expect(result).toEqual({
                changeSetName: 'test-changeset',
                stackName: 'test-stack',
                status: ChangeSetStatus.CREATE_COMPLETE,
                creationTime: '2023-01-01T00:00:00.000Z',
                description: 'Test changeset',
                changes: mockMappedChanges,
            });

            expect(
                mockComponents.cfnService.describeChangeSet.calledWith({
                    ChangeSetName: 'test-changeset',
                    IncludePropertyValues: true,
                    StackName: 'test-stack',
                }),
            ).toBe(true);
            expect(mapChangesToStackChanges).toHaveBeenCalledWith(mockChangeSetResponse.Changes);
        });

        it('should handle undefined optional fields', async () => {
            const mockChangeSetResponse = {
                Status: undefined,
                CreationTime: undefined,
                Description: undefined,
                Changes: undefined,
                $metadata: {},
            };

            mockComponents.cfnService.describeChangeSet.resolves(mockChangeSetResponse);
            vi.mocked(mapChangesToStackChanges).mockReturnValue([]);

            const handler = describeChangeSetHandler(mockComponents);
            const params: DescribeChangeSetParams = {
                changeSetName: 'test-changeset',
                stackName: 'test-stack',
            };

            const result = (await handler(params, {} as any)) as DescribeChangeSetResult;

            expect(result).toEqual({
                changeSetName: 'test-changeset',
                stackName: 'test-stack',
                status: '',
                creationTime: undefined,
                description: undefined,
                changes: [],
            });
        });

        it('should propagate errors from cfnService', async () => {
            const error = new Error('ChangeSet not found');
            mockComponents.cfnService.describeChangeSet.rejects(error);

            const handler = describeChangeSetHandler(mockComponents);
            const params: DescribeChangeSetParams = {
                changeSetName: 'non-existent-changeset',
                stackName: 'test-stack',
            };

            await expect(handler(params, {} as any)).rejects.toThrow('ChangeSet not found');
        });
    });
});
