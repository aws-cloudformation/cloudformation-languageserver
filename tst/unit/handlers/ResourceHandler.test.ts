import { stubInterface } from 'ts-sinon';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { CancellationToken, RequestHandler } from 'vscode-languageserver-protocol';
import { getEntityMap } from '../../../src/context/SectionContextBuilder';
import { CloudFormationFileType, Document } from '../../../src/document/Document';
import {
    getManagedResourceStackTemplateHandler,
    importResourceStateHandler,
    removeResourceTypeHandler,
    resourceExplorerSearchHandler,
    resourceExplorerListViewsHandler,
    resourceExplorerListSupportedTypesHandler,
} from '../../../src/handlers/ResourceHandler';
import {
    ResourceStateParams,
    ResourceStatePurpose,
    ResourceStateResult,
} from '../../../src/resourceState/ResourceStateTypes';
import { GetStackTemplateParams } from '../../../src/stacks/StackRequestType';
import { createMockComponents } from '../../utils/MockServerComponents';

// Mock the SectionContextBuilder module
vi.mock('../../../src/context/SectionContextBuilder', () => ({
    getEntityMap: vi.fn(),
}));

describe('ResourceHandler - getManagedResourceStackTemplateHandler', () => {
    let mockComponents: ReturnType<typeof createMockComponents>;
    let handler: any;
    let mockGetEntityMap: any;

    beforeEach(() => {
        vi.clearAllMocks();
        mockComponents = createMockComponents();
        handler = getManagedResourceStackTemplateHandler(mockComponents);
        mockGetEntityMap = vi.mocked(getEntityMap);
    });

    it('should return template without line number when no primaryIdentifier provided', async () => {
        const templateBody = '{"Resources": {"Bucket": {"Type": "AWS::S3::Bucket"}}}';
        mockComponents.cfnService.getTemplate.resolves(templateBody);

        const params: GetStackTemplateParams = {
            stackName: 'test-stack',
        };

        const result = await handler(params, CancellationToken.None);

        expect(result).toEqual({
            templateBody,
            lineNumber: undefined,
        });
        expect(mockComponents.cfnService.getTemplate.calledWith({ StackName: 'test-stack' })).toBe(true);
    });

    it('should return undefined when template not found', async () => {
        mockComponents.cfnService.getTemplate.resolves(undefined);

        const params: GetStackTemplateParams = {
            stackName: 'test-stack',
        };

        const result = await handler(params, CancellationToken.None);

        expect(result).toBeUndefined();
    });

    it('should return template with line number when resource found', async () => {
        const templateBody = `Resources:
  DeploymentBucket:
    Type: AWS::S3::Bucket
    Properties:
      BucketName: test-bucket`;

        mockComponents.cfnService.getTemplate.resolves(templateBody);
        mockComponents.cfnService.describeStackResources.resolves({
            $metadata: {},
            StackResources: [
                {
                    LogicalResourceId: 'DeploymentBucket',
                    PhysicalResourceId: 'bucket-physical-id',
                    ResourceType: 'AWS::S3::Bucket',
                    Timestamp: new Date(),
                    ResourceStatus: 'CREATE_COMPLETE',
                },
            ],
        });

        const mockResourceContext = {
            startPosition: { row: 1 },
        };

        mockComponents.syntaxTreeManager.getSyntaxTree.returns({} as any);
        mockGetEntityMap.mockReturnValue(new Map([['DeploymentBucket', mockResourceContext]]));

        const params: GetStackTemplateParams = {
            stackName: 'test-stack',
            primaryIdentifier: 'bucket-physical-id',
        };

        const result = await handler(params, CancellationToken.None);

        expect(result?.templateBody).toBe(templateBody);
        expect(result?.lineNumber).toBe(1);
        expect(mockComponents.syntaxTreeManager.add.called).toBe(true);
        expect(mockComponents.syntaxTreeManager.deleteSyntaxTree.called).toBe(true);
    });

    it('should throw error when resource not found in stack', async () => {
        const templateBody = '{"Resources": {"Bucket": {"Type": "AWS::S3::Bucket"}}}';
        mockComponents.cfnService.getTemplate.resolves(templateBody);
        mockComponents.cfnService.describeStackResources.resolves({
            $metadata: {},
            StackResources: [],
        });

        const params: GetStackTemplateParams = {
            stackName: 'test-stack',
            primaryIdentifier: 'non-existent-id',
        };

        await expect(handler(params, CancellationToken.None)).rejects.toThrow(
            'Resource with PhysicalResourceId non-existent-id not found in stack test-stack',
        );
    });

    it('should handle errors and rethrow them', async () => {
        const error = new Error('AWS API Error');
        mockComponents.cfnService.getTemplate.rejects(error);

        const params: GetStackTemplateParams = {
            stackName: 'test-stack',
        };

        await expect(handler(params, CancellationToken.None)).rejects.toThrow('AWS API Error');
    });
});

