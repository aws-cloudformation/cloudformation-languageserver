import { describe, it, expect } from 'vitest';
import {
    hasSuppressFault,
    markIfClientError,
    markSuppressFault,
    SUPPRESS_FAULT,
} from '../../../../src/utils/errors/FaultSuppression';

describe('FaultSuppression', () => {
    describe('markSuppressFault', () => {
        it('should tag the error with suppressFault', () => {
            const error = new Error('test');
            markSuppressFault(error);
            expect((error as any)[SUPPRESS_FAULT]).toBe(true);
        });

        it('should preserve the error type', () => {
            class CustomError extends Error {
                code = 'CUSTOM';
            }
            const error = new CustomError('test');
            markSuppressFault(error);
            expect(error).toBeInstanceOf(CustomError);
            expect(error.code).toBe('CUSTOM');
        });

        it('is a no-op for null', () => {
            expect(() => markSuppressFault(null)).not.toThrow();
        });

        it('is a no-op for non-object values', () => {
            expect(() => markSuppressFault('string')).not.toThrow();
            expect(() => markSuppressFault(42)).not.toThrow();
            expect(() => markSuppressFault(undefined)).not.toThrow();
        });
    });

    describe('hasSuppressFault', () => {
        it('should return true for tagged errors', () => {
            const error = new Error('test');
            markSuppressFault(error);
            expect(hasSuppressFault(error)).toBe(true);
        });

        it('should return false for untagged errors', () => {
            expect(hasSuppressFault(new Error('test'))).toBe(false);
        });

        it('should return false for null', () => {
            expect(hasSuppressFault(null)).toBe(false);
        });

        it('should return false for undefined', () => {
            expect(hasSuppressFault(undefined)).toBe(false);
        });

        it('should return false for non-object values', () => {
            expect(hasSuppressFault('string error')).toBe(false);
        });
    });

    describe('markIfClientError', () => {
        it('marks AWS credentials errors (ExpiredTokenException)', () => {
            const error = Object.assign(new Error('expired'), { name: 'ExpiredTokenException' });
            markIfClientError(error);
            expect(hasSuppressFault(error)).toBe(true);
        });

        it('marks AWS networking errors (NetworkingError)', () => {
            const error = Object.assign(new Error('connect failed'), { name: 'NetworkingError' });
            markIfClientError(error);
            expect(hasSuppressFault(error)).toBe(true);
        });

        it('marks AWS permission errors (AccessDeniedException)', () => {
            const error = Object.assign(new Error('not authorized'), {
                name: 'AccessDeniedException',
                $metadata: { httpStatusCode: 403 },
            });
            markIfClientError(error);
            expect(hasSuppressFault(error)).toBe(true);
        });

        it('marks AWS 4xx service errors', () => {
            const error = Object.assign(new Error('not found'), {
                name: 'ResourceNotFoundException',
                $metadata: { httpStatusCode: 404 },
            });
            markIfClientError(error);
            expect(hasSuppressFault(error)).toBe(true);
        });

        it('does not mark AWS throttling errors (429), which are retryable, not client mistakes', () => {
            const error = Object.assign(new Error('rate exceeded'), {
                name: 'ThrottlingException',
                $metadata: { httpStatusCode: 429 },
            });
            markIfClientError(error);
            expect(hasSuppressFault(error)).toBe(false);
        });

        it('marks client-side network errors detected via isClientNetworkError (ECONNRESET)', () => {
            const error = Object.assign(new Error('read ECONNRESET'), { code: 'ECONNRESET' });
            markIfClientError(error);
            expect(hasSuppressFault(error)).toBe(true);
        });

        it('marks SSL certificate errors', () => {
            const error = new Error('unable to get local issuer certificate');
            markIfClientError(error);
            expect(hasSuppressFault(error)).toBe(true);
        });

        it('does not mark AWS 5xx service errors', () => {
            const error = Object.assign(new Error('boom'), {
                name: 'InternalServerError',
                $metadata: { httpStatusCode: 500 },
            });
            markIfClientError(error);
            expect(hasSuppressFault(error)).toBe(false);
        });

        it('does not mark errors with no AWS metadata and no client-network signature', () => {
            const error = new Error('some unrelated bug');
            markIfClientError(error);
            expect(hasSuppressFault(error)).toBe(false);
        });

        it('is a no-op for null', () => {
            expect(() => markIfClientError(null)).not.toThrow();
        });

        it('is a no-op for primitive values', () => {
            expect(() => markIfClientError('ECONNRESET')).not.toThrow();
            expect(() => markIfClientError(undefined)).not.toThrow();
            expect(() => markIfClientError(42)).not.toThrow();
        });
    });
});
