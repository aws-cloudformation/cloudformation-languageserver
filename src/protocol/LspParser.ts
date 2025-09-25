import { z } from 'zod';
import { Identifiable } from './LspTypes';

const IdentifiableSchema = z.object({
    id: z.string().min(1),
});

export function parseIdentifiable(input: unknown): Identifiable {
    return IdentifiableSchema.parse(input);
}
