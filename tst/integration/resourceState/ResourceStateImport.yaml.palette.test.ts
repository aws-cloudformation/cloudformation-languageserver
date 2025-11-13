import { beforeEach, afterEach, describe, expect, test } from 'vitest';
import { parse as yamlParse } from 'yaml';
import {
    ResourceStateRequest,
    ResourceStateResult,
    ResourceStatePurpose,
} from '../../../src/resourceState/ResourceStateTypes';
import { TestExtension } from '../../utils/TestExtension';
import { wait } from '../../utils/Utils';
import { createMockResourceStateManager, createMockStackManagementInfoProvider, templates } from './fixtures';

describe('Resource State Import/Clone - YAML - Command Palette', () => {
    const documentUri = 'file:///test.yaml';
    let extension: TestExtension;

    beforeEach(async () => {
        extension = new TestExtension(undefined, {
            resourceStateManager: createMockResourceStateManager(),
            stackManagementInfoProvider: createMockStackManagementInfoProvider(),
        });

        await extension.ready();
        await wait(2000); // Wait for schemas to load
    });

    afterEach(async () => {
        await extension.close();
    });

    test('should import S3 bucket into empty template', async () => {
        await extension.openDocument({
            textDocument: {
                uri: documentUri,
                languageId: 'yaml',
                version: 1,
                text: templates.yaml.empty,
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
        })) as ResourceStateResult;

        expect(result.completionItem).toBeDefined();
        expect(result.successfulImports['AWS::S3::Bucket']).toContain('test-bucket-12345');

        const insertedText = result.completionItem!.textEdit!.newText;
        const parsed = yamlParse(insertedText);

        expect(parsed.Resources).toBeDefined();
        expect(parsed.Resources.S3Bucket).toBeDefined();
        expect(parsed.Resources.S3Bucket.Type).toBe('AWS::S3::Bucket');
        expect(parsed.Resources.S3Bucket.DeletionPolicy).toBe('Retain');
        expect(parsed.Resources.S3Bucket.Properties.BucketName).toBe('test-bucket-12345');
        expect(parsed.Resources.S3Bucket.Metadata.PrimaryIdentifier).toBe('test-bucket-12345');
        expect(parsed.Resources.S3Bucket.Metadata.ManagedByStack).toBe('false');

        const lines = insertedText.trim().split('\n');
        expect(lines[0]).toBe('Resources:');
        expect(lines[1]).toMatch(/^ {2}\w+:/);
    });

    test('should import S3 bucket into template with no Resources section', async () => {
        await extension.openDocument({
            textDocument: {
                uri: documentUri,
                languageId: 'yaml',
                version: 1,
                text: templates.yaml.withParameters,
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
        })) as ResourceStateResult;

        expect(result.completionItem).toBeDefined();
        const insertedText = result.completionItem!.textEdit!.newText;
        const parsed = yamlParse(insertedText);

        expect(parsed.Resources).toBeDefined();
        expect(parsed.Resources.S3Bucket.Type).toBe('AWS::S3::Bucket');
    });

    test('should import S3 bucket into template with existing Resources', async () => {
        await extension.openDocument({
            textDocument: {
                uri: documentUri,
                languageId: 'yaml',
                version: 1,
                text: templates.yaml.withResources,
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
        })) as ResourceStateResult;

        expect(result.completionItem).toBeDefined();
        const insertedText = result.completionItem!.textEdit!.newText;

        expect(insertedText).toContain('S3Bucket:');
        expect(insertedText).toContain('Type: AWS::S3::Bucket');
        expect(insertedText).toContain('BucketName: test-bucket-12345');

        const lines = insertedText.split('\n');
        expect(lines[0]).toMatch(/^ {2}\w+:/);
    });

    test('should import IAM Role with complex properties', async () => {
        await extension.openDocument({
            textDocument: {
                uri: documentUri,
                languageId: 'yaml',
                version: 1,
                text: templates.yaml.withResources,
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
        })) as ResourceStateResult;

        expect(result.completionItem).toBeDefined();
        const insertedText = result.completionItem!.textEdit!.newText;
        const parsed = yamlParse(insertedText);

        expect(parsed.IAMRole).toBeDefined();
        expect(parsed.IAMRole.Type).toBe('AWS::IAM::Role');
        expect(parsed.IAMRole.Properties.RoleName).toBe('test-role');
        expect(parsed.IAMRole.Properties.AssumeRolePolicyDocument).toBeDefined();
        expect(parsed.IAMRole.Metadata.PrimaryIdentifier).toBe('test-role');
    });

    test('should import multiple resources at once', async () => {
        await extension.openDocument({
            textDocument: {
                uri: documentUri,
                languageId: 'yaml',
                version: 1,
                text: 'Resources:\n',
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
                {
                    resourceType: 'AWS::IAM::Role',
                    resourceIdentifiers: ['test-role'],
                },
            ],
            purpose: ResourceStatePurpose.IMPORT,
        })) as ResourceStateResult;

        expect(result.completionItem).toBeDefined();
        const insertedText = result.completionItem!.textEdit!.newText;
        const parsed = yamlParse(insertedText);

        expect(parsed.S3Bucket).toBeDefined();
        expect(parsed.IAMRole).toBeDefined();
    });

    test('should handle resource not found error', async () => {
        await extension.openDocument({
            textDocument: {
                uri: documentUri,
                languageId: 'yaml',
                version: 1,
                text: 'Resources:\n',
            },
        });

        await wait(500);

        const result = (await extension.send(ResourceStateRequest.method, {
            textDocument: { uri: documentUri },
            resourceSelections: [
                {
                    resourceType: 'AWS::S3::Bucket',
                    resourceIdentifiers: ['non-existent-bucket'],
                },
            ],
            purpose: ResourceStatePurpose.IMPORT,
        })) as ResourceStateResult;

        expect(result.failedImports['AWS::S3::Bucket']).toContain('non-existent-bucket');
        expect(result.successfulImports['AWS::S3::Bucket'] || []).not.toContain('non-existent-bucket');
    });

    test('should clone S3 bucket with <CLONE> prefix in metadata', async () => {
        await extension.openDocument({
            textDocument: {
                uri: documentUri,
                languageId: 'yaml',
                version: 1,
                text: 'Resources:\n',
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
        })) as ResourceStateResult;

        expect(result.completionItem).toBeDefined();
        const insertedText = result.completionItem!.textEdit!.newText;
        const parsed = yamlParse(insertedText);

        expect(parsed.S3Bucket.Type).toBe('AWS::S3::Bucket');
        expect(parsed.S3Bucket.DeletionPolicy).toBeUndefined();
        expect(parsed.S3Bucket.Metadata.PrimaryIdentifier).toBe('<CLONE>test-bucket-12345');
        expect(parsed.S3Bucket.Metadata.ManagedByStack).toBeUndefined();
    });

    test('should clone and replace BucketName with placeholder', async () => {
        await extension.openDocument({
            textDocument: {
                uri: documentUri,
                languageId: 'yaml',
                version: 1,
                text: 'Resources:\n',
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
        })) as ResourceStateResult;

        expect(result.completionItem).toBeDefined();
        const insertedText = result.completionItem!.textEdit!.newText;
        const parsed = yamlParse(insertedText);

        expect(parsed.S3Bucket.Properties.BucketName).toMatch(/\$\{.*\}/);
    });

    test('should warn when importing managed resources', async () => {
        const managedExtension = new TestExtension(undefined, {
            resourceStateManager: createMockResourceStateManager(),
            stackManagementInfoProvider: createMockStackManagementInfoProvider(true),
        });

        await managedExtension.ready();
        await wait(2000);

        await managedExtension.openDocument({
            textDocument: {
                uri: documentUri,
                languageId: 'yaml',
                version: 1,
                text: 'Resources:\n',
            },
        });

        await wait(500);

        const result = (await managedExtension.send(ResourceStateRequest.method, {
            textDocument: { uri: documentUri },
            resourceSelections: [
                {
                    resourceType: 'AWS::S3::Bucket',
                    resourceIdentifiers: ['test-bucket-12345'],
                },
            ],
            purpose: ResourceStatePurpose.IMPORT,
        })) as ResourceStateResult;

        expect(result.warning).toBeDefined();
        expect(result.warning).toContain('managed by a stack');

        await managedExtension.close();
    });
});
