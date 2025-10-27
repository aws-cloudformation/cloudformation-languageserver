import { describe, it, expect, beforeEach, vi } from 'vitest';
import { CancellationToken } from 'vscode-languageserver';
import { getEntityMap } from '../../../src/context/SectionContextBuilder';
import {
    getAuthoredResourceTypesHandler,
    getRelatedResourceTypesHandler,
    insertRelatedResourcesHandler,
} from '../../../src/handlers/RelatedResourcesHandler';
import { RelatedResourcesSnippetProvider } from '../../../src/relatedResources/RelatedResourcesSnippetProvider';
import {
    createMockComponents,
    createMockRelationshipSchemaService,
    createMockSyntaxTreeManager,
} from '../../utils/MockServerComponents';

// Mock the SectionContextBuilder module
vi.mock('../../../src/context/SectionContextBuilder', () => ({
    getEntityMap: vi.fn(),
}));

// Mock the RelatedResourcesSnippetProvider
vi.mock('../../../src/relatedResources/RelatedResourcesSnippetProvider', () => ({
    RelatedResourcesSnippetProvider: vi.fn().mockImplementation(() => ({
        insertRelatedResources: vi.fn(),
    })),
}));

describe('RelatedResourcesHandler', () => {
    const syntaxTreeManager = createMockSyntaxTreeManager();
    const relationshipSchemaService = createMockRelationshipSchemaService();
    let mockComponents: ReturnType<typeof createMockComponents>;
    let mockGetEntityMap: any;
    const mockToken = {} as CancellationToken;

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
        it('should return unique resource types from template', () => {
            const handler = getAuthoredResourceTypesHandler(mockComponents);
            const templateUri = 'file:///test/template.yaml';

            const mockResourceContext1 = {
                entity: { Type: 'AWS::S3::Bucket' },
            };
            const mockResourceContext2 = {
                entity: { Type: 'AWS::Lambda::Function' },
            };
            const mockResourceContext3 = {
                entity: { Type: 'AWS::S3::Bucket' }, // Duplicate
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

            expect(result).toEqual(['AWS::S3::Bucket', 'AWS::Lambda::Function']);
            expect(syntaxTreeManager.getSyntaxTree.calledWith(templateUri)).toBe(true);
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

    describe('getRelatedResourceTypesHandler', () => {
        it('should return related resource types for a given resource type', () => {
            const handler = getRelatedResourceTypesHandler(mockComponents);
            const params = { resourceType: 'AWS::S3::Bucket' };

            const relatedTypes = new Set(['AWS::Lambda::Function', 'AWS::IAM::Role']);
            relationshipSchemaService.getAllRelatedResourceTypes.withArgs('AWS::S3::Bucket').returns(relatedTypes);

            const result = handler(params, mockToken);

            expect(result).toEqual(['AWS::Lambda::Function', 'AWS::IAM::Role']);
            expect(relationshipSchemaService.getAllRelatedResourceTypes.calledWith('AWS::S3::Bucket')).toBe(true);
        });

        it('should return empty array when no related types found', () => {
            const handler = getRelatedResourceTypesHandler(mockComponents);
            const params = { resourceType: 'AWS::Custom::Resource' };

            relationshipSchemaService.getAllRelatedResourceTypes.withArgs('AWS::Custom::Resource').returns(new Set());

            const result = handler(params, mockToken);

            expect(result).toEqual([]);
        });

        it('should handle errors and rethrow them', () => {
            const handler = getRelatedResourceTypesHandler(mockComponents);
            const params = { resourceType: 'AWS::S3::Bucket' };
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
                resourceTypes: ['AWS::Lambda::Function', 'AWS::IAM::Role'],
                selectedResourceType: 'AWS::S3::Bucket',
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

            const mockSnippetProvider = {
                insertRelatedResources: vi.fn().mockReturnValue(mockCodeAction),
            };
            vi.mocked(RelatedResourcesSnippetProvider).mockImplementation(() => mockSnippetProvider as any);

            const result = handler(params, mockToken);

            expect(result).toEqual(mockCodeAction);
            expect(RelatedResourcesSnippetProvider).toHaveBeenCalledWith(mockComponents);
            expect(mockSnippetProvider.insertRelatedResources).toHaveBeenCalledWith(
                'file:///test/template.yaml',
                ['AWS::Lambda::Function', 'AWS::IAM::Role'],
                'AWS::S3::Bucket',
            );
        });

        it('should handle errors and rethrow them', () => {
            const handler = insertRelatedResourcesHandler(mockComponents);
            const params = {
                templateUri: 'file:///test/template.yaml',
                resourceTypes: ['AWS::Lambda::Function'],
                selectedResourceType: 'AWS::S3::Bucket',
            };
            const error = new Error('Snippet provider error');

            const mockSnippetProvider = {
                insertRelatedResources: vi.fn().mockImplementation(() => {
                    throw error;
                }),
            };
            vi.mocked(RelatedResourcesSnippetProvider).mockImplementation(() => mockSnippetProvider as any);

            expect(() => handler(params, mockToken)).toThrow('Snippet provider error');
        });
    });
});
