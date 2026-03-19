import { describe, it, expect, beforeEach, vi } from 'vitest';
import { CancellationToken } from 'vscode-languageserver';
import { getEntityMap } from '../../../src/context/SectionContextBuilder';
import {
    getAuthoredResourceTypesHandler,
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
        it('should return authored resources with logical IDs and types', () => {
            const handler = getAuthoredResourceTypesHandler(mockComponents);
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

            expect(result).toEqual([{ logicalId: 'Bucket1', type: 'AWS::S3::Bucket' }]);
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
        it('should return related resource types that have exactly one populatable relationship', () => {
            const handler = getRelatedResourceTypesHandler(mockComponents);
            const params = { parentResourceType: 'AWS::S3::Bucket' };

            const relatedTypes = new Set(['AWS::Lambda::Function', 'AWS::CloudTrail::Trail']);
            relationshipSchemaService.getAllRelatedResourceTypes.withArgs('AWS::S3::Bucket').returns(relatedTypes);

            // Lambda has exactly 1 non-array top-level reference to S3
            relationshipSchemaService.getRelationshipsForResourceType.withArgs('AWS::Lambda::Function').returns({
                resourceType: 'AWS::Lambda::Function',
                relationships: [
                    {
                        property: 'Code/S3Bucket',
                        relatedResourceTypes: [{ typeName: 'AWS::S3::Bucket', attribute: '/properties/BucketName' }],
                    },
                ],
            });

            // CloudTrail has exactly 1 non-array top-level reference to S3
            relationshipSchemaService.getRelationshipsForResourceType.withArgs('AWS::CloudTrail::Trail').returns({
                resourceType: 'AWS::CloudTrail::Trail',
                relationships: [
                    {
                        property: 'S3BucketName',
                        relatedResourceTypes: [{ typeName: 'AWS::S3::Bucket', attribute: '/properties/BucketName' }],
                    },
                ],
            });

            mockComponents.schemaRetriever.getDefault.returns({
                schemas: new Map([
                    ['AWS::Lambda::Function', { properties: {} }],
                    ['AWS::CloudTrail::Trail', { properties: { S3BucketName: { type: 'string' } } }],
                ]),
            } as any);

            const result = handler(params, mockToken);

            // Lambda only has nested ref (Code/S3Bucket), so 0 top-level → excluded
            // CloudTrail has 1 top-level non-array ref → included
            expect(result).toEqual(['AWS::CloudTrail::Trail']);
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

        it('should filter out resource types that only have array-property relationships', () => {
            const handler = getRelatedResourceTypesHandler(mockComponents);
            const params = { parentResourceType: 'AWS::IAM::Role' };

            const relatedTypes = new Set(['AWS::IAM::ManagedPolicy', 'AWS::Lambda::Function']);
            relationshipSchemaService.getAllRelatedResourceTypes.withArgs('AWS::IAM::Role').returns(relatedTypes);

            // ManagedPolicy has only array relationship (Roles)
            relationshipSchemaService.getRelationshipsForResourceType.withArgs('AWS::IAM::ManagedPolicy').returns({
                resourceType: 'AWS::IAM::ManagedPolicy',
                relationships: [
                    {
                        property: 'Roles',
                        relatedResourceTypes: [{ typeName: 'AWS::IAM::Role', attribute: '/properties/RoleName' }],
                    },
                ],
            });

            // Lambda has exactly one non-array relationship (Role)
            relationshipSchemaService.getRelationshipsForResourceType.withArgs('AWS::Lambda::Function').returns({
                resourceType: 'AWS::Lambda::Function',
                relationships: [
                    {
                        property: 'Role',
                        relatedResourceTypes: [{ typeName: 'AWS::IAM::Role', attribute: '/properties/Arn' }],
                    },
                ],
            });

            mockComponents.schemaRetriever.getDefault.returns({
                schemas: new Map([
                    ['AWS::IAM::ManagedPolicy', { properties: { Roles: { type: 'array' } } }],
                    ['AWS::Lambda::Function', { properties: { Role: { type: 'string' } } }],
                ]),
            } as any);

            const result = handler(params, mockToken);

            expect(result).toEqual(['AWS::Lambda::Function']);
            expect(result).not.toContain('AWS::IAM::ManagedPolicy');
        });

        it('should filter out resource types with 2 top-level refs to parent (including arrays)', () => {
            const handler = getRelatedResourceTypesHandler(mockComponents);
            const params = { parentResourceType: 'AWS::IAM::Role' };

            const relatedTypes = new Set(['AWS::IAM::InstanceProfile']);
            relationshipSchemaService.getAllRelatedResourceTypes.withArgs('AWS::IAM::Role').returns(relatedTypes);

            // InstanceProfile has 2 top-level refs: Roles (array) + InstanceProfileName
            relationshipSchemaService.getRelationshipsForResourceType.withArgs('AWS::IAM::InstanceProfile').returns({
                resourceType: 'AWS::IAM::InstanceProfile',
                relationships: [
                    {
                        property: 'Roles',
                        relatedResourceTypes: [
                            { typeName: 'AWS::IAM::Role', attribute: '/properties/RoleName' },
                            { typeName: 'AWS::IAM::Role', attribute: '/properties/Arn' },
                        ],
                    },
                    {
                        property: 'InstanceProfileName',
                        relatedResourceTypes: [{ typeName: 'AWS::IAM::Role', attribute: '/properties/RoleName' }],
                    },
                ],
            });

            mockComponents.schemaRetriever.getDefault.returns({
                schemas: new Map([
                    [
                        'AWS::IAM::InstanceProfile',
                        { properties: { Roles: { type: 'array' }, InstanceProfileName: { type: 'string' } } },
                    ],
                ]),
            } as any);

            const result = handler(params, mockToken);

            // 2 total top-level refs (Roles + InstanceProfileName) → excluded
            expect(result).toEqual([]);
        });

        it('should filter out resource types with no relationships to parent', () => {
            const handler = getRelatedResourceTypesHandler(mockComponents);
            const params = { parentResourceType: 'AWS::IAM::Role' };

            const relatedTypes = new Set(['AWS::EMR::Cluster']);
            relationshipSchemaService.getAllRelatedResourceTypes.withArgs('AWS::IAM::Role').returns(relatedTypes);

            // EMR::Cluster has no relationships (came from reverse lookup)
            relationshipSchemaService.getRelationshipsForResourceType.withArgs('AWS::EMR::Cluster').returns(undefined);

            const result = handler(params, mockToken);

            // No relationships found → excluded
            expect(result).toEqual([]);
        });

        it('should filter out resource types where all relationships to parent are arrays', () => {
            const handler = getRelatedResourceTypesHandler(mockComponents);
            const params = { parentResourceType: 'AWS::EC2::SecurityGroup' };

            const relatedTypes = new Set(['AWS::EC2::Instance']);
            relationshipSchemaService.getAllRelatedResourceTypes
                .withArgs('AWS::EC2::SecurityGroup')
                .returns(relatedTypes);

            relationshipSchemaService.getRelationshipsForResourceType.withArgs('AWS::EC2::Instance').returns({
                resourceType: 'AWS::EC2::Instance',
                relationships: [
                    {
                        property: 'SecurityGroups',
                        relatedResourceTypes: [
                            { typeName: 'AWS::EC2::SecurityGroup', attribute: '/properties/GroupId' },
                        ],
                    },
                    {
                        property: 'SecurityGroupIds',
                        relatedResourceTypes: [
                            { typeName: 'AWS::EC2::SecurityGroup', attribute: '/properties/GroupId' },
                        ],
                    },
                ],
            });

            mockComponents.schemaRetriever.getDefault.returns({
                schemas: new Map([
                    [
                        'AWS::EC2::Instance',
                        {
                            properties: {
                                SecurityGroups: { type: 'array' },
                                SecurityGroupIds: { type: 'array' },
                            },
                        },
                    ],
                ]),
            } as any);

            const result = handler(params, mockToken);

            expect(result).toEqual([]);
        });
    });

    describe('insertRelatedResourcesHandler', () => {
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
                .withArgs(
                    'file:///test/template.yaml',
                    ['AWS::Lambda::Function', 'AWS::IAM::Role'],
                    'AWS::S3::Bucket',
                    undefined,
                )
                .returns(mockCodeAction);

            const result = handler(params, mockToken);

            expect(result).toEqual(mockCodeAction);
        });

        it('should insert related resources with parentLogicalId when provided', () => {
            const handler = insertRelatedResourcesHandler(mockComponents);
            const params = {
                templateUri: 'file:///test/template.yaml',
                relatedResourceTypes: ['AWS::Lambda::Function'],
                parentResourceType: 'AWS::IAM::Role',
                parentLogicalId: 'MyRole',
            };

            const mockCodeAction = {
                title: 'Insert 1 related resources',
                kind: 'refactor',
                edit: {
                    changes: {
                        'file:///test/template.yaml': [],
                    },
                },
            };

            mockComponents.relatedResourcesSnippetProvider.insertRelatedResources.returns(mockCodeAction);

            const result = handler(params, mockToken);

            expect(result).toEqual(mockCodeAction);
            // Verify it was called with the parentLogicalId
            expect(mockComponents.relatedResourcesSnippetProvider.insertRelatedResources.calledOnce).toBe(true);
            const call = mockComponents.relatedResourcesSnippetProvider.insertRelatedResources.getCall(0);
            expect(call.args).toEqual([
                'file:///test/template.yaml',
                ['AWS::Lambda::Function'],
                'AWS::IAM::Role',
                'MyRole',
            ]);
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
