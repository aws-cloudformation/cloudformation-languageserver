import { describe, it, expect } from 'vitest';
import { ZodError } from 'zod';
import { parseUploadFileParams } from '../../../src/s3/S3RequestParser';

describe('S3RequestParser', () => {
    describe('parseUploadFileParams', () => {
        it('should parse valid upload file params', () => {
            const input = {
                localFilePath: '/path/to/file.txt',
                s3Url: 's3://bucket/key.txt',
            };

            const result = parseUploadFileParams(input);

            expect(result).toEqual({
                localFilePath: '/path/to/file.txt',
                s3Url: 's3://bucket/key.txt',
            });
        });

        it('should throw ZodError for empty localFilePath', () => {
            const input = {
                localFilePath: '',
                s3Url: 's3://bucket/key.txt',
            };

            expect(() => parseUploadFileParams(input)).toThrow(ZodError);
        });

        it('should throw ZodError for empty s3Url', () => {
            const input = {
                localFilePath: '/path/to/file.txt',
                s3Url: '',
            };

            expect(() => parseUploadFileParams(input)).toThrow(ZodError);
        });

        it('should throw ZodError for missing localFilePath', () => {
            const input = {
                s3Url: 's3://bucket/key.txt',
            };

            expect(() => parseUploadFileParams(input)).toThrow(ZodError);
        });

        it('should throw ZodError for missing s3Url', () => {
            const input = {
                localFilePath: '/path/to/file.txt',
            };

            expect(() => parseUploadFileParams(input)).toThrow(ZodError);
        });

        it('should throw ZodError for null input', () => {
            expect(() => parseUploadFileParams(null)).toThrow(ZodError);
        });

        it('should throw ZodError for undefined input', () => {
            expect(() => parseUploadFileParams(undefined)).toThrow(ZodError);
        });
    });
});
