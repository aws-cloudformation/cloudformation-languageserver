import { GetResourceCommandOutput, ResourceNotFoundException } from '@aws-sdk/client-cloudcontrol';
import { DateTime } from 'luxon';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ResourceStateManager } from '../../../src/resourceState/ResourceStateManager';
import { CombinedSchemas } from '../../../src/schema/CombinedSchemas';
import { CcapiService } from '../../../src/services/CcapiService';
import { S3Service } from '../../../src/services/S3Service';
import { createMockSchemaRetriever } from '../../utils/MockServerComponents';

describe('ResourceStateManager', () => {
    const mockCcapiService = {
        getResource: vi.fn(),
        listResources: vi.fn(),
    } as unknown as CcapiService;

    const mockS3Service = {
        listBuckets: vi.fn(),
    } as unknown as S3Service;

    let manager: ResourceStateManager;

    beforeEach(() => {
        vi.clearAllMocks();
        manager = new ResourceStateManager(mockCcapiService, createMockSchemaRetriever(), mockS3Service);
    });

    afterEach(() => {
        vi.clearAllMocks();
    });

    describe('getResource()', () => {
        it('should return cached resource if available', async () => {
            const mockOutput: GetResourceCommandOutput = {
                TypeName: 'AWS::S3::Bucket',
                ResourceDescription: {
                    Identifier: 'my-bucket',
                    Properties: '{"BucketName": "my-bucket"}',
                },
                $metadata: {},
            };
            vi.mocked(mockCcapiService.getResource).mockResolvedValue(mockOutput);

            const result = await manager.getResource('AWS::S3::Bucket', 'my-bucket');

            expect(result?.properties).toEqual('{"BucketName": "my-bucket"}');
            await manager.getResource('AWS::S3::Bucket', 'my-bucket');
            expect(mockCcapiService.getResource).toHaveBeenCalledOnce();
        });

        it('should fetch and cache resource if not in cache', async () => {
            const mockOutput: GetResourceCommandOutput = {
                TypeName: 'AWS::S3::Bucket',
                ResourceDescription: {
                    Identifier: 'my-bucket',
                    Properties: '{"BucketName": "my-bucket"}',
                },
                $metadata: {},
            };
            vi.mocked(mockCcapiService.getResource).mockResolvedValue(mockOutput);

            const result = await manager.getResource('AWS::S3::Bucket', 'my-bucket');

            expect(result).toEqual({
                typeName: 'AWS::S3::Bucket',
                identifier: 'my-bucket',
                properties: '{"BucketName": "my-bucket"}',
                createdTimestamp: expect.any(DateTime),
            });
        });

        it('should handle ResourceNotFoundException', async () => {
            const error = new ResourceNotFoundException({
                message: 'Resource not found',
                $metadata: { httpStatusCode: 404 },
            });
            vi.mocked(mockCcapiService.getResource).mockRejectedValue(error);

            const result = await manager.getResource('AWS::S3::Bucket', 'nonexistent');

            expect(result).toBeUndefined();
        });

        it('should handle other errors', async () => {
            const error = new Error('Service error');
            vi.mocked(mockCcapiService.getResource).mockRejectedValue(error);

            const result = await manager.getResource('AWS::S3::Bucket', 'my-bucket');

            expect(result).toBeUndefined();
        });

        it('should handle missing required fields in output', async () => {
            const mockOutput: GetResourceCommandOutput = {
                TypeName: 'AWS::S3::Bucket',
                ResourceDescription: {
                    Identifier: 'my-bucket',
                    // Missing Properties
                },
                $metadata: {},
            };
            vi.mocked(mockCcapiService.getResource).mockResolvedValue(mockOutput);

            const result = await manager.getResource('AWS::S3::Bucket', 'my-bucket');

            expect(result).toBeUndefined();
        });
    });

    describe('listResources()', () => {
        it('should fetch and cache initial page for S3 buckets', async () => {
            vi.mocked(mockS3Service.listBuckets).mockResolvedValue({
                buckets: ['bucket-1', 'bucket-2'],
                nextToken: 'token-1',
            });

            const result = await manager.listResources('AWS::S3::Bucket');

            expect(mockS3Service.listBuckets).toHaveBeenCalledWith('us-east-1', undefined);
            expect(result?.resourceIdentifiers).toEqual(['bucket-1', 'bucket-2']);
            expect(result?.nextToken).toBe('token-1');
        });

        it('should fetch and cache initial page for non-S3 resources', async () => {
            vi.mocked(mockCcapiService.listResources).mockResolvedValue({
                ResourceDescriptions: [{ Identifier: 'role-1' }, { Identifier: 'role-2' }],
                NextToken: 'token-1',
            });

            const result = await manager.listResources('AWS::IAM::Role');

            expect(mockCcapiService.listResources).toHaveBeenCalledWith('AWS::IAM::Role', { nextToken: undefined });
            expect(result?.resourceIdentifiers).toEqual(['role-1', 'role-2']);
            expect(result?.nextToken).toBe('token-1');
        });

        it('should fetch next page and append to cache', async () => {
            vi.mocked(mockS3Service.listBuckets)
                .mockResolvedValueOnce({
                    buckets: ['bucket-1'],
                    nextToken: 'token-1',
                })
                .mockResolvedValueOnce({
                    buckets: ['bucket-2'],
                    nextToken: undefined,
                });

            await manager.listResources('AWS::S3::Bucket');
            const result = await manager.listResources('AWS::S3::Bucket', 'token-1');

            expect(result?.resourceIdentifiers).toEqual(['bucket-1', 'bucket-2']);
            expect(result?.nextToken).toBeUndefined();
        });

        it('should deduplicate identifiers when paginating', async () => {
            vi.mocked(mockS3Service.listBuckets)
                .mockResolvedValueOnce({
                    buckets: ['bucket-1', 'bucket-2'],
                    nextToken: 'token-1',
                })
                .mockResolvedValueOnce({
                    buckets: ['bucket-2', 'bucket-3'],
                    nextToken: undefined,
                });

            await manager.listResources('AWS::S3::Bucket');
            const result = await manager.listResources('AWS::S3::Bucket', 'token-1');

            expect(result?.resourceIdentifiers).toEqual(['bucket-1', 'bucket-2', 'bucket-3']);
        });

        it('should return undefined when fetch fails', async () => {
            vi.mocked(mockS3Service.listBuckets).mockRejectedValue(new Error('S3 error'));

            const result = await manager.listResources('AWS::S3::Bucket');

            expect(result).toBeUndefined();
        });
    });

    describe('searchResourceByIdentifier()', () => {
        it('should return found=false when resource does not exist', async () => {
            vi.mocked(mockCcapiService.getResource).mockRejectedValue(
                new ResourceNotFoundException({ message: 'Not found', $metadata: {} }),
            );

            const result = await manager.searchResourceByIdentifier('AWS::S3::Bucket', 'nonexistent');

            expect(result.found).toBe(false);
            expect(result.resourceList).toBeUndefined();
        });

        it('should add identifier to existing cache', async () => {
            vi.mocked(mockS3Service.listBuckets).mockResolvedValue({
                buckets: ['bucket-1'],
                nextToken: undefined,
            });
            vi.mocked(mockCcapiService.getResource).mockResolvedValue({
                TypeName: 'AWS::S3::Bucket',
                ResourceDescription: {
                    Identifier: 'bucket-2',
                    Properties: '{}',
                },
                $metadata: {},
            });

            await manager.listResources('AWS::S3::Bucket');
            const result = await manager.searchResourceByIdentifier('AWS::S3::Bucket', 'bucket-2');

            expect(result.found).toBe(true);
            expect(result.resourceList?.resourceIdentifiers).toEqual(['bucket-1', 'bucket-2']);
        });

        it('should not duplicate identifier if already in cache', async () => {
            vi.mocked(mockS3Service.listBuckets).mockResolvedValue({
                buckets: ['bucket-1'],
                nextToken: undefined,
            });
            vi.mocked(mockCcapiService.getResource).mockResolvedValue({
                TypeName: 'AWS::S3::Bucket',
                ResourceDescription: {
                    Identifier: 'bucket-1',
                    Properties: '{}',
                },
                $metadata: {},
            });

            await manager.listResources('AWS::S3::Bucket');
            const result = await manager.searchResourceByIdentifier('AWS::S3::Bucket', 'bucket-1');

            expect(result.found).toBe(true);
            expect(result.resourceList?.resourceIdentifiers).toEqual(['bucket-1']);
        });

        it('should create new cache entry when cache does not exist', async () => {
            vi.mocked(mockCcapiService.getResource).mockResolvedValue({
                TypeName: 'AWS::IAM::Role',
                ResourceDescription: {
                    Identifier: 'role-1',
                    Properties: '{}',
                },
                $metadata: {},
            });

            const result = await manager.searchResourceByIdentifier('AWS::IAM::Role', 'role-1');

            expect(result.found).toBe(true);
            expect(result.resourceList?.resourceIdentifiers).toEqual(['role-1']);
            expect(result.resourceList?.typeName).toBe('AWS::IAM::Role');
        });
    });

    describe('refreshResourceList()', () => {
        it('should refresh S3 buckets using S3Service', async () => {
            vi.mocked(mockS3Service.listBuckets).mockResolvedValue({
                buckets: ['bucket-1', 'bucket-2'],
                nextToken: undefined,
            });

            const result = await manager.refreshResourceList(['AWS::S3::Bucket']);

            expect(mockS3Service.listBuckets).toHaveBeenCalledOnce();
            expect(mockCcapiService.listResources).not.toHaveBeenCalled();
            expect(result.refreshFailed).toBe(false);
            expect(result.resources).toEqual([
                {
                    typeName: 'AWS::S3::Bucket',
                    resourceIdentifiers: ['bucket-1', 'bucket-2'],
                    nextToken: undefined,
                },
            ]);
        });

        it('should refresh non-S3 resources using CcapiService', async () => {
            vi.mocked(mockCcapiService.listResources).mockResolvedValue({
                ResourceDescriptions: [{ Identifier: 'role-1' }, { Identifier: 'role-2' }],
            });

            const result = await manager.refreshResourceList(['AWS::IAM::Role']);

            expect(mockCcapiService.listResources).toHaveBeenCalledOnce();
            expect(mockS3Service.listBuckets).not.toHaveBeenCalled();
            expect(result.refreshFailed).toBe(false);
            expect(result.resources).toEqual([
                {
                    typeName: 'AWS::IAM::Role',
                    resourceIdentifiers: ['role-1', 'role-2'],
                    nextToken: undefined,
                },
            ]);
        });

        it('should handle mixed resource types', async () => {
            vi.mocked(mockS3Service.listBuckets).mockResolvedValue({
                buckets: ['bucket-1'],
                nextToken: undefined,
            });
            vi.mocked(mockCcapiService.listResources).mockResolvedValue({
                ResourceDescriptions: [{ Identifier: 'role-1' }],
            });

            const result = await manager.refreshResourceList(['AWS::S3::Bucket', 'AWS::IAM::Role']);

            expect(mockS3Service.listBuckets).toHaveBeenCalledOnce();
            expect(mockCcapiService.listResources).toHaveBeenCalledOnce();
            expect(result.refreshFailed).toBe(false);
            expect(result.resources).toHaveLength(2);
        });

        it('should handle S3 service failure', async () => {
            vi.mocked(mockS3Service.listBuckets).mockRejectedValue(new Error('S3 error'));

            const result = await manager.refreshResourceList(['AWS::S3::Bucket']);

            expect(result.refreshFailed).toBe(true);
            expect(result.resources).toEqual([
                {
                    typeName: 'AWS::S3::Bucket',
                    resourceIdentifiers: [],
                    nextToken: undefined,
                },
            ]);
        });

        it('should return empty result for empty resource types', async () => {
            const result = await manager.refreshResourceList([]);

            expect(result.refreshFailed).toBe(false);
            expect(result.resources).toEqual([]);
            expect(mockS3Service.listBuckets).not.toHaveBeenCalled();
            expect(mockCcapiService.listResources).not.toHaveBeenCalled();
        });

        it('should return cached data when already refreshing', async () => {
            vi.mocked(mockS3Service.listBuckets).mockImplementation(
                () =>
                    new Promise((resolve) =>
                        setTimeout(() => resolve({ buckets: ['bucket-1'], nextToken: undefined }), 100),
                    ),
            );

            const firstCall = manager.refreshResourceList(['AWS::S3::Bucket']);
            const secondCall = manager.refreshResourceList(['AWS::S3::Bucket']);

            const [firstResult, secondResult] = await Promise.all([firstCall, secondCall]);

            expect(firstResult.refreshFailed).toBe(false);
            expect(secondResult.refreshFailed).toBe(false);
            expect(secondResult.resources[0].resourceIdentifiers).toEqual([]);
            expect(mockS3Service.listBuckets).toHaveBeenCalledOnce();
        });
    });

    describe('configure()', () => {
        it('should subscribe to settings changes', () => {
            const mockSettingsManager = {
                subscribe: vi.fn().mockReturnValue({ unsubscribe: vi.fn(), isActive: vi.fn() }),
                getCurrentSettings: vi.fn(),
            };

            manager.configure(mockSettingsManager);

            expect(mockSettingsManager.subscribe).toHaveBeenCalledWith('profile', expect.any(Function));
        });

        it('should unsubscribe from previous subscription when reconfiguring', () => {
            const mockUnsubscribe = vi.fn();
            const mockSettingsManager = {
                subscribe: vi.fn().mockReturnValue({ unsubscribe: mockUnsubscribe, isActive: vi.fn() }),
                getCurrentSettings: vi.fn(),
            };

            manager.configure(mockSettingsManager);
            manager.configure(mockSettingsManager);

            expect(mockUnsubscribe).toHaveBeenCalledOnce();
        });

        it('should clear cache when region changes', async () => {
            vi.mocked(mockS3Service.listBuckets).mockResolvedValue({
                buckets: ['bucket-1'],
                nextToken: undefined,
            });

            await manager.refreshResourceList(['AWS::S3::Bucket']);

            const mockSettingsManager = {
                subscribe: vi.fn((_, callback) => {
                    callback({ profile: 'default', region: 'us-west-2' });
                    return { unsubscribe: vi.fn(), isActive: vi.fn() };
                }),
                getCurrentSettings: vi.fn(),
            };

            manager.configure(mockSettingsManager);

            vi.mocked(mockS3Service.listBuckets).mockResolvedValue({
                buckets: ['bucket-2'],
                nextToken: undefined,
            });

            const result = await manager.refreshResourceList(['AWS::S3::Bucket']);

            expect(result.resources[0].resourceIdentifiers).toEqual(['bucket-2']);
        });
    });

    describe('close()', () => {
        it('should unsubscribe from settings when closed', () => {
            const mockUnsubscribe = vi.fn();
            const mockSettingsManager = {
                subscribe: vi.fn().mockReturnValue({ unsubscribe: mockUnsubscribe, isActive: vi.fn() }),
                getCurrentSettings: vi.fn(),
            };

            manager.configure(mockSettingsManager);
            manager.close();

            expect(mockUnsubscribe).toHaveBeenCalledOnce();
        });

        it('should handle close when not configured', () => {
            expect(() => manager.close()).not.toThrow();
        });
    });

    describe('getResourceTypes()', () => {
        it('should filter out resource types without list support', () => {
            const mockSchemas: CombinedSchemas = {
                schemas: new Map([
                    ['AWS::S3::Bucket', {}],
                    ['AWS::IAM::Role', {}],
                    ['AWS::IAM::RolePolicy', {}],
                ]),
            } as CombinedSchemas;
            const managerWithSchemas = new ResourceStateManager(
                mockCcapiService,
                createMockSchemaRetriever(mockSchemas),
                mockS3Service,
            );

            const result = managerWithSchemas.getResourceTypes();

            expect(result).toContain('AWS::S3::Bucket');
            expect(result).toContain('AWS::IAM::Role');
            expect(result).not.toContain('AWS::IAM::RolePolicy');
        });

        it('should filter out resource types requiring resource model properties', () => {
            const mockSchemas: CombinedSchemas = {
                schemas: new Map([
                    ['AWS::S3::Bucket', {}],
                    ['AWS::EKS::Cluster', {}],
                    ['AWS::EKS::AddOn', {}],
                ]),
            } as CombinedSchemas;
            const managerWithSchemas = new ResourceStateManager(
                mockCcapiService,
                createMockSchemaRetriever(mockSchemas),
                mockS3Service,
            );

            const result = managerWithSchemas.getResourceTypes();

            expect(result).toContain('AWS::S3::Bucket');
            expect(result).toContain('AWS::EKS::Cluster');
            expect(result).not.toContain('AWS::EKS::AddOn');
        });
    });
});
