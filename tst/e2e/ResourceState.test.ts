import { stub, restore, SinonStub } from 'sinon';
import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import {
    ListResourcesParams,
    ListResourcesResult,
    RefreshResourcesParams,
    RefreshResourcesResult,
    ResourceStateParams,
    ResourceStateResult,
    ResourceStatePurpose,
    SearchResourceParams,
    SearchResourceResult,
    ResourceTypesResult,
} from '../../src/resourceState/ResourceStateTypes';
import { ResourceStackManagementResult } from '../../src/resourceState/StackManagementInfoProvider';
import { createMockAwsClient } from '../utils/MockServerComponents';
import { getSimpleYamlTemplateText, getSimpleJsonTemplateText } from '../utils/TemplateUtils';
import { TestExtension } from '../utils/TestExtension';

/**
 * E2E tests for Resource State functionality.
 *
 * These tests mock AWS SDK clients (network calls) by injecting a mock AwsClient factory
 * at TestExtension initialization time, following e2e test guidelines.
 */

describe('ResourceState E2E', () => {
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
    });

    afterAll(async () => {
        restore();
        await client.close();
    });

    describe('Resource Types', () => {
        it('should return resource types list', async () => {
            const result = (await client.send('aws/cfn/resources/types', {})) as ResourceTypesResult;

            expect(result).toBeDefined();
            expect(result.resourceTypes).toBeDefined();
            expect(Array.isArray(result.resourceTypes)).toBe(true);
        });

        it('should return cached resource types after list operation', async () => {
            mockCloudControlSend.resolves({
                TypeName: 'AWS::Lambda::Function',
                ResourceDescriptions: [{ Identifier: 'my-function' }],
            });

            await client.send('aws/cfn/resources/list', {
                resources: [{ resourceType: 'AWS::Lambda::Function' }],
            } satisfies ListResourcesParams);

            const result = (await client.send('aws/cfn/resources/types', {})) as ResourceTypesResult;

            expect(result.resourceTypes).toContain('AWS::Lambda::Function');
        });
    });

    describe('List Resources', () => {
        it('should return empty array when no resources requested', async () => {
            const result = (await client.send('aws/cfn/resources/list', {
                resources: [],
            } satisfies ListResourcesParams)) as ListResourcesResult;

            expect(result.resources).toEqual([]);
        });

        it('should list resources for single resource type', async () => {
            mockCloudControlSend.resolves({
                TypeName: 'AWS::Lambda::Function',
                ResourceDescriptions: [{ Identifier: 'function-1' }, { Identifier: 'function-2' }],
            });

            const result = (await client.send('aws/cfn/resources/list', {
                resources: [{ resourceType: 'AWS::Lambda::Function' }],
            } satisfies ListResourcesParams)) as ListResourcesResult;

            expect(result.resources).toHaveLength(1);
            expect(result.resources[0].typeName).toBe('AWS::Lambda::Function');
            expect(result.resources[0].resourceIdentifiers).toContain('function-1');
            expect(result.resources[0].resourceIdentifiers).toContain('function-2');
        });

        it('should list resources for multiple resource types', async () => {
            mockCloudControlSend.onFirstCall().resolves({
                TypeName: 'AWS::Lambda::Function',
                ResourceDescriptions: [{ Identifier: 'function-1' }],
            });

            mockCloudControlSend.onSecondCall().resolves({
                TypeName: 'AWS::DynamoDB::Table',
                ResourceDescriptions: [{ Identifier: 'table-1' }],
            });

            const result = (await client.send('aws/cfn/resources/list', {
                resources: [{ resourceType: 'AWS::Lambda::Function' }, { resourceType: 'AWS::DynamoDB::Table' }],
            } satisfies ListResourcesParams)) as ListResourcesResult;

            expect(result.resources).toHaveLength(2);
            expect(result.resources.map((r) => r.typeName)).toContain('AWS::Lambda::Function');
            expect(result.resources.map((r) => r.typeName)).toContain('AWS::DynamoDB::Table');
        });

        it('should handle pagination with nextToken', async () => {
            mockCloudControlSend.resolves({
                TypeName: 'AWS::Lambda::Function',
                ResourceDescriptions: [{ Identifier: 'function-1' }],
                NextToken: 'token-123',
            });

            const result = (await client.send('aws/cfn/resources/list', {
                resources: [{ resourceType: 'AWS::Lambda::Function' }],
            } satisfies ListResourcesParams)) as ListResourcesResult;

            expect(result.resources[0].nextToken).toBe('token-123');
        });
    });

    describe('Search Resources', () => {
        it('should find resource by exact identifier match', async () => {
            mockCloudControlSend.resolves({
                TypeName: 'AWS::Lambda::Function',
                ResourceDescriptions: [{ Identifier: 'my-function' }, { Identifier: 'other-function' }],
            });

            await client.send('aws/cfn/resources/list', {
                resources: [{ resourceType: 'AWS::Lambda::Function' }],
            } satisfies ListResourcesParams);

            mockCloudControlSend.resolves({
                TypeName: 'AWS::Lambda::Function',
                ResourceDescription: {
                    Identifier: 'my-function',
                    Properties: JSON.stringify({ FunctionName: 'my-function' }),
                },
            });

            const result = (await client.send('aws/cfn/resources/search', {
                resourceType: 'AWS::Lambda::Function',
                identifier: 'my-function',
            } satisfies SearchResourceParams)) as SearchResourceResult;

            expect(result.found).toBe(true);
            expect(result.resource?.resourceIdentifiers).toContain('my-function');
        });

        it('should return not found for non-existent identifier', async () => {
            mockCloudControlSend.resolves({
                TypeName: 'AWS::Lambda::Function',
                ResourceDescriptions: [{ Identifier: 'function-1' }],
            });

            await client.send('aws/cfn/resources/list', {
                resources: [{ resourceType: 'AWS::Lambda::Function' }],
            } satisfies ListResourcesParams);

            mockCloudControlSend.rejects(new Error('ResourceNotFoundException'));

            const result = (await client.send('aws/cfn/resources/search', {
                resourceType: 'AWS::Lambda::Function',
                identifier: 'non-existent',
            } satisfies SearchResourceParams)) as SearchResourceResult;

            expect(result.found).toBe(false);
            expect(result.resource).toBeUndefined();
        });
    });

    describe('Refresh Resources', () => {
        it('should refresh single resource type', async () => {
            mockCloudControlSend.resolves({
                TypeName: 'AWS::Lambda::Function',
                ResourceDescriptions: [{ Identifier: 'function-1' }],
            });

            const result = (await client.send('aws/cfn/resources/refresh', {
                resources: [{ resourceType: 'AWS::Lambda::Function' }],
            } satisfies RefreshResourcesParams)) as RefreshResourcesResult;

            expect(result.resources).toHaveLength(1);
            expect(result.resources[0].typeName).toBe('AWS::Lambda::Function');
        });

        it('should update cached resource list after refresh', async () => {
            mockCloudControlSend.resolves({
                TypeName: 'AWS::Lambda::Function',
                ResourceDescriptions: [{ Identifier: 'function-1' }],
            });

            await client.send('aws/cfn/resources/list', {
                resources: [{ resourceType: 'AWS::Lambda::Function' }],
            } satisfies ListResourcesParams);

            mockCloudControlSend.resolves({
                TypeName: 'AWS::Lambda::Function',
                ResourceDescriptions: [{ Identifier: 'function-1' }, { Identifier: 'function-2' }],
            });

            const result = (await client.send('aws/cfn/resources/refresh', {
                resources: [{ resourceType: 'AWS::Lambda::Function' }],
            } satisfies RefreshResourcesParams)) as RefreshResourcesResult;

            expect(result.resources[0].resourceIdentifiers).toHaveLength(2);
        });
    });

    describe('Remove Resource Type', () => {
        it('should remove resource type from cache', async () => {
            mockCloudControlSend.resolves({
                TypeName: 'AWS::Lambda::Function',
                ResourceDescriptions: [{ Identifier: 'function-1' }],
            });

            const listResult = (await client.send('aws/cfn/resources/list', {
                resources: [{ resourceType: 'AWS::Lambda::Function' }],
            } satisfies ListResourcesParams)) as ListResourcesResult;

            expect(listResult.resources).toHaveLength(1);
            expect(listResult.resources[0].typeName).toBe('AWS::Lambda::Function');

            await client.send('aws/cfn/resources/list/remove', 'AWS::Lambda::Function');

            // After removal, searching should not find cached resources
            mockCloudControlSend.resolves({
                TypeName: 'AWS::Lambda::Function',
                ResourceDescriptions: [],
            });

            const listAfterRemove = (await client.send('aws/cfn/resources/list', {
                resources: [{ resourceType: 'AWS::Lambda::Function' }],
            } satisfies ListResourcesParams)) as ListResourcesResult;

            expect(listAfterRemove.resources[0].resourceIdentifiers).toHaveLength(0);
        });
    });

    describe('Import Resource State - YAML', () => {
        it('should import single resource into empty YAML template', async () => {
            const template = getSimpleYamlTemplateText();
            const uri = await client.openYamlTemplate(template);

            mockCloudControlSend.resolves({
                TypeName: 'AWS::S3::Bucket',
                ResourceDescription: {
                    Identifier: 'my-bucket',
                    Properties: JSON.stringify({
                        BucketName: 'my-bucket',
                        Tags: [{ Key: 'Environment', Value: 'Production' }],
                    }),
                },
            });

            const result = (await client.send('aws/cfn/resources/state', {
                textDocument: { uri },
                resourceSelections: [
                    {
                        resourceType: 'AWS::S3::Bucket',
                        resourceIdentifiers: ['my-bucket'],
                    },
                ],
                purpose: ResourceStatePurpose.IMPORT,
            } satisfies ResourceStateParams)) as ResourceStateResult;

            expect(result.successfulImports['AWS::S3::Bucket']).toContain('my-bucket');
            expect(result.failedImports).toEqual({});
            expect(result.completionItem).toBeDefined();
        });

        it('should import multiple resources into YAML template', async () => {
            const template = getSimpleYamlTemplateText();
            const uri = await client.openYamlTemplate(template);

            mockCloudControlSend.onFirstCall().resolves({
                TypeName: 'AWS::S3::Bucket',
                ResourceDescription: {
                    Identifier: 'bucket-1',
                    Properties: JSON.stringify({ BucketName: 'bucket-1' }),
                },
            });

            mockCloudControlSend.onSecondCall().resolves({
                TypeName: 'AWS::S3::Bucket',
                ResourceDescription: {
                    Identifier: 'bucket-2',
                    Properties: JSON.stringify({ BucketName: 'bucket-2' }),
                },
            });

            const result = (await client.send('aws/cfn/resources/state', {
                textDocument: { uri },
                resourceSelections: [
                    {
                        resourceType: 'AWS::S3::Bucket',
                        resourceIdentifiers: ['bucket-1', 'bucket-2'],
                    },
                ],
                purpose: ResourceStatePurpose.IMPORT,
            } satisfies ResourceStateParams)) as ResourceStateResult;

            expect(result.successfulImports['AWS::S3::Bucket']).toHaveLength(2);
            expect(result.successfulImports['AWS::S3::Bucket']).toContain('bucket-1');
            expect(result.successfulImports['AWS::S3::Bucket']).toContain('bucket-2');
        });

        it('should handle partial import failure in YAML', async () => {
            const template = getSimpleYamlTemplateText();
            const uri = await client.openYamlTemplate(template);

            mockCloudControlSend.reset();

            mockCloudControlSend.onFirstCall().resolves({
                TypeName: 'AWS::S3::Bucket',
                ResourceDescription: {
                    Identifier: 'bucket-1',
                    Properties: JSON.stringify({ BucketName: 'bucket-1' }),
                },
            });

            mockCloudControlSend.onSecondCall().rejects(new Error('Resource not found'));

            const result = (await client.send('aws/cfn/resources/state', {
                textDocument: { uri },
                resourceSelections: [
                    {
                        resourceType: 'AWS::S3::Bucket',
                        resourceIdentifiers: ['bucket-1', 'bucket-2'],
                    },
                ],
                purpose: ResourceStatePurpose.IMPORT,
            } satisfies ResourceStateParams)) as ResourceStateResult;

            // Verify at least one resource was processed
            expect(result.successfulImports['AWS::S3::Bucket']).toBeDefined();
            expect(result.successfulImports['AWS::S3::Bucket']).toContain('bucket-1');
        });

        it('should return error when no resources selected for YAML import', async () => {
            const template = getSimpleYamlTemplateText();
            const uri = await client.openYamlTemplate(template);

            const result = (await client.send('aws/cfn/resources/state', {
                textDocument: { uri },
                resourceSelections: undefined,
                purpose: ResourceStatePurpose.IMPORT,
            } satisfies ResourceStateParams)) as ResourceStateResult;

            expect(result.successfulImports).toEqual({});
            expect(result.completionItem).toBeUndefined();
        });
    });

    describe('Import Resource State - JSON', () => {
        it('should import single resource into empty JSON template', async () => {
            const template = getSimpleJsonTemplateText();
            const uri = await client.openJsonTemplate(template);

            mockCloudControlSend.resolves({
                TypeName: 'AWS::Lambda::Function',
                ResourceDescription: {
                    Identifier: 'my-function',
                    Properties: JSON.stringify({
                        FunctionName: 'my-function',
                        Runtime: 'nodejs20.x',
                        Handler: 'index.handler',
                    }),
                },
            });

            const result = (await client.send('aws/cfn/resources/state', {
                textDocument: { uri },
                resourceSelections: [
                    {
                        resourceType: 'AWS::Lambda::Function',
                        resourceIdentifiers: ['my-function'],
                    },
                ],
                purpose: ResourceStatePurpose.IMPORT,
            } satisfies ResourceStateParams)) as ResourceStateResult;

            expect(result.successfulImports['AWS::Lambda::Function']).toContain('my-function');
            expect(result.completionItem).toBeDefined();
        });

        it('should import multiple resource types into JSON template', async () => {
            const template = getSimpleJsonTemplateText();
            const uri = await client.openJsonTemplate(template);

            mockCloudControlSend.onCall(0).resolves({
                TypeName: 'AWS::S3::Bucket',
                ResourceDescription: {
                    Identifier: 'my-bucket',
                    Properties: JSON.stringify({ BucketName: 'my-bucket' }),
                },
            });

            mockCloudControlSend.onCall(1).resolves({
                TypeName: 'AWS::Lambda::Function',
                ResourceDescription: {
                    Identifier: 'my-function',
                    Properties: JSON.stringify({ FunctionName: 'my-function' }),
                },
            });

            const result = (await client.send('aws/cfn/resources/state', {
                textDocument: { uri },
                resourceSelections: [
                    {
                        resourceType: 'AWS::S3::Bucket',
                        resourceIdentifiers: ['my-bucket'],
                    },
                    {
                        resourceType: 'AWS::Lambda::Function',
                        resourceIdentifiers: ['my-function'],
                    },
                ],
                purpose: ResourceStatePurpose.IMPORT,
            } satisfies ResourceStateParams)) as ResourceStateResult;

            expect(result.successfulImports['AWS::S3::Bucket']).toContain('my-bucket');
            expect(result.successfulImports['AWS::Lambda::Function']).toContain('my-function');
        });

        it('should handle partial import failure in JSON', async () => {
            const template = getSimpleJsonTemplateText();
            const uri = await client.openJsonTemplate(template);

            mockCloudControlSend.reset();

            mockCloudControlSend.onFirstCall().resolves({
                TypeName: 'AWS::Lambda::Function',
                ResourceDescription: {
                    Identifier: 'function-1',
                    Properties: JSON.stringify({ FunctionName: 'function-1' }),
                },
            });

            mockCloudControlSend.onSecondCall().rejects(new Error('Access denied'));

            const result = (await client.send('aws/cfn/resources/state', {
                textDocument: { uri },
                resourceSelections: [
                    {
                        resourceType: 'AWS::Lambda::Function',
                        resourceIdentifiers: ['function-1', 'function-2'],
                    },
                ],
                purpose: ResourceStatePurpose.IMPORT,
            } satisfies ResourceStateParams)) as ResourceStateResult;

            expect(result.successfulImports['AWS::Lambda::Function']).toContain('function-1');
            expect(result.failedImports['AWS::Lambda::Function']).toContain('function-2');
        });
    });

    describe('Clone Resource State - YAML', () => {
        it('should clone single resource in YAML template', async () => {
            const template = getSimpleYamlTemplateText();
            const uri = await client.openYamlTemplate(template);

            mockCloudControlSend.resolves({
                TypeName: 'AWS::S3::Bucket',
                ResourceDescription: {
                    Identifier: 'source-bucket',
                    Properties: JSON.stringify({
                        BucketName: 'source-bucket',
                        Tags: [{ Key: 'Environment', Value: 'Dev' }],
                    }),
                },
            });

            const result = (await client.send('aws/cfn/resources/state', {
                textDocument: { uri },
                resourceSelections: [
                    {
                        resourceType: 'AWS::S3::Bucket',
                        resourceIdentifiers: ['source-bucket'],
                    },
                ],
                purpose: ResourceStatePurpose.CLONE,
            } satisfies ResourceStateParams)) as ResourceStateResult;

            expect(result.successfulImports['AWS::S3::Bucket']).toContain('source-bucket');
            expect(result.completionItem).toBeDefined();
        });
    });

    describe('Clone Resource State - JSON', () => {
        it('should clone single resource in JSON template', async () => {
            const template = getSimpleJsonTemplateText();
            const uri = await client.openJsonTemplate(template);

            mockCloudControlSend.resolves({
                TypeName: 'AWS::Lambda::Function',
                ResourceDescription: {
                    Identifier: 'source-function',
                    Properties: JSON.stringify({
                        FunctionName: 'source-function',
                        Runtime: 'python3.11',
                    }),
                },
            });

            const result = (await client.send('aws/cfn/resources/state', {
                textDocument: { uri },
                resourceSelections: [
                    {
                        resourceType: 'AWS::Lambda::Function',
                        resourceIdentifiers: ['source-function'],
                    },
                ],
                purpose: ResourceStatePurpose.CLONE,
            } satisfies ResourceStateParams)) as ResourceStateResult;

            expect(result.successfulImports['AWS::Lambda::Function']).toContain('source-function');
        });
    });

    describe('Stack Management Info', () => {
        it('should return management state for resource', async () => {
            mockCloudFormationSend.resolves({
                Stacks: [
                    {
                        StackName: 'my-stack',
                        StackId: 'arn:aws:cloudformation:us-east-1:123456789012:stack/my-stack/guid',
                        StackStatus: 'CREATE_COMPLETE',
                        CreationTime: new Date(),
                    },
                ],
            });

            const result = (await client.send(
                'aws/cfn/resources/stackMgmtInfo',
                'my-bucket',
            )) as ResourceStackManagementResult;

            expect(result.physicalResourceId).toBe('my-bucket');
        });
    });

    describe('Get Stack Template', () => {
        it('should retrieve template for stack', async () => {
            const templateBody = `AWSTemplateFormatVersion: '2010-09-09'
Resources:
  MyBucket:
    Type: AWS::S3::Bucket`;

            mockCloudFormationSend.resolves({ TemplateBody: templateBody });

            const result = (await client.send('aws/cfn/stack/template', {
                stackName: 'my-stack',
            })) as { templateBody: string; lineNumber?: number };

            expect(result.templateBody).toBe(templateBody);
        });

        it('should return line number for resource with primaryIdentifier', async () => {
            const templateBody = `AWSTemplateFormatVersion: '2010-09-09'
Resources:
  MyBucket:
    Type: AWS::S3::Bucket
    Properties:
      BucketName: my-bucket`;

            let cfnCallCount = 0;
            mockCloudFormationSend.callsFake(() => {
                cfnCallCount++;
                if (cfnCallCount === 1) {
                    return Promise.resolve({ TemplateBody: templateBody });
                }
                return Promise.resolve({
                    StackResources: [
                        {
                            LogicalResourceId: 'MyBucket',
                            PhysicalResourceId: 'my-bucket',
                            ResourceType: 'AWS::S3::Bucket',
                            ResourceStatus: 'CREATE_COMPLETE',
                            Timestamp: new Date(),
                        },
                    ],
                });
            });

            const result = (await client.send('aws/cfn/stack/template', {
                stackName: 'my-stack',
                primaryIdentifier: 'my-bucket',
            })) as { templateBody: string; lineNumber?: number };

            expect(result.templateBody).toBe(templateBody);
            expect(result.lineNumber).toBeDefined();
            expect(result.lineNumber).toBeGreaterThanOrEqual(0);
        });
    });

    describe('Integration Scenarios', () => {
        it('should list, search, and import resource in sequence', async () => {
            mockCloudControlSend.resolves({
                TypeName: 'AWS::Lambda::Function',
                ResourceDescriptions: [{ Identifier: 'integration-function' }],
            });

            await client.send('aws/cfn/resources/list', {
                resources: [{ resourceType: 'AWS::Lambda::Function' }],
            } satisfies ListResourcesParams);

            // Mock GetResource for search
            mockCloudControlSend.resolves({
                TypeName: 'AWS::Lambda::Function',
                ResourceDescription: {
                    Identifier: 'integration-function',
                    Properties: JSON.stringify({ FunctionName: 'integration-function' }),
                },
            });

            const searchResult = (await client.send('aws/cfn/resources/search', {
                resourceType: 'AWS::Lambda::Function',
                identifier: 'integration-function',
            } satisfies SearchResourceParams)) as SearchResourceResult;

            expect(searchResult.found).toBe(true);

            const template = getSimpleYamlTemplateText();
            const uri = await client.openYamlTemplate(template);

            // Mock GetResource for import (same response)
            mockCloudControlSend.resolves({
                TypeName: 'AWS::Lambda::Function',
                ResourceDescription: {
                    Identifier: 'integration-function',
                    Properties: JSON.stringify({ FunctionName: 'integration-function' }),
                },
            });

            const importResult = (await client.send('aws/cfn/resources/state', {
                textDocument: { uri },
                resourceSelections: [
                    {
                        resourceType: 'AWS::Lambda::Function',
                        resourceIdentifiers: ['integration-function'],
                    },
                ],
                purpose: ResourceStatePurpose.IMPORT,
            } satisfies ResourceStateParams)) as ResourceStateResult;

            expect(importResult.successfulImports['AWS::Lambda::Function']).toContain('integration-function');
        });
    });
});
