import { beforeEach, afterEach, describe, expect, test } from 'vitest';
import {
    ResourceStateRequest,
    ResourceStateResult,
    ResourceStatePurpose,
} from '../../../src/resourceState/ResourceStateTypes';
import { TestExtension } from '../../utils/TestExtension';
import { wait } from '../../utils/Utils';
import { createMockResourceStateManager, createMockStackManagementInfoProvider, templates } from './fixtures';

describe('Resource State Import/Clone - JSON - Command Palette', () => {
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

    test('should import S3 bucket into empty JSON template', async () => {
        await extension.openDocument({
            textDocument: {
                uri: documentUri,
                languageId: 'json',
                version: 1,
                text: templates.json.empty,
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
        const parsed = JSON.parse(insertedText);

        expect(parsed.Resources).toBeDefined();
        expect(parsed.Resources.S3Bucket).toBeDefined();
        expect(parsed.Resources.S3Bucket.Type).toBe('AWS::S3::Bucket');
        expect(parsed.Resources.S3Bucket.DeletionPolicy).toBe('Retain');
        expect(parsed.Resources.S3Bucket.Properties.BucketName).toBe('test-bucket-12345');
        expect(parsed.Resources.S3Bucket.Metadata.PrimaryIdentifier).toBe('test-bucket-12345');

        expect(insertedText).toContain('"Resources"');
        expect(insertedText).toContain('"S3Bucket"');
    });

    test('should import S3 bucket into JSON template with no Resources section', async () => {
        await extension.openDocument({
            textDocument: {
                uri: documentUri,
                languageId: 'json',
                version: 1,
                text: templates.json.withParameters,
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

        expect(insertedText).toContain('"Resources"');
        expect(insertedText).toContain('"S3Bucket"');
    });

    test('should import S3 bucket into JSON template with existing Resources', async () => {
        await extension.openDocument({
            textDocument: {
                uri: documentUri,
                languageId: 'json',
                version: 1,
                text: templates.json.withResources,
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

        expect(insertedText).toContain('"S3Bucket"');
        expect(insertedText).toContain('"Type": "AWS::S3::Bucket"');
        expect(insertedText).toContain('"BucketName": "test-bucket-12345"');

        const lines = insertedText.split('\n');
        expect(lines.some((line) => line.match(/^\s{4}"\w+"/))).toBe(true);
    });

    test('should import IAM Role with nested objects', async () => {
        await extension.openDocument({
            textDocument: {
                uri: documentUri,
                languageId: 'json',
                version: 1,
                text: '{"Resources": {}}',
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
        const parsed = JSON.parse(`{${insertedText}}`);

        expect(parsed.IAMRole).toBeDefined();
        expect(parsed.IAMRole.Type).toBe('AWS::IAM::Role');
        expect(parsed.IAMRole.Properties.AssumeRolePolicyDocument).toBeDefined();
        expect(parsed.IAMRole.Properties.AssumeRolePolicyDocument.Statement).toBeInstanceOf(Array);
    });

    test('should clone S3 bucket without DeletionPolicy', async () => {
        await extension.openDocument({
            textDocument: {
                uri: documentUri,
                languageId: 'json',
                version: 1,
                text: '{"Resources": {}}',
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
        const parsed = JSON.parse(`{${insertedText}}`);

        expect(parsed.S3Bucket.DeletionPolicy).toBeUndefined();
        expect(parsed.S3Bucket.Metadata.PrimaryIdentifier).toBe('<CLONE>test-bucket-12345');
    });

    test('should handle resource not found in JSON', async () => {
        await extension.openDocument({
            textDocument: {
                uri: documentUri,
                languageId: 'json',
                version: 1,
                text: '{"Resources": {}}',
            },
        });

        await wait(500);

        const result = (await extension.send(ResourceStateRequest.method, {
            textDocument: { uri: documentUri },
            resourceSelections: [
                {
                    resourceType: 'AWS::S3::Bucket',
                    resourceIdentifiers: ['non-existent'],
                },
            ],
            purpose: ResourceStatePurpose.IMPORT,
        })) as ResourceStateResult;

        expect(result.failedImports['AWS::S3::Bucket']).toContain('non-existent');
    });
});
