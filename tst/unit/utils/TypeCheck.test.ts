import { describe, it, expect } from 'vitest';
import { typeOf } from '../../../src/utils/TypeCheck';

describe('TypeCheck', () => {
    describe('typeOf', () => {
        it('should identify undefined', () => {
            expect(typeOf(undefined)).toEqual({ type: 'undefined' });
        });

        it('should identify null', () => {
            expect(typeOf(null)).toEqual({ type: 'null' });
        });

        it('should identify boolean', () => {
            expect(typeOf(true)).toEqual({ type: 'boolean' });
            expect(typeOf(false)).toEqual({ type: 'boolean' });
        });

        it('should identify string', () => {
            expect(typeOf('')).toEqual({ type: 'string' });
            expect(typeOf('hello')).toEqual({ type: 'string' });
        });

        it('should identify bigint', () => {
            expect(typeOf(BigInt(123))).toEqual({ type: 'bigint' });
            expect(typeOf(123n)).toEqual({ type: 'bigint' });
        });

        it('should identify number', () => {
            expect(typeOf(0)).toEqual({ type: 'number' });
            expect(typeOf(123)).toEqual({ type: 'number' });
            expect(typeOf(-456)).toEqual({ type: 'number' });
            expect(typeOf(3.14)).toEqual({ type: 'number' });
            expect(typeOf(Number.NaN)).toEqual({ type: 'number' });
            expect(typeOf(Infinity)).toEqual({ type: 'number' });
        });

        it('should identify symbol', () => {
            expect(typeOf(Symbol())).toEqual({ type: 'symbol' });
            expect(typeOf(Symbol('test'))).toEqual({ type: 'symbol' });
        });

        it('should identify function', () => {
            expect(typeOf(() => {})).toEqual({ type: 'function' });
            expect(typeOf(function () {})).toEqual({ type: 'function' });
            expect(typeOf(Math.max)).toEqual({ type: 'function' });
        });

        it('should identify array with size', () => {
            expect(typeOf([])).toEqual({ type: 'array', size: 0 });
            expect(typeOf([1, 2, 3])).toEqual({ type: 'array', size: 3 });
            expect(typeOf(['a', 'b'])).toEqual({ type: 'array', size: 2 });
        });

        it('should identify object', () => {
            expect(typeOf({})).toEqual({ type: 'object' });
            expect(typeOf({ key: 'value' })).toEqual({ type: 'object' });
            expect(typeOf(new Date())).toEqual({ type: 'object' });
            expect(typeOf(/regex/)).toEqual({ type: 'object' });
        });
    });
});
