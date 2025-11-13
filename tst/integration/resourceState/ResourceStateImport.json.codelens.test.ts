import { beforeEach, afterEach, describe, expect, test } from 'vitest';
import {
    ResourceStateRequest,
    ResourceStateResult,
    ResourceStatePurpose,
} from '../../../src/resourceState/ResourceStateTypes';
import { TestExtension } from '../../utils/TestExtension';
import { wait } from '../../utils/Utils';
import { createMockResourceStateManager, createMockStackManagementInfoProvider, templates } from './fixtures';

describe('Resource State Import/Clone - JSON - CodeLens', () => {
    const documentUri = 'file:///test.json';
    let extension: TestExtension;

    beforeEach(async () => {
        extension = new TestExtension(undefined, {
            resourceStateManager: createMockResourceStateManager(),
            stackManagementInfoProvider: createMockStackManagementInfoProvider(),
        });

        await extension.ready();
        await wait(2000);
    });

    afterEach(async () => {
        await extension.close();
    });

    test('should replace existing partial S3 bucket resource via CodeLens', async () => {
        await extension.openDocument({
            textDocument: {
                uri: documentUri,
                languageId: 'json',
                version: 1,
                text: templates.json.partialResource,
            },
        });

        await wait(500);

        const result = (await extension.send(ResourceStateRequest.method, {
            textDocument: { uri: documentUri },
            resourceSelections: [
                {
                    resourceType: 'AWS::S3::Bucket',
                    resourceIdentifiers: ['test-bucket-12345'],
                },
            ],
            purpose: ResourceStatePurpose.IMPORT,
            targetLogicalId: 'MyBucket',
        })) as ResourceStateResult;

        expect(result.completionItem).toBeDefined();
        expect(result.successfulImports['AWS::S3::Bucket']).toContain('test-bucket-12345');

        const replacementText = result.completionItem!.textEdit!.newText;
        const parsed = JSON.parse(`{${replacementText}}`);

        expect(parsed.MyBucket.Type).toBe('AWS::S3::Bucket');
        expect(parsed.MyBucket.DeletionPolicy).toBe('Retain');
        expect(parsed.MyBucket.Properties.BucketName).toBe('test-bucket-12345');
        expect(parsed.MyBucket.Properties.PublicAccessBlockConfiguration).toBeDefined();
        expect(parsed.MyBucket.Properties.BucketEncryption).toBeDefined();
        expect(parsed.MyBucket.Metadata.PrimaryIdentifier).toBe('test-bucket-12345');

        const lines = replacementText.split('\n');
        expect(lines[0]).toMatch(/"MyBucket":/);
        expect(lines[1]).toMatch(/^\s+"Type":/);
    });

    test('should replace IAM Role', async () => {
        await extension.openDocument({
            textDocument: {
                uri: documentUri,
                languageId: 'json',
                version: 1,
                text: templates.json.partialRole,
            },
        });

        await wait(500);

        const result = (await extension.send(ResourceStateRequest.method, {
            textDocument: { uri: documentUri },
            resourceSelections: [
                {
                    resourceType: 'AWS::IAM::Role',
                    resourceIdentifiers: ['test-role'],
                },
            ],
            purpose: ResourceStatePurpose.IMPORT,
            targetLogicalId: 'LambdaRole',
        })) as ResourceStateResult;

        expect(result.completionItem).toBeDefined();
        const replacementText = result.completionItem!.textEdit!.newText;
        const parsed = JSON.parse(`{${replacementText}}`);

        expect(parsed.LambdaRole.Type).toBe('AWS::IAM::Role');
        expect(parsed.LambdaRole.Properties.AssumeRolePolicyDocument).toBeDefined();
    });

    test('should replace resource preserving surrounding resources', async () => {
        await extension.openDocument({
            textDocument: {
                uri: documentUri,
                languageId: 'json',
                version: 1,
                text: templates.json.withMultipleResources,
            },
        });

        await wait(500);

        const result = (await extension.send(ResourceStateRequest.method, {
            textDocument: { uri: documentUri },
            resourceSelections: [
                {
                    resourceType: 'AWS::S3::Bucket',
                    resourceIdentifiers: ['test-bucket-12345'],
                },
            ],
            purpose: ResourceStatePurpose.IMPORT,
            targetLogicalId: 'FirstBucket',
        })) as ResourceStateResult;

        expect(result.completionItem).toBeDefined();
        const replacementText = result.completionItem!.textEdit!.newText;

        expect(replacementText).toContain('"FirstBucket"');
        expect(replacementText).not.toContain('"SecondBucket"');
    });

    test('should clone resource via CodeLens with <CLONE> prefix', async () => {
        await extension.openDocument({
            textDocument: {
                uri: documentUri,
                languageId: 'json',
                version: 1,
                text: templates.json.partialResource,
            },
        });

        await wait(500);

        const result = (await extension.send(ResourceStateRequest.method, {
            textDocument: { uri: documentUri },
            resourceSelections: [
                {
                    resourceType: 'AWS::S3::Bucket',
                    resourceIdentifiers: ['test-bucket-12345'],
                },
            ],
            purpose: ResourceStatePurpose.CLONE,
            targetLogicalId: 'MyBucket',
        })) as ResourceStateResult;

        expect(result.completionItem).toBeDefined();
        const replacementText = result.completionItem!.textEdit!.newText;
        const parsed = JSON.parse(`{${replacementText}}`);

        expect(parsed.MyBucket.DeletionPolicy).toBeUndefined();
        expect(parsed.MyBucket.Metadata.PrimaryIdentifier).toBe('<CLONE>test-bucket-12345');
        expect(parsed.MyBucket.Metadata.ManagedByStack).toBeUndefined();

        if (parsed.MyBucket.Properties?.BucketName) {
            expect(parsed.MyBucket.Properties.BucketName).toMatch(/\$\{.*\}/);
        }
    });

    test('should error when target logical ID not found', async () => {
        await extension.openDocument({
            textDocument: {
                uri: documentUri,
                languageId: 'json',
                version: 1,
                text: templates.json.partialResource,
            },
        });

        await wait(500);

        await expect(
            extension.send(ResourceStateRequest.method, {
                textDocument: { uri: documentUri },
                resourceSelections: [
                    {
                        resourceType: 'AWS::S3::Bucket',
                        resourceIdentifiers: ['test-bucket-12345'],
                    },
                ],
                purpose: ResourceStatePurpose.IMPORT,
                targetLogicalId: 'NonExistentBucket',
            }),
        ).rejects.toThrow();
    });

    test('should error when resource not found in AWS', async () => {
        await extension.openDocument({
            textDocument: {
                uri: documentUri,
                languageId: 'json',
                version: 1,
                text: templates.json.partialResource,
            },
        });

        await wait(500);

        await expect(
            extension.send(ResourceStateRequest.method, {
                textDocument: { uri: documentUri },
                resourceSelections: [
                    {
                        resourceType: 'AWS::S3::Bucket',
                        resourceIdentifiers: ['non-existent-bucket'],
                    },
                ],
                purpose: ResourceStatePurpose.IMPORT,
                targetLogicalId: 'MyBucket',
            }),
        ).rejects.toThrow();
    });
});
