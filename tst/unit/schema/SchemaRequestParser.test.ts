import { describe, it, expect } from 'vitest';
import { ZodError } from 'zod';
import { parseSchemaReadinessRequest } from '../../../src/schema/SchemaRequestParser';

describe('SchemaRequestParser', () => {
    describe('parseSchemaReadinessRequest', () => {
        it('should parse valid schema readiness request', () => {
            const input = {
                region: 'us-east-1',
            };

            const result = parseSchemaReadinessRequest(input);

            expect(result).toEqual({
                region: 'us-east-1',
            });
        });

        it('should throw ZodError for missing region', () => {
            const input = {};

            expect(() => parseSchemaReadinessRequest(input)).toThrow(ZodError);
        });

        it('should throw ZodError for null input', () => {
            expect(() => parseSchemaReadinessRequest(null)).toThrow(ZodError);
        });

        it('should throw ZodError for undefined input', () => {
            expect(() => parseSchemaReadinessRequest(undefined)).toThrow(ZodError);
        });
    });
});
