import { describe, it, expect, beforeEach, vi, Mock } from 'vitest';
import { CancellationToken } from 'vscode-languageserver';
import {
    getAuthoredResourceTypesHandler,
    getAuthoredResourceTypesHandlerV2,
    getRelatedResourceTypesHandler,
    insertRelatedResourcesHandler,
} from '../../../src/handlers/RelatedResourcesHandler';
import {
    createMockComponents,
    createMockRelationshipSchemaService,
    createMockSyntaxTreeManager,
} from '../../utils/MockServerComponents';
import { getEntityMap } from '../../../src/context/SectionContextBuilder';

// Mock the SectionContextBuilder module
vi.mock('../../../src/context/SectionContextBuilder', () => ({
    getEntityMap: vi.fn(),
}));

describe('RelatedResourcesHandler', () => {
    const syntaxTreeManager = createMockSyntaxTreeManager();
    const relationshipSchemaService = createMockRelationshipSchemaService();
    let mockComponents: ReturnType<typeof createMockComponents>;
    const mockToken = {} as CancellationToken;
    let mockGetEntityMap: Mock;

    beforeEach(() => {
        vi.clearAllMocks();
        syntaxTreeManager.getSyntaxTree.reset();
        relationshipSchemaService.getAllRelatedResourceTypes.reset();

        mockComponents = createMockComponents({
            syntaxTreeManager,
            relationshipSchemaService,
        });
        mockGetEntityMap = vi.mocked(getEntityMap);
    });

    describe('getAuthoredResourceTypesHandler', () => {
        it('should return resource type strings', () => {
            const handler = getAuthoredResourceTypesHandler(mockComponents);
            const templateUri = 'file:///test/template.yaml';

            syntaxTreeManager.getSyntaxTree.withArgs(templateUri).returns({} as any);
            mockGetEntityMap.mockReturnValue(
                new Map([
                    ['Bucket1', { entity: { Type: 'AWS::S3::Bucket' } }],
                    ['Function1', { entity: { Type: 'AWS::Lambda::Function' } }],
                ]),
            );

            const result = handler(templateUri, mockToken);

            expect(result).toEqual(['AWS::S3::Bucket', 'AWS::Lambda::Function']);
        });

        it('should return empty array when no syntax tree found', () => {
            const handler = getAuthoredResourceTypesHandler(mockComponents);
            const templateUri = 'file:///test/template.yaml';

            syntaxTreeManager.getSyntaxTree.withArgs(templateUri).returns(undefined);

            const result = handler(templateUri, mockToken);

            expect(result).toEqual([]);
        });

        it('should return empty array when no resources found', () => {
            const handler = getAuthoredResourceTypesHandler(mockComponents);
            const templateUri = 'file:///test/template.yaml';

            syntaxTreeManager.getSyntaxTree.withArgs(templateUri).returns({} as any);
            mockGetEntityMap.mockReturnValue(undefined);

            const result = handler(templateUri, mockToken);

            expect(result).toEqual([]);
        });

        it('should filter out undefined and null resource types', () => {
            const handler = getAuthoredResourceTypesHandler(mockComponents);
            const templateUri = 'file:///test/template.yaml';

            const mockResourceContext1 = {
                entity: { Type: 'AWS::S3::Bucket' },
            };
            const mockResourceContext2 = {
                entity: { Type: undefined as any },
            };
            const mockResourceContext3 = {
                entity: { Type: null as any },
            };

            syntaxTreeManager.getSyntaxTree.withArgs(templateUri).returns({} as any);
            mockGetEntityMap.mockReturnValue(
                new Map([
                    ['Bucket1', mockResourceContext1],
                    ['Resource2', mockResourceContext2],
                    ['Resource3', mockResourceContext3],
                ]) as any,
            );

            const result = handler(templateUri, mockToken);

            expect(result).toEqual(['AWS::S3::Bucket']);
        });

        it('should handle errors and rethrow them', () => {
            const handler = getAuthoredResourceTypesHandler(mockComponents);
            const templateUri = 'file:///test/template.yaml';
            const error = new Error('Syntax tree error');

            syntaxTreeManager.getSyntaxTree.withArgs(templateUri).throws(error);

            expect(() => handler(templateUri, mockToken)).toThrow('Syntax tree error');
        });
    });

    describe('getAuthoredResourceTypesHandlerV2', () => {
        it('should return authored resources with logical IDs and types', () => {
            const handler = getAuthoredResourceTypesHandlerV2(mockComponents);
            const templateUri = 'file:///test/template.yaml';

            const mockResourceContext1 = {
                entity: { Type: 'AWS::S3::Bucket' },
            };
            const mockResourceContext2 = {
                entity: { Type: 'AWS::Lambda::Function' },
            };
            const mockResourceContext3 = {
                entity: { Type: 'AWS::S3::Bucket' },
            };

            syntaxTreeManager.getSyntaxTree.withArgs(templateUri).returns({} as any);
            mockGetEntityMap.mockReturnValue(
                new Map([
                    ['Bucket1', mockResourceContext1],
                    ['Function1', mockResourceContext2],
                    ['Bucket2', mockResourceContext3],
                ]),
            );

            const result = handler(templateUri, mockToken);

            expect(result).toEqual([
                { logicalId: 'Bucket1', type: 'AWS::S3::Bucket' },
                { logicalId: 'Function1', type: 'AWS::Lambda::Function' },
                { logicalId: 'Bucket2', type: 'AWS::S3::Bucket' },
            ]);
            expect(syntaxTreeManager.getSyntaxTree.calledWith(templateUri)).toBe(true);
        });

        it('should return empty array when no syntax tree found', () => {
            const handler = getAuthoredResourceTypesHandlerV2(mockComponents);
            const templateUri = 'file:///test/template.yaml';

            syntaxTreeManager.getSyntaxTree.withArgs(templateUri).returns(undefined);

            const result = handler(templateUri, mockToken);

            expect(result).toEqual([]);
        });

        it('should return empty array when no resources found', () => {
            const handler = getAuthoredResourceTypesHandlerV2(mockComponents);
            const templateUri = 'file:///test/template.yaml';

            syntaxTreeManager.getSyntaxTree.withArgs(templateUri).returns({} as any);
            mockGetEntityMap.mockReturnValue(undefined);

            const result = handler(templateUri, mockToken);

            expect(result).toEqual([]);
        });

        it('should filter out undefined and null resource types', () => {
            const handler = getAuthoredResourceTypesHandlerV2(mockComponents);
            const templateUri = 'file:///test/template.yaml';

            const mockResourceContext1 = {
                entity: { Type: 'AWS::S3::Bucket' },
            };
            const mockResourceContext2 = {
                entity: { Type: undefined as any },
            };
            const mockResourceContext3 = {
                entity: { Type: null as any },
            };

            syntaxTreeManager.getSyntaxTree.withArgs(templateUri).returns({} as any);
            mockGetEntityMap.mockReturnValue(
                new Map([
                    ['Bucket1', mockResourceContext1],
                    ['Resource2', mockResourceContext2],
                    ['Resource3', mockResourceContext3],
                ]) as any,
            );

            const result = handler(templateUri, mockToken);

            expect(result).toEqual([{ logicalId: 'Bucket1', type: 'AWS::S3::Bucket' }]);
        });

        it('should handle errors and rethrow them', () => {
            const handler = getAuthoredResourceTypesHandlerV2(mockComponents);
            const templateUri = 'file:///test/template.yaml';
            const error = new Error('Syntax tree error');

            syntaxTreeManager.getSyntaxTree.withArgs(templateUri).throws(error);

            expect(() => handler(templateUri, mockToken)).toThrow('Syntax tree error');
        });
    });

    describe('getRelatedResourceTypesHandler', () => {
        it('should return related resource types for a given resource type', () => {
            const handler = getRelatedResourceTypesHandler(mockComponents);
            const params = { parentResourceType: 'AWS::S3::Bucket' };

            const relatedTypes = new Set(['AWS::Lambda::Function', 'AWS::IAM::Role']);
            relationshipSchemaService.getAllRelatedResourceTypes.withArgs('AWS::S3::Bucket').returns(relatedTypes);

            relationshipSchemaService.getRelationshipsForResourceType.withArgs('AWS::Lambda::Function').returns({
                resourceType: 'AWS::Lambda::Function',
                relationships: [
                    {
                        property: 'BucketName',
                        relatedResourceTypes: [{ typeName: 'AWS::S3::Bucket', attribute: '/properties/BucketName' }],
                    },
                ],
            });

            relationshipSchemaService.getRelationshipsForResourceType.withArgs('AWS::IAM::Role').returns({
                resourceType: 'AWS::IAM::Role',
                relationships: [
                    {
                        property: 'BucketArn',
                        relatedResourceTypes: [{ typeName: 'AWS::S3::Bucket', attribute: '/properties/Arn' }],
                    },
                ],
            });

            mockComponents.schemaRetriever.getDefault.returns({
                schemas: new Map([
                    ['AWS::Lambda::Function', { properties: { BucketName: { type: 'string' } } }],
                    ['AWS::IAM::Role', { properties: { BucketArn: { type: 'string' } } }],
                ]),
            } as any);

            const result = handler(params, mockToken);

            expect(result).toEqual(['AWS::Lambda::Function', 'AWS::IAM::Role']);
            expect(relationshipSchemaService.getAllRelatedResourceTypes.calledWith('AWS::S3::Bucket')).toBe(true);
        });

        it('should return related resource types that have exactly one populatable relationship', () => {
            const handler = getRelatedResourceTypesHandler(mockComponents);
            const params = { parentResourceType: 'AWS::S3::Bucket' };

            const relatedTypes = new Set(['AWS::Lambda::Function', 'AWS::IAM::Role']);
            relationshipSchemaService.getAllRelatedResourceTypes.withArgs('AWS::S3::Bucket').returns(relatedTypes);

            const result = handler(params, mockToken);

            expect(result).toEqual(['AWS::Lambda::Function', 'AWS::IAM::Role']);
            expect(relationshipSchemaService.getAllRelatedResourceTypes.calledWith('AWS::S3::Bucket')).toBe(true);
        });

        it('should return empty array when no related types found', () => {
            const handler = getRelatedResourceTypesHandler(mockComponents);
            const params = { parentResourceType: 'AWS::Custom::Resource' };

            relationshipSchemaService.getAllRelatedResourceTypes.withArgs('AWS::Custom::Resource').returns(new Set());

            const result = handler(params, mockToken);

            expect(result).toEqual([]);
        });

        it('should handle errors and rethrow them', () => {
            const handler = getRelatedResourceTypesHandler(mockComponents);
            const params = { parentResourceType: 'AWS::S3::Bucket' };
            const error = new Error('Relationship service error');

            relationshipSchemaService.getAllRelatedResourceTypes.withArgs('AWS::S3::Bucket').throws(error);

            expect(() => handler(params, mockToken)).toThrow('Relationship service error');
        });
    });

    describe('insertRelatedResourcesHandler', () => {
        it('should insert related resources and return code action', () => {
            const handler = insertRelatedResourcesHandler(mockComponents);
            const params = {
                templateUri: 'file:///test/template.yaml',
                relatedResourceTypes: ['AWS::Lambda::Function', 'AWS::IAM::Role'],
                parentResourceType: 'AWS::S3::Bucket',
            };

            const mockCodeAction = {
                title: 'Insert 2 related resources',
                kind: 'refactor',
                edit: {
                    changes: {
                        'file:///test/template.yaml': [],
                    },
                },
            };

            mockComponents.relatedResourcesSnippetProvider.insertRelatedResources
                .withArgs('file:///test/template.yaml', ['AWS::Lambda::Function', 'AWS::IAM::Role'], 'AWS::S3::Bucket')
                .returns(mockCodeAction);

            const result = handler(params, mockToken);

            expect(result).toEqual(mockCodeAction);
            expect(
                mockComponents.relatedResourcesSnippetProvider.insertRelatedResources.calledWith(
                    'file:///test/template.yaml',
                    ['AWS::Lambda::Function', 'AWS::IAM::Role'],
                    'AWS::S3::Bucket',
                ),
            ).toBe(true);
        });

        it('should insert related resources and return code action without parentLogicalId', () => {
            const handler = insertRelatedResourcesHandler(mockComponents);
            const params = {
                templateUri: 'file:///test/template.yaml',
                relatedResourceTypes: ['AWS::Lambda::Function', 'AWS::IAM::Role'],
                parentResourceType: 'AWS::S3::Bucket',
            };

            const mockCodeAction = {
                title: 'Insert 2 related resources',
                kind: 'refactor',
                edit: {
                    changes: {
                        'file:///test/template.yaml': [],
                    },
                },
            };

            mockComponents.relatedResourcesSnippetProvider.insertRelatedResources
                .withArgs('file:///test/template.yaml', ['AWS::Lambda::Function', 'AWS::IAM::Role'], 'AWS::S3::Bucket')
                .returns(mockCodeAction);

            const result = handler(params, mockToken);

            expect(result).toEqual(mockCodeAction);
            expect(
                mockComponents.relatedResourcesSnippetProvider.insertRelatedResources.calledWith(
                    'file:///test/template.yaml',
                    ['AWS::Lambda::Function', 'AWS::IAM::Role'],
                    'AWS::S3::Bucket',
                ),
            ).toBe(true);
        });

        it('should handle errors and rethrow them', () => {
            const handler = insertRelatedResourcesHandler(mockComponents);
            const params = {
                templateUri: 'file:///test/template.yaml',
                relatedResourceTypes: ['AWS::Lambda::Function'],
                parentResourceType: 'AWS::S3::Bucket',
            };
            const error = new Error('Snippet provider error');

            mockComponents.relatedResourcesSnippetProvider.insertRelatedResources.throws(error);

            expect(() => handler(params, mockToken)).toThrow('Snippet provider error');
        });
    });
});
