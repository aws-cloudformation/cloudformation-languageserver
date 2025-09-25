import { describe, it, expect } from 'vitest';
import { toNumber, toNumberList, pointToPosition } from '../../../src/utils/TypeConverters';

describe('TypeConverters', () => {
    describe('toNumber', () => {
        it('should convert string to number', () => {
            expect(toNumber('123')).toBe(123);
            expect(toNumber('123.45')).toBe(123.45);
        });

        it('should return NaN for undefined, null, object, or function', () => {
            expect(Number.isNaN(toNumber(null))).toBe(true);
            expect(Number.isNaN(toNumber({}))).toBe(true);
            expect(Number.isNaN(toNumber(() => {}))).toBe(true);
        });
    });

    describe('toNumberList', () => {
        it('should convert array of values to array of numbers', () => {
            expect(toNumberList(['1', '2', '3'])).toEqual([1, 2, 3]);
            expect(toNumberList(['1.1', '2.2', '3.3'])).toEqual([1.1, 2.2, 3.3]);
        });
    });

    describe('pointToPosition', () => {
        it('should convert tree-sitter Point to LSP Position', () => {
            const point = { row: 5, column: 10 };
            const position = pointToPosition(point);

            expect(position).toEqual({
                line: 5,
                character: 10,
            });
        });

        it('should handle zero values correctly', () => {
            const point = { row: 0, column: 0 };
            const position = pointToPosition(point);

            expect(position).toEqual({
                line: 0,
                character: 0,
            });
        });
    });
});
