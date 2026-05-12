import { describe, it, expect } from 'vitest';
import { hasSuppressFault, markSuppressFault } from '../../../src/utils/FaultSuppression';

describe('FaultSuppression', () => {
    describe('markSuppressFault', () => {
        it('should tag the error with suppressFault', () => {
            const error = new Error('test');
            markSuppressFault(error);
            expect((error as any).suppressFault).toBe(true);
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
});
