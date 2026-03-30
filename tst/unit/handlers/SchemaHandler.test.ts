import { describe, it, expect, beforeEach } from 'vitest';
import { CancellationToken, ResponseError } from 'vscode-languageserver';
import { schemaReadinessHandler } from '../../../src/handlers/SchemaHandler';
import { RegionalSchemasType } from '../../../src/schema/RegionalSchemas';
import { SchemaReadinessRequest } from '../../../src/schema/SchemaRequestType';
import { AwsRegion } from '../../../src/utils/Region';
import { createMockComponents } from '../../utils/MockServerComponents';

describe('SchemaReadinessHandler', () => {
    let mockComponents: ReturnType<typeof createMockComponents>;

    beforeEach(() => {
        mockComponents = createMockComponents();
    });

    describe('schemaReadinessHandler', () => {
        it('should return schemasReady true when schemas exist', async () => {
            const region = AwsRegion.US_EAST_1;
            const mockSchemas: RegionalSchemasType = {
                version: 'v1',
                region,
                schemas: [{ name: 'test-schema', content: '{}', createdMs: Date.now() }],
                firstCreatedMs: Date.now(),
                lastModifiedMs: Date.now(),
            };
            mockComponents.schemaStore.getPublicSchemas.returns(mockSchemas);

            const handler = schemaReadinessHandler(mockComponents);
            const request: SchemaReadinessRequest = { region };

            const result = await handler(request, CancellationToken.None);

            expect(result).toEqual({
                region,
                schemasReady: true,
            });
            expect(mockComponents.schemaStore.getPublicSchemas.calledWith(region)).toBe(true);
        });

        it('should return schemasReady false when schemas are undefined', async () => {
            const region = AwsRegion.US_WEST_2;
            mockComponents.schemaStore.getPublicSchemas.returns(undefined);

            const handler = schemaReadinessHandler(mockComponents);
            const request: SchemaReadinessRequest = { region };

            const result = await handler(request, CancellationToken.None);

            expect(result).toEqual({
                region,
                schemasReady: false,
            });
        });

        it('should return schemasReady false when schemas array is empty', async () => {
            const region = AwsRegion.EU_WEST_1;
            const mockSchemas: RegionalSchemasType = {
                version: 'v1',
                region,
                schemas: [],
                firstCreatedMs: Date.now(),
                lastModifiedMs: Date.now(),
            };
            mockComponents.schemaStore.getPublicSchemas.returns(mockSchemas);

            const handler = schemaReadinessHandler(mockComponents);
            const request: SchemaReadinessRequest = { region };

            const result = await handler(request, CancellationToken.None);

            expect(result).toEqual({
                region,
                schemasReady: false,
            });
        });

        it('should handle errors gracefully', async () => {
            const region = AwsRegion.US_EAST_1;
            mockComponents.schemaStore.getPublicSchemas.throws(new Error('Database error'));

            const handler = schemaReadinessHandler(mockComponents);
            const request: SchemaReadinessRequest = { region };

            await expect(handler(request, CancellationToken.None)).rejects.toThrow(ResponseError);
            await expect(handler(request, CancellationToken.None)).rejects.toThrow(
                'Failed to check schema readiness: Database error',
            );
        });
    });
});
