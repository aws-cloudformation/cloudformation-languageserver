import { NonEmptyZodString } from '../utils/ZodModel';

const ResourceTypeNameSchema = NonEmptyZodString;

export function parseResourceTypeName(input: unknown): string {
    return ResourceTypeNameSchema.parse(input);
}
