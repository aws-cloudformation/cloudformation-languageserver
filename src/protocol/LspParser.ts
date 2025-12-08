import { z } from 'zod';
import { NonEmptyZodString } from '../utils/ZodModel';
import { Identifiable } from './LspTypes';

const IdentifiableSchema = z.object({
    id: NonEmptyZodString,
});

export function parseIdentifiable(input: unknown): Identifiable {
    return IdentifiableSchema.parse(input);
}
