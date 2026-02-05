import { describe, it, expect } from 'vitest';
import { validatePositiveOrUndefined } from '../../../src/utils/Number';

describe('validatePositiveOrUndefined', () => {
    it('should return positive numbers', () => {
        expect(validatePositiveOrUndefined(1)).toBe(1);
        expect(validatePositiveOrUndefined(0.5)).toBe(0.5);
    });

    it('should return undefined for zero or negative', () => {
        expect(validatePositiveOrUndefined(0)).toBeUndefined();
        expect(validatePositiveOrUndefined(-1)).toBeUndefined();
    });

    it('should return undefined for NaN and Infinity', () => {
        expect(validatePositiveOrUndefined(Number.NaN)).toBeUndefined();
        expect(validatePositiveOrUndefined(Infinity)).toBeUndefined();
        expect(validatePositiveOrUndefined(-Infinity)).toBeUndefined();
    });

    it('should return undefined for non-numbers', () => {
        expect(validatePositiveOrUndefined('5')).toBeUndefined();
        expect(validatePositiveOrUndefined(null)).toBeUndefined();
        expect(validatePositiveOrUndefined(undefined)).toBeUndefined();
    });
});
