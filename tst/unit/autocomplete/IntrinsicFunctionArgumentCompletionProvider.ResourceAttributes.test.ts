import { describe, it, expect, beforeEach, vi } from 'vitest';
import { IntrinsicFunctionArgumentCompletionProvider } from '../../../src/autocomplete/IntrinsicFunctionArgumentCompletionProvider';
import { CombinedSchemas } from '../../../src/schema/CombinedSchemas';
import { ResourceSchema } from '../../../src/schema/ResourceSchema';
import {
    createMockDocumentManager,
    createMockSchemaRetriever,
    createMockSyntaxTreeManager,
} from '../../utils/MockServerComponents';

describe('IntrinsicFunctionArgumentCompletionProvider - getResourceAttributes', () => {
    let provider: IntrinsicFunctionArgumentCompletionProvider;
    const mockSyntaxTreeManager = createMockSyntaxTreeManager();
    const mockDocumentManager = createMockDocumentManager();

    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('should extract attributes from resource schema', () => {
        const mockSchemas = new Map([
            [
                'AWS::S3::Bucket',
                {
                    readOnlyProperties: ['/properties/Arn', '/properties/DomainName', '/properties/RegionalDomainName'],
                } as ResourceSchema,
            ],
        ]);
        const mockCombinedSchemas = new CombinedSchemas();
        (mockCombinedSchemas as any).schemas = mockSchemas;
        const mockSchemaRetriever = createMockSchemaRetriever(mockCombinedSchemas);

        provider = new IntrinsicFunctionArgumentCompletionProvider(
            mockSyntaxTreeManager,
            mockSchemaRetriever,
            mockDocumentManager,
        );

        const attributes = (provider as any).getResourceAttributes('AWS::S3::Bucket');

        expect(attributes).toEqual(['Arn', 'DomainName', 'RegionalDomainName']);
    });

    it('should handle nested properties with dots', () => {
        const mockSchemas = new Map([
            [
                'AWS::EC2::Instance',
                {
                    readOnlyProperties: [
                        '/properties/PrivateDnsName',
                        '/properties/NetworkInterfaces/0/NetworkInterfaceId',
                        '/properties/SecurityGroups/0/GroupId',
                    ],
                } as ResourceSchema,
            ],
        ]);
        const mockCombinedSchemas = new CombinedSchemas();
        (mockCombinedSchemas as any).schemas = mockSchemas;
        const mockSchemaRetriever = createMockSchemaRetriever(mockCombinedSchemas);

        provider = new IntrinsicFunctionArgumentCompletionProvider(
            mockSyntaxTreeManager,
            mockSchemaRetriever,
            mockDocumentManager,
        );

        const attributes = (provider as any).getResourceAttributes('AWS::EC2::Instance');

        expect(attributes).toEqual([
            'PrivateDnsName',
            'NetworkInterfaces.0.NetworkInterfaceId',
            'SecurityGroups.0.GroupId',
        ]);
    });

    it('should filter out attributes with wildcards', () => {
        const mockSchemas = new Map([
            [
                'AWS::Lambda::Function',
                {
                    readOnlyProperties: [
                        '/properties/Arn',
                        '/properties/Environment/*/Value',
                        '/properties/Tags/*/Key',
                        '/properties/Version',
                    ],
                } as ResourceSchema,
            ],
        ]);
        const mockCombinedSchemas = new CombinedSchemas();
        (mockCombinedSchemas as any).schemas = mockSchemas;
        const mockSchemaRetriever = createMockSchemaRetriever(mockCombinedSchemas);

        provider = new IntrinsicFunctionArgumentCompletionProvider(
            mockSyntaxTreeManager,
            mockSchemaRetriever,
            mockDocumentManager,
        );

        const attributes = (provider as any).getResourceAttributes('AWS::Lambda::Function');

        expect(attributes).toEqual(['Arn', 'Version']);
    });

    it('should return empty array for resource without schema', () => {
        const mockSchemas = new Map();
        const mockCombinedSchemas = new CombinedSchemas();
        (mockCombinedSchemas as any).schemas = mockSchemas;
        const mockSchemaRetriever = createMockSchemaRetriever(mockCombinedSchemas);

        provider = new IntrinsicFunctionArgumentCompletionProvider(
            mockSyntaxTreeManager,
            mockSchemaRetriever,
            mockDocumentManager,
        );

        const attributes = (provider as any).getResourceAttributes('AWS::Unknown::Resource');

        expect(attributes).toEqual([]);
    });

    it('should return empty array for resource without readOnlyProperties', () => {
        const mockSchemas = new Map([
            [
                'AWS::Custom::Resource',
                {
                    readOnlyProperties: [] as unknown,
                } as ResourceSchema,
            ],
        ]);
        const mockCombinedSchemas = new CombinedSchemas();
        (mockCombinedSchemas as any).schemas = mockSchemas;
        const mockSchemaRetriever = createMockSchemaRetriever(mockCombinedSchemas);

        provider = new IntrinsicFunctionArgumentCompletionProvider(
            mockSyntaxTreeManager,
            mockSchemaRetriever,
            mockDocumentManager,
        );

        const attributes = (provider as any).getResourceAttributes('AWS::Custom::Resource');

        expect(attributes).toEqual([]);
    });

    it('should deduplicate attributes', () => {
        const mockSchemas = new Map([
            [
                'AWS::Test::Resource',
                {
                    readOnlyProperties: [
                        '/properties/Arn',
                        '/properties/Arn', // Duplicate
                        '/properties/Name',
                    ],
                } as ResourceSchema,
            ],
        ]);
        const mockCombinedSchemas = new CombinedSchemas();
        (mockCombinedSchemas as any).schemas = mockSchemas;
        const mockSchemaRetriever = createMockSchemaRetriever(mockCombinedSchemas);

        provider = new IntrinsicFunctionArgumentCompletionProvider(
            mockSyntaxTreeManager,
            mockSchemaRetriever,
            mockDocumentManager,
        );

        const attributes = (provider as any).getResourceAttributes('AWS::Test::Resource');

        expect(attributes).toEqual(['Arn', 'Name']);
    });
});
