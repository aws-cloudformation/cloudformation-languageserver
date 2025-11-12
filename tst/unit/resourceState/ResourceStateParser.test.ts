import { describe, it, expect } from 'vitest';
import { z } from 'zod';
import { parseResourceTypeName } from '../../../src/resourceState/ResourceStateParser';

describe('ResourceStateParser', () => {
    describe('parseResourceTypeName', () => {
        it('should parse valid resource type name', () => {
            const result = parseResourceTypeName('AWS::S3::Bucket');
            expect(result).toBe('AWS::S3::Bucket');
        });

        it('should throw error for empty string', () => {
            expect(() => parseResourceTypeName('')).toThrow(z.ZodError);
        });

        it('should throw error for non-string input', () => {
            expect(() => parseResourceTypeName(123)).toThrow(z.ZodError);
            expect(() => parseResourceTypeName(null)).toThrow(z.ZodError);
            expect(() => parseResourceTypeName(undefined)).toThrow(z.ZodError);
        });
    });
});
