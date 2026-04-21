import { describe, it, expect, beforeEach, vi } from 'vitest';
import { CancellationToken } from 'vscode-languageserver';
import {
    getRelatedResourceTypesHandler,
    insertRelatedResourcesHandler,
} from '../../../src/handlers/RelatedResourcesHandler';
import {
    createMockComponents,
    createMockRelationshipSchemaService,
    createMockSyntaxTreeManager,
} from '../../utils/MockServerComponents';

// Mock the SectionContextBuilder module
vi.mock('../../../src/context/SectionContextBuilder', () => ({
    getEntityMap: vi.fn(),
}));

describe('RelatedResourcesHandler', () => {
    const syntaxTreeManager = createMockSyntaxTreeManager();
    const relationshipSchemaService = createMockRelationshipSchemaService();
    let mockComponents: ReturnType<typeof createMockComponents>;
    const mockToken = {} as CancellationToken;

    beforeEach(() => {
        vi.clearAllMocks();
        syntaxTreeManager.getSyntaxTree.reset();
        relationshipSchemaService.getAllRelatedResourceTypes.reset();

        mockComponents = createMockComponents({
            syntaxTreeManager,
            relationshipSchemaService,
        });
    });

    describe('getRelatedResourceTypesHandler', () => {
        it('should return related resource types for a given resource type', () => {
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