describe('ResourceHandler - removeResourceTypeHandler', () => {
    let mockComponents: ReturnType<typeof createMockComponents>;
    let handler: any;

    beforeEach(() => {
        vi.clearAllMocks();
        mockComponents = createMockComponents();
        handler = removeResourceTypeHandler(mockComponents);
    });

    it('should call resourceStateManager.removeResourceType with typeName', () => {
        handler('AWS::S3::Bucket');

        expect(mockComponents.resourceStateManager.removeResourceType.calledOnceWith('AWS::S3::Bucket')).toBe(true);
    });

    it('should handle multiple calls', () => {
        handler('AWS::S3::Bucket');
        handler('AWS::Lambda::Function');

        expect(mockComponents.resourceStateManager.removeResourceType.callCount).toBe(2);
        expect(mockComponents.resourceStateManager.removeResourceType.calledWith('AWS::S3::Bucket')).toBe(true);
        expect(mockComponents.resourceStateManager.removeResourceType.calledWith('AWS::Lambda::Function')).toBe(true);
    });

    it('should throw error for invalid input', () => {
        expect(() => handler('')).toThrow(TypeError);
        expect(() => handler(null as any)).toThrow();
        expect(() => handler(undefined as any)).toThrow();
    });
});

describe('ResourceHandler - importResourceStateHandler', () => {
    let mockComponents: ReturnType<typeof createMockComponents>;
    let handler: RequestHandler<ResourceStateParams, ResourceStateResult, void>;
    const params = {
        textDocument: { uri: 'docUri' },
        resourceSelections: [
            {
                resourceType: 'AWS::S3::Bucket',
                resourceIdentifiers: ['bucket1234'],
            },
        ],
        purpose: ResourceStatePurpose.IMPORT,
    };

    beforeEach(() => {
        vi.clearAllMocks();
        mockComponents = createMockComponents();
        handler = importResourceStateHandler(mockComponents);
    });

    it('should throw error if document not found', async () => {
        mockComponents.documentManager.get.returns(undefined);

        await expect(handler(params, CancellationToken.None)).rejects.toThrow('Import failed: docUri not found');
    });

    it('should throw error if document is not a valid CloudFormation template', async () => {
        const mockDoc = stubInterface<Document>();
        mockDoc.isTemplate.returns(false);
        Object.defineProperty(mockDoc, 'cfnFileType', { value: CloudFormationFileType.Other });
        mockComponents.documentManager.get.returns(mockDoc);

        await expect(handler(params, CancellationToken.None)).rejects.toThrow(
            'Import failed: docUri is not a valid CloudFormation template',
        );
    });
});

