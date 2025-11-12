import { describe, it, expect, beforeEach, vi } from 'vitest';
import { CancellationToken } from 'vscode-languageserver-protocol';
import { getEntityMap } from '../../../src/context/SectionContextBuilder';
import {
    getManagedResourceStackTemplateHandler,
    removeResourceTypeHandler,
} from '../../../src/handlers/ResourceHandler';
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
