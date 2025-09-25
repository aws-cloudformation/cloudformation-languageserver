import { describe, it, expect } from 'vitest';
import { ZodError } from 'zod';
import { parseIdentifiable } from '../../../src/protocol/LspParser';

describe('LspParser', () => {
    describe('parseIdentifiable', () => {
        it('should parse valid identifiable object', () => {
            const input = {
                id: 'test-id',
            };

            const result = parseIdentifiable(input);

            expect(result).toEqual({
                id: 'test-id',
            });
        });

        it('should throw ZodError for empty id', () => {
            const input = {
                id: '',
            };

            expect(() => parseIdentifiable(input)).toThrow(ZodError);
        });

        it('should throw ZodError for missing id', () => {
            const input = {};

            expect(() => parseIdentifiable(input)).toThrow(ZodError);
        });

        it('should throw ZodError for null input', () => {
            expect(() => parseIdentifiable(null)).toThrow(ZodError);
        });

        it('should throw ZodError for undefined input', () => {
            expect(() => parseIdentifiable(undefined)).toThrow(ZodError);
        });
    });
});