describe('ResourceHandler - resourceExplorerSearchHandler', () => {
    let mockComponents: ReturnType<typeof createMockComponents>;
    let handler: any;

    beforeEach(() => {
        vi.clearAllMocks();
        mockComponents = createMockComponents();
        handler = resourceExplorerSearchHandler(mockComponents);
    });

    it('should search and return resources with CFN types', async () => {
        mockComponents.resourceExplorerService.search.resolves({
            $metadata: {},
            Resources: [
                {
                    Arn: 'arn:aws:s3:::my-bucket',
                    ResourceType: 's3:bucket',
                    Region: 'us-east-1',
                    OwningAccountId: '123456789012',
                },
            ],
            Count: { TotalResources: 1, Complete: true },
            ViewArn: 'arn:aws:resource-explorer-2:us-east-1:123456789012:view/default',
        });

        const result = await handler(
            { queryString: 'resourcetype:s3:bucket', viewArn: 'view-arn' },
            CancellationToken.None,
        );

        expect(result.resources).toHaveLength(1);
        expect(result.resources[0].resourceType).toBe('AWS::S3::Bucket');
        expect(result.resources[0].arn).toBe('arn:aws:s3:::my-bucket');
        expect(result.resources[0].region).toBe('us-east-1');
    });

    it('should convert CFN types in query to AREX types', async () => {
        mockComponents.resourceExplorerService.search.resolves({
            $metadata: {},
            Resources: [],
            Count: { TotalResources: 0, Complete: true },
        });

        await handler({ queryString: 'resourcetype:AWS::S3::Bucket' }, CancellationToken.None);

        expect(mockComponents.resourceExplorerService.search.calledOnce).toBe(true);
        const searchCall = mockComponents.resourceExplorerService.search.firstCall;
        expect(searchCall.args[0]).toBe('resourcetype:s3:bucket');
    });

    it('should preserve AREX types in query', async () => {
        mockComponents.resourceExplorerService.search.resolves({
            $metadata: {},
            Resources: [],
            Count: { TotalResources: 0, Complete: true },
        });

        await handler({ queryString: 'resourcetype:ec2:instance' }, CancellationToken.None);

        const searchCall = mockComponents.resourceExplorerService.search.firstCall;
        expect(searchCall.args[0]).toBe('resourcetype:ec2:instance');
    });

    it('should handle empty results', async () => {
        mockComponents.resourceExplorerService.search.resolves({
            $metadata: {},
            Resources: [],
            Count: { TotalResources: 0, Complete: true },
        });

        const result = await handler({ queryString: 'tag:nonexistent' }, CancellationToken.None);

        expect(result.resources).toHaveLength(0);
        expect(result.totalCount).toBe(0);
    });

    it('should extract identifier from ARN', async () => {
        mockComponents.resourceExplorerService.search.resolves({
            $metadata: {},
            Resources: [
                {
                    Arn: 'arn:aws:s3:::my-bucket-name',
                    ResourceType: 's3:bucket',
                    Region: 'us-east-1',
                },
            ],
        });

        const result = await handler({ queryString: 'resourcetype:s3:bucket' }, CancellationToken.None);

        expect(result.resources[0].identifier).toBe('my-bucket-name');
    });

    it('should filter out resources with unknown AREX types', async () => {
        mockComponents.resourceExplorerService.search.resolves({
            $metadata: {},
            Resources: [
                {
                    Arn: 'arn:aws:s3:::my-bucket',
                    ResourceType: 's3:bucket',
                    Region: 'us-east-1',
                },
                {
                    Arn: 'arn:aws:unknown:us-east-1:123456789012:resource/id',
                    ResourceType: 'unknown:resource',
                    Region: 'us-east-1',
                },
            ],
        });

        const result = await handler({ queryString: 'test' }, CancellationToken.None);

        expect(result.resources).toHaveLength(1);
        expect(result.resources[0].resourceType).toBe('AWS::S3::Bucket');
    });
});

describe('ResourceHandler - resourceExplorerListViewsHandler', () => {
    let mockComponents: ReturnType<typeof createMockComponents>;
    let handler: any;

    beforeEach(() => {
        vi.clearAllMocks();
        mockComponents = createMockComponents();
        handler = resourceExplorerListViewsHandler(mockComponents);
    });

    it('should return list of views', async () => {
        mockComponents.resourceExplorerService.listViews.resolves([
            { arn: 'arn:aws:resource-explorer-2:us-east-1:123456789012:view/default', name: 'default' },
            { arn: 'arn:aws:resource-explorer-2:us-east-1:123456789012:view/custom', name: 'custom' },
        ]);

        const result = await handler(undefined, CancellationToken.None);

        expect(result.views).toHaveLength(2);
        expect(result.views[0].name).toBe('default');
        expect(result.views[1].name).toBe('custom');
    });

    it('should create default view when no views exist', async () => {
        mockComponents.resourceExplorerService.listViews.resolves([]);
        mockComponents.resourceExplorerService.createDefaultView.resolves({
            arn: 'arn:aws:resource-explorer-2:us-east-1:123456789012:view/default',
            name: 'default',
        });

        const result = await handler(undefined, CancellationToken.None);

        expect(result.views).toHaveLength(1);
        expect(result.message).toContain('Resource Explorer view was not found');
    });

    it('should return empty views when creation fails', async () => {
        mockComponents.resourceExplorerService.listViews.resolves([]);
        mockComponents.resourceExplorerService.createDefaultView.rejects(new Error('Creation failed'));

        const result = await handler(undefined, CancellationToken.None);

        expect(result.views).toHaveLength(0);
    });
});

describe('ResourceHandler - resourceExplorerListSupportedTypesHandler', () => {
    let handler: any;

    beforeEach(() => {
        vi.clearAllMocks();
        handler = resourceExplorerListSupportedTypesHandler();
    });

    it('should return list of supported CFN types', async () => {
        const result = await handler(undefined, CancellationToken.None);

        expect(result.types).toBeDefined();
        expect(Array.isArray(result.types)).toBe(true);
        expect(result.types.length).toBeGreaterThan(0);
    });

    it('should return CFN type format strings', async () => {
        const result = await handler(undefined, CancellationToken.None);

        for (const type of result.types) {
            expect(type).toMatch(/^AWS::[A-Za-z0-9]+::[A-Za-z0-9]+$/);
        }
    });

    it('should include common resource types', async () => {
        const result = await handler(undefined, CancellationToken.None);

        expect(result.types).toContain('AWS::S3::Bucket');
        expect(result.types).toContain('AWS::Lambda::Function');
        expect(result.types).toContain('AWS::EC2::Instance');
    });
});
