import { DateTime } from 'luxon';
import { beforeEach, describe, expect, test, vi } from 'vitest';
import { CompletionItemKind, CompletionParams, InsertTextFormat, InsertTextMode } from 'vscode-languageserver';
import { ResourceStateCompletionProvider } from '../../../src/autocomplete/ResourceStateCompletionProvider';
import { DocumentType } from '../../../src/document/Document';
import { ResourceSchema } from '../../../src/schema/ResourceSchema';
import { createResourceContext } from '../../utils/MockContext';
import { createMockComponents } from '../../utils/MockServerComponents';
import { combinedSchemas, Schemas } from '../../utils/SchemaUtils';

describe('ResourceStateCompletionProvider', () => {
    const mockComponents = createMockComponents();
    const mockSchemas = combinedSchemas();

    const provider = new ResourceStateCompletionProvider(
        mockComponents.resourceStateManager,
        mockComponents.documentManager,
        mockComponents.schemaRetriever,
    );
    const YAML_URI = 'file:///test.yaml';
    const JSON_URI = 'file:///test.json';
    const mockYamlParams: CompletionParams = {
        textDocument: { uri: YAML_URI },
        position: { line: 0, character: 0 },
    };
    const mockJsonParams: CompletionParams = {
        textDocument: { uri: JSON_URI },
        position: { line: 0, character: 0 },
    };

    beforeEach(() => {
        mockComponents.schemaRetriever.getDefault.reset();
        if (typeof mockComponents.resourceStateManager.getResource.reset === 'function') {
            mockComponents.resourceStateManager.getResource.reset();
        }
        vi.clearAllMocks();
    });

    test('should return undefined when resource has no Type', async () => {
        const context = createResourceContext('MyResource', {
            text: '',
            data: {},
        });

        const result = await provider.getCompletions(context, mockYamlParams);

        expect(result.length).toBe(0);
    });

    test('should return undefined when resource has no Properties', async () => {
        const context = createResourceContext('MyResource', {
            text: '',
            data: { Type: 'AWS::S3::Bucket' },
        });

        const result = await provider.getCompletions(context, mockYamlParams);

        expect(result.length).toBe(0);
    });

    test('should return undefined when schema not found', async () => {
        const context = createResourceContext('MyResource', {
            text: '',
            data: {
                Type: 'AWS::Unknown::Type',
                Properties: { BucketName: 'test' },
            },
        });

        const schemas = combinedSchemas([]);
        mockComponents.schemaRetriever.getDefault.returns(schemas);

        const result = await provider.getCompletions(context, mockYamlParams);

        expect(result.length).toBe(0);
    });

    test('should return undefined when primary identifiers not defined', async () => {
        const context = createResourceContext('MyResource', {
            text: '',
            data: {
                Type: 'AWS::S3::Bucket',
                Properties: { NotBucketName: 'test' },
            },
        });

        const schemas = combinedSchemas([Schemas.S3Bucket]);
        mockComponents.schemaRetriever.getDefault.returns(schemas);

        const result = await provider.getCompletions(context, mockYamlParams);

        expect(result.length).toBe(0);
    });

    test('should return undefined when identifier cannot be generated', async () => {
        const context = createResourceContext('MyResource', {
            text: '',
            data: {
                Type: 'AWS::S3::Bucket',
                Properties: { BucketName: 'test' },
            },
        });

        const mockSchema = new ResourceSchema(
            JSON.stringify({
                typeName: 'AWS::S3::Bucket',
                description: 'Test',
                properties: { BucketName: { type: 'string' } },
                primaryIdentifier: [],
                additionalProperties: false,
            }),
        );

        const schemas = combinedSchemas([]);
        schemas.schemas.set('AWS::S3::Bucket', mockSchema);
        mockComponents.schemaRetriever.getDefault.returns(schemas);

        const result = await provider.getCompletions(context, mockYamlParams);

        expect(result.length).toBe(0);
    });

    test('should return undefined when resource state not found', async () => {
        const context = createResourceContext('MyResource', {
            text: '',
            data: {
                Type: 'AWS::S3::Bucket',
                Properties: { BucketName: 'test' },
            },
        });

        const schemas = combinedSchemas([Schemas.S3Bucket]);
        mockComponents.schemaRetriever.getDefault.returns(schemas);
        mockComponents.resourceStateManager.getResource.resolves(undefined);

        const result = await provider.getCompletions(context, mockYamlParams);

        expect(result.length).toBe(0);
    });

    test('should return undefined when resource state has no properties', async () => {
        const context = createResourceContext('MyResource', {
            text: '',
            data: {
                Type: 'AWS::S3::Bucket',
                Properties: { BucketName: 'test' },
            },
        });

        const schemas = combinedSchemas([Schemas.S3Bucket]);
        mockComponents.schemaRetriever.getDefault.returns(schemas);
        mockComponents.resourceStateManager.getResource.resolves({
            typeName: 'AWS::S3::Bucket',
            identifier: 'test',
            properties: '',
            createdTimestamp: new Date() as any,
        });

        const result = await provider.getCompletions(context, mockYamlParams);

        expect(result.length).toBe(0);
    });

    test('should return completion for YAML document', async () => {
        const context = createResourceContext('MyResource', {
            text: '',
            data: {
                Type: 'Custom::Type',
                Properties: { BucketName: 'test' },
            },
            type: DocumentType.YAML,
        });

        const mockSchema = new ResourceSchema(
            JSON.stringify({
                typeName: 'Custom::Type',
                description: 'Test',
                properties: {
                    BucketName: { type: 'string' },
                    VersioningConfiguration: { type: 'object' },
                },
                primaryIdentifier: ['/properties/BucketName'],
                additionalProperties: false,
            }),
        );

        const schemas = combinedSchemas([]);
        schemas.schemas.set('Custom::Type', mockSchema);
        mockComponents.schemaRetriever.getDefault.returns(schemas);
        mockComponents.resourceStateManager.getResource.resolves({
            typeName: 'Custom::Type',
            identifier: 'test',
            properties: JSON.stringify({
                BucketName: 'test',
                VersioningConfiguration: { Status: 'Enabled' },
                ExistingProp: 'value',
            }),
            createdTimestamp: new Date() as any,
        });

        const result = await provider.getCompletions(context, mockYamlParams);

        expect(result).toBeDefined();
        expect(result.length).toBe(1);
        expect(result[0].kind).toBe(CompletionItemKind.Event);
        expect(result[0].insertTextFormat).toBe(InsertTextFormat.PlainText);
        expect(result[0].insertTextMode).toBe(InsertTextMode.adjustIndentation);
        expect(result[0].insertText).toContain('VersioningConfiguration:');
        expect(result[0].insertText).toContain('Status: Enabled');
        expect(result[0].insertText).not.toContain('BucketName');
    });

    test('should return completion for different document types', async () => {
        const context = createResourceContext('MyResource', {
            text: '',
            data: {
                Type: 'Custom::Type',
                Properties: { BucketName: 'test' },
            },
            type: DocumentType.YAML,
        });

        const mockSchema = new ResourceSchema(
            JSON.stringify({
                typeName: 'Custom::Type',
                description: 'Test',
                properties: {
                    BucketName: { type: 'string' },
                    VersioningConfiguration: { type: 'object' },
                },
                primaryIdentifier: ['/properties/BucketName'],
                additionalProperties: false,
            }),
        );

        const schemas = combinedSchemas([]);
        schemas.schemas.set('Custom::Type', mockSchema);
        mockComponents.schemaRetriever.getDefault.returns(schemas);
        mockComponents.resourceStateManager.getResource.resolves({
            typeName: 'Custom::Type',
            identifier: 'test',
            properties: JSON.stringify({
                BucketName: 'test',
                VersioningConfiguration: { Status: 'Enabled' },
            }),
            createdTimestamp: new Date() as any,
        });

        const result = await provider.getCompletions(context, mockYamlParams);

        expect(result).toBeDefined();
        expect(result.length).toBe(1);
        expect(result[0].insertText).toContain('VersioningConfiguration');
    });

    test('should handle nested primary identifiers with JSON pointers', async () => {
        const getResourceSpy = vi.fn().mockResolvedValue({
            typeName: 'Custom::Type',
            identifier: 'test-device',
            properties: JSON.stringify({ Device: { DeviceName: 'test-device' } }),
            createdTimestamp: new Date() as any,
        });
        mockComponents.resourceStateManager.getResource.callsFake(getResourceSpy);

        const context = createResourceContext('MyResource', {
            text: '',
            data: {
                Type: 'Custom::Type',
                Properties: { Device: { DeviceName: 'test-device' } },
            },
        });

        const mockSchema = new ResourceSchema(
            JSON.stringify({
                typeName: 'Custom::Type',
                description: 'Test',
                properties: {
                    Device: {
                        type: 'object',
                        properties: { DeviceName: { type: 'string' } },
                    },
                },
                primaryIdentifier: ['/properties/Device/DeviceName'],
                additionalProperties: false,
            }),
        );

        const schemas = combinedSchemas([]);
        schemas.schemas.set('Custom::Type', mockSchema);
        mockComponents.schemaRetriever.getDefault.returns(schemas);

        const result = await provider.getCompletions(context, mockYamlParams);

        expect(result).toBeDefined();
        expect(getResourceSpy).toHaveBeenCalledWith('Custom::Type', 'test-device');
    });

    test('should handle multiple primary identifiers', async () => {
        const getResourceSpy = vi.fn().mockResolvedValue({
            typeName: 'Custom::Type',
            identifier: 'value1|value2',
            properties: JSON.stringify({ Id1: 'value1', Id2: 'value2' }),
            createdTimestamp: new Date() as any,
        });
        mockComponents.resourceStateManager.getResource.callsFake(getResourceSpy);

        const context = createResourceContext('MyResource', {
            text: '',
            data: {
                Type: 'Custom::Type',
                Properties: { Id1: 'value1', Id2: 'value2' },
            },
        });

        const mockSchema = new ResourceSchema(
            JSON.stringify({
                typeName: 'Custom::Type',
                description: 'Test',
                properties: {
                    Id1: { type: 'string' },
                    Id2: { type: 'string' },
                },
                primaryIdentifier: ['/properties/Id1', '/properties/Id2'],
                additionalProperties: false,
            }),
        );

        const schemas = combinedSchemas([]);
        schemas.schemas.set('Custom::Type', mockSchema);
        mockComponents.schemaRetriever.getDefault.returns(schemas);

        const result = await provider.getCompletions(context, mockYamlParams);

        expect(result).toBeDefined();
        expect(getResourceSpy).toHaveBeenCalledWith('Custom::Type', 'value1|value2');
    });

    test('should remove readonly and already defined properties - JSON template', async () => {
        mockComponents.schemaRetriever.getDefault.returns(mockSchemas);
        mockComponents.documentManager.getLine.returns('"",');
        const context = createResourceContext('MyResource', {
            text: '',
            type: DocumentType.JSON,
            data: {
                Type: 'AWS::IAM::Role',
                Properties: { RoleName: 'Admin' },
            },
        });

        mockComponents.resourceStateManager.getResource.resolves({
            typeName: 'AWS::IAM::Role',
            identifier: 'Admin',
            properties: `{"Path":"/","ManagedPolicyArns":["arn:aws:iam::aws:policy/AdministratorAccess"],"MaxSessionDuration":43200,"RoleName":"Admin","AssumeRolePolicyDocument":{"Version":"2012-10-17","Statement":[{"Condition":{"StringEquals":{"sts:ExternalId":"IsengardExternalIdAKj8duTfSqL6"}},"Action":"sts:AssumeRole","Effect":"Allow","Principal":{"AWS":"arn:aws:iam::727820809195:root"},"Sid":""}]},"Arn":"arn:aws:iam::783764615233:role/Admin","RoleId":"AROA3M7AC6BAWIZG2LLQY"}`,
            createdTimestamp: DateTime.now(),
        });

        const result = await provider.getCompletions(context, mockJsonParams);

        expect(result).toBeDefined();
        const completionText = result[0].textEdit?.newText;
        expect(completionText).toBeDefined();

        // readonly properties that should be removed
        expect(completionText).not.toContain('arn:aws:iam::783764615233:role/Admin');
        expect(completionText).not.toContain('RoleId');

        // already defined properties should get removed
        expect(completionText).not.toContain('RoleName');

        // remaining properties from resource state should be in completion item insert text
        expect(completionText).toContain('Path');
        expect(completionText).toContain('ManagedPolicyArns');
        expect(completionText).toContain('MaxSessionDuration');
        expect(completionText).toContain('AssumeRolePolicyDocument');
    });

    test('should remove readonly and already defined properties - YAML template', async () => {
        mockComponents.schemaRetriever.getDefault.returns(mockSchemas);
        mockComponents.documentManager.getLine.returns('"",');
        const context = createResourceContext('MyResource', {
            text: '',
            type: DocumentType.YAML,
            data: {
                Type: 'AWS::IAM::Role',
                Properties: { RoleName: 'Admin' },
            },
        });

        mockComponents.resourceStateManager.getResource.resolves({
            typeName: 'AWS::IAM::Role',
            identifier: 'Admin',
            properties: `{"Path":"/","ManagedPolicyArns":["arn:aws:iam::aws:policy/AdministratorAccess"],"MaxSessionDuration":43200,"RoleName":"Admin","AssumeRolePolicyDocument":{"Version":"2012-10-17","Statement":[{"Condition":{"StringEquals":{"sts:ExternalId":"IsengardExternalIdAKj8duTfSqL6"}},"Action":"sts:AssumeRole","Effect":"Allow","Principal":{"AWS":"arn:aws:iam::727820809195:root"},"Sid":""}]},"Arn":"arn:aws:iam::783764615233:role/Admin","RoleId":"AROA3M7AC6BAWIZG2LLQY"}`,
            createdTimestamp: DateTime.now(),
        });

        const result = await provider.getCompletions(context, mockYamlParams);

        expect(result).toBeDefined();
        const completionText = result[0].insertText;
        expect(completionText).toBeDefined();

        // readonly properties that should be removed
        expect(completionText).not.toContain('arn:aws:iam::783764615233:role/Admin');
        expect(completionText).not.toContain('RoleId');

        // already defined properties should get removed
        expect(completionText).not.toContain('RoleName');

        // remaining properties from resource state should be in completion item insert text
        expect(completionText).toContain('Path');
        expect(completionText).toContain('ManagedPolicyArns');
        expect(completionText).toContain('MaxSessionDuration');
        expect(completionText).toContain('AssumeRolePolicyDocument');
    });

    test('should handle undefined value in JSON pointer path', async () => {
        const context = createResourceContext('MyResource', {
            text: '',
            data: {
                Type: 'Custom::Type',
                Properties: { Device: null },
            },
        });

        const mockSchema = new ResourceSchema(
            JSON.stringify({
                typeName: 'Custom::Type',
                description: 'Test',
                properties: {
                    Device: {
                        type: 'object',
                        properties: { DeviceName: { type: 'string' } },
                    },
                },
                primaryIdentifier: ['/properties/Device/DeviceName'],
                additionalProperties: false,
            }),
        );

        const schemas = combinedSchemas([]);
        schemas.schemas.set('Custom::Type', mockSchema);
        mockComponents.schemaRetriever.getDefault.returns(schemas);

        const result = await provider.getCompletions(context, mockYamlParams);

        expect(result.length).toBe(0);
    });

    test('should handle missing nested property in JSON pointer path', async () => {
        const context = createResourceContext('MyResource', {
            text: '',
            data: {
                Type: 'Custom::Type',
                Properties: { Device: { OtherProp: 'value' } },
            },
        });

        const mockSchema = new ResourceSchema(
            JSON.stringify({
                typeName: 'Custom::Type',
                description: 'Test',
                properties: {
                    Device: {
                        type: 'object',
                        properties: { DeviceName: { type: 'string' } },
                    },
                },
                primaryIdentifier: ['/properties/Device/DeviceName'],
                additionalProperties: false,
            }),
        );

        const schemas = combinedSchemas([]);
        schemas.schemas.set('Custom::Type', mockSchema);
        mockComponents.schemaRetriever.getDefault.returns(schemas);

        const result = await provider.getCompletions(context, mockYamlParams);

        expect(result.length).toBe(0);
    });

    test('should handle JSON pointer without properties prefix', async () => {
        const getResourceSpy = vi.fn().mockResolvedValue({
            typeName: 'Custom::Type',
            identifier: 'test-device',
            properties: JSON.stringify({ DeviceName: 'test-device' }),
            createdTimestamp: new Date() as any,
        });
        mockComponents.resourceStateManager.getResource.callsFake(getResourceSpy);

        const context = createResourceContext('MyResource', {
            text: '',
            data: {
                Type: 'Custom::Type',
                Properties: { DeviceName: 'test-device' },
            },
        });

        const mockSchema = new ResourceSchema(
            JSON.stringify({
                typeName: 'Custom::Type',
                description: 'Test',
                properties: { DeviceName: { type: 'string' } },
                primaryIdentifier: ['DeviceName'],
                additionalProperties: false,
            }),
        );

        const schemas = combinedSchemas([]);
        schemas.schemas.set('Custom::Type', mockSchema);
        mockComponents.schemaRetriever.getDefault.returns(schemas);

        const result = await provider.getCompletions(context, mockYamlParams);

        expect(result).toBeDefined();
        expect(getResourceSpy).toHaveBeenCalledWith('Custom::Type', 'test-device');
    });

    test('should handle empty properties object', async () => {
        const context = createResourceContext('MyResource', {
            text: '',
            data: {
                Type: 'AWS::S3::Bucket',
                Properties: {},
            },
        });

        const schemas = combinedSchemas([Schemas.S3Bucket]);
        mockComponents.schemaRetriever.getDefault.returns(schemas);

        const result = await provider.getCompletions(context, mockYamlParams);

        expect(result.length).toBe(0);
    });
});
