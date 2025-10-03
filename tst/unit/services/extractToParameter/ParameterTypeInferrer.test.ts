import { describe, it, expect, beforeEach } from 'vitest';
import { LiteralValueType, ParameterType } from '../../../../src/services/extractToParameter/ExtractToParameterTypes';
import { ParameterTypeInferrer } from '../../../../src/services/extractToParameter/ParameterTypeInferrer';

describe('ParameterTypeInferrer', () => {
    let inferrer: ParameterTypeInferrer;

    beforeEach(() => {
        inferrer = new ParameterTypeInferrer();
    });

    describe('type mapping', () => {
        it('should map string literals to String parameter type', () => {
            const result = inferrer.inferParameterType(LiteralValueType.STRING, 'hello world');

            expect(result.Type).toBe(ParameterType.STRING);
            expect(result.Default).toBe('hello world');
            expect(result.Description).toBe('');
            expect(result.AllowedValues).toBeUndefined();
        });

        it('should map number literals to Number parameter type', () => {
            const result = inferrer.inferParameterType(LiteralValueType.NUMBER, 42);

            expect(result.Type).toBe(ParameterType.NUMBER);
            expect(result.Default).toBe(42);
            expect(result.Description).toBe('');
            expect(result.AllowedValues).toBeUndefined();
        });

        it('should map boolean literals to String parameter type with AllowedValues', () => {
            const result = inferrer.inferParameterType(LiteralValueType.BOOLEAN, true);

            expect(result.Type).toBe(ParameterType.STRING);
            expect(result.Default).toBe('true');
            expect(result.Description).toBe('');
            expect(result.AllowedValues).toEqual(['true', 'false']);
        });

        it('should map array literals to CommaDelimitedList parameter type', () => {
            const result = inferrer.inferParameterType(LiteralValueType.ARRAY, ['item1', 'item2']);

            expect(result.Type).toBe(ParameterType.COMMA_DELIMITED_LIST);
            expect(result.Default).toBe('item1,item2');
            expect(result.Description).toBe('');
            expect(result.AllowedValues).toBeUndefined();
        });
    });

    describe('edge cases', () => {
        it('should handle empty string literals', () => {
            const result = inferrer.inferParameterType(LiteralValueType.STRING, '');

            expect(result.Type).toBe(ParameterType.STRING);
            expect(result.Default).toBe('');
            expect(result.Description).toBe('');
        });

        it('should handle zero number literals', () => {
            const result = inferrer.inferParameterType(LiteralValueType.NUMBER, 0);

            expect(result.Type).toBe(ParameterType.NUMBER);
            expect(result.Default).toBe(0);
        });

        it('should handle negative number literals', () => {
            const result = inferrer.inferParameterType(LiteralValueType.NUMBER, -42);

            expect(result.Type).toBe(ParameterType.NUMBER);
            expect(result.Default).toBe(-42);
        });

        it('should handle decimal number literals', () => {
            const result = inferrer.inferParameterType(LiteralValueType.NUMBER, 3.14);

            expect(result.Type).toBe(ParameterType.NUMBER);
            expect(result.Default).toBe(3.14);
        });

        it('should handle false boolean literals', () => {
            const result = inferrer.inferParameterType(LiteralValueType.BOOLEAN, false);

            expect(result.Type).toBe(ParameterType.STRING);
            expect(result.Default).toBe('false');
            expect(result.AllowedValues).toEqual(['true', 'false']);
        });

        it('should handle empty array literals', () => {
            const result = inferrer.inferParameterType(LiteralValueType.ARRAY, []);

            expect(result.Type).toBe(ParameterType.COMMA_DELIMITED_LIST);
            expect(result.Default).toBe('');
        });

        it('should handle single-item array literals', () => {
            const result = inferrer.inferParameterType(LiteralValueType.ARRAY, ['single-item']);

            expect(result.Type).toBe(ParameterType.COMMA_DELIMITED_LIST);
            expect(result.Default).toBe('single-item');
        });

        it('should handle array literals with mixed types', () => {
            const result = inferrer.inferParameterType(LiteralValueType.ARRAY, ['string', 42, true]);

            expect(result.Type).toBe(ParameterType.COMMA_DELIMITED_LIST);
            expect(result.Default).toBe('string,42,true');
        });

        it('should handle array literals with special characters', () => {
            const result = inferrer.inferParameterType(LiteralValueType.ARRAY, [
                'item,with,commas',
                'item with spaces',
            ]);

            expect(result.Type).toBe(ParameterType.COMMA_DELIMITED_LIST);
            expect(result.Default).toBe('item,with,commas,item with spaces');
        });
    });

    describe('default behavior', () => {
        it('should always set Description to empty string', () => {
            const stringResult = inferrer.inferParameterType(LiteralValueType.STRING, 'test');
            const numberResult = inferrer.inferParameterType(LiteralValueType.NUMBER, 123);
            const booleanResult = inferrer.inferParameterType(LiteralValueType.BOOLEAN, true);
            const arrayResult = inferrer.inferParameterType(LiteralValueType.ARRAY, ['test']);

            expect(stringResult.Description).toBe('');
            expect(numberResult.Description).toBe('');
            expect(booleanResult.Description).toBe('');
            expect(arrayResult.Description).toBe('');
        });

        it('should only set AllowedValues for boolean types', () => {
            const stringResult = inferrer.inferParameterType(LiteralValueType.STRING, 'test');
            const numberResult = inferrer.inferParameterType(LiteralValueType.NUMBER, 123);
            const arrayResult = inferrer.inferParameterType(LiteralValueType.ARRAY, ['test']);

            expect(stringResult.AllowedValues).toBeUndefined();
            expect(numberResult.AllowedValues).toBeUndefined();
            expect(arrayResult.AllowedValues).toBeUndefined();
        });

        it('should preserve original value types in defaults where appropriate', () => {
            const numberResult = inferrer.inferParameterType(LiteralValueType.NUMBER, 42);

            expect(typeof numberResult.Default).toBe('number');
            expect(numberResult.Default).toBe(42);
        });

        it('should convert boolean values to string defaults', () => {
            const trueResult = inferrer.inferParameterType(LiteralValueType.BOOLEAN, true);
            const falseResult = inferrer.inferParameterType(LiteralValueType.BOOLEAN, false);

            expect(typeof trueResult.Default).toBe('string');
            expect(typeof falseResult.Default).toBe('string');
            expect(trueResult.Default).toBe('true');
            expect(falseResult.Default).toBe('false');
        });

        it('should convert array values to comma-delimited string defaults', () => {
            const arrayResult = inferrer.inferParameterType(LiteralValueType.ARRAY, ['a', 'b', 'c']);

            expect(typeof arrayResult.Default).toBe('string');
            expect(arrayResult.Default).toBe('a,b,c');
        });
    });
});
