import { GetResourceCommandOutput, ResourceNotFoundException } from '@aws-sdk/client-cloudcontrol';
import { DateTime } from 'luxon';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ResourceStateManager } from '../../../src/resourceState/ResourceStateManager';
import { CombinedSchemas } from '../../../src/schema/CombinedSchemas';
import { CcapiService } from '../../../src/services/CcapiService';
import { createMockSchemaRetriever } from '../../utils/MockServerComponents';

describe('ResourceStateManager', () => {
    const mockCcapiService = {
        getResource: vi.fn(),
    } as unknown as CcapiService;

    let manager: ResourceStateManager;

    beforeEach(() => {
        vi.clearAllMocks();
        manager = new ResourceStateManager(mockCcapiService, createMockSchemaRetriever());
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
            );

            const result = managerWithSchemas.getResourceTypes();

            expect(result).toContain('AWS::S3::Bucket');
            expect(result).toContain('AWS::EKS::Cluster');
            expect(result).not.toContain('AWS::EKS::AddOn');
        });
    });
});
