import { describe, expect, test, beforeEach } from 'vitest';
import { CompletionParams, CompletionItemKind } from 'vscode-languageserver';
import { ResourceTypeCompletionProvider } from '../../../src/autocomplete/ResourceTypeCompletionProvider';
import { ResourceSchema } from '../../../src/schema/ResourceSchema';
import { ExtensionName } from '../../../src/utils/ExtensionConfig';
import { createResourceContext } from '../../utils/MockContext';
import { createMockComponents } from '../../utils/MockServerComponents';
import { combinedSchemas, createSchemaFrom, Schemas } from '../../utils/SchemaUtils';

describe('ResourceTypeCompletionProvider', () => {
    const mockComponents = createMockComponents();
    const provider = new ResourceTypeCompletionProvider(mockComponents.schemaRetriever);

    const mockParams: CompletionParams = {
        textDocument: { uri: 'file:///test.yaml' },
        position: { line: 0, character: 0 },
    };

    const s3BucketSchema = new ResourceSchema(Schemas.S3Bucket.contents);
    const fourSchemas = combinedSchemas([
        Schemas.S3Bucket,
        Schemas.EC2Instance,
        Schemas.LambdaFunction,
        createSchemaFrom(s3BucketSchema, 'AWS::S3::BucketPolicy', {}),
    ]);
    const twoSchemas = combinedSchemas([Schemas.S3Bucket, Schemas.EC2Instance]);

    beforeEach(() => {
        mockComponents.schemaRetriever.getDefault.reset();
    });

    test('should return resource type completions when text starts with AWS::', () => {
        const mockContext = createResourceContext('MyResource', {
            text: 'AWS::',
            propertyPath: ['Resources', 'MyResource', 'Type'],
            data: { Type: 'AWS::' },
        });
        mockComponents.schemaRetriever.getDefault.returns(fourSchemas);

        const result = provider.getCompletions(mockContext, mockParams);

        expect(result).toBeDefined();
        expect(result!.length).toBe(4); // Should return all resource types

        // Verify resource type items
        for (const item of result!) {
            expect(item.kind).toBe(CompletionItemKind.Class);
            expect(item.detail).toBe(ExtensionName);
            expect(item.label.startsWith('AWS::')).toBe(true);
        }

        // Verify specific resource types are included
        const ec2Item = result!.find((item) => item.label === 'AWS::EC2::Instance');
        expect(ec2Item).toBeDefined();

        const s3Item = result!.find((item) => item.label === 'AWS::S3::Bucket');
        expect(s3Item).toBeDefined();

        const lambdaItem = result!.find((item) => item.label === 'AWS::Lambda::Function');
        expect(lambdaItem).toBeDefined();

        const s3PolicyItem = result!.find((item) => item.label === 'AWS::S3::BucketPolicy');
        expect(s3PolicyItem).toBeDefined();
    });

    test('should return resource type completions when text matches AWS resource type pattern', () => {
        const mockContext = createResourceContext('MyResource', {
            text: 'AWS::',
            propertyPath: ['Resources', 'MyResource', 'Type'],
            data: {
                Type: 'AWS::',
            },
        });
        mockComponents.schemaRetriever.getDefault.returns(fourSchemas);

        const result = provider.getCompletions(mockContext, mockParams);

        expect(result).toBeDefined();
        expect(result!.length).toBe(4); // Current implementation returns all resources, not just S3

        // Verify S3 items are included
        const s3BucketItem = result!.find((item) => item.label === 'AWS::S3::Bucket');
        expect(s3BucketItem).toBeDefined();

        const s3PolicyItem = result!.find((item) => item.label === 'AWS::S3::BucketPolicy');
        expect(s3PolicyItem).toBeDefined();
    });

    test('should return resource types when inside Resources section and inside a resource type', () => {
        const mockContext = createResourceContext('MyResource', {
            text: 'AWS::',
            propertyPath: ['Resources', 'MyResource', 'Type'],
            data: {
                Type: 'AWS::',
            },
        });
        mockComponents.schemaRetriever.getDefault.returns(twoSchemas);

        const result = provider.getCompletions(mockContext, mockParams);

        expect(result).toBeDefined();
        expect(result!.length).toBe(2); // Should return all resource types

        // Verify resource type items
        const ec2Item = result!.find((item) => item.label === 'AWS::EC2::Instance');
        expect(ec2Item).toBeDefined();
        expect(ec2Item!.kind).toBe(CompletionItemKind.Class);

        const s3Item = result!.find((item) => item.label === 'AWS::S3::Bucket');
        expect(s3Item).toBeDefined();
        expect(s3Item!.kind).toBe(CompletionItemKind.Class);
    });
});
