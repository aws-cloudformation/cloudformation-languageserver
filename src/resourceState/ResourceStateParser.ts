import { z } from 'zod';

const ResourceTypeNameSchema = z.string().min(1);

export function parseResourceTypeName(input: unknown): string {
    return ResourceTypeNameSchema.parse(input);
}
