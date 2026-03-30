import { z } from 'zod';
import { AwsRegion } from '../utils/Region';
import { GetSchemaReadinessRequest } from './SchemaRequestType';

const SchemaReadinessRequestSchema = z.object({
    region: z.enum(Object.values(AwsRegion) as [AwsRegion, ...AwsRegion[]]),
});

export function parseSchemaReadinessRequest(input: unknown): GetSchemaReadinessRequest {
    return SchemaReadinessRequestSchema.parse(input);
}
