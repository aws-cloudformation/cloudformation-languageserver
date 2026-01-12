import { describe, it, expect } from 'vitest';
import { coerceParameterToTypedValues, ParameterType } from '../../../../src/context/semantic/ParameterType';

describe('ParameterType', () => {
    describe('coerceParameterToTypedValues', () => {
        it('should handle empty object', () => {
            const result = coerceParameterToTypedValues({});

            expect(result).toEqual({
                Default: undefined,
                AllowedValues: undefined,
            });
        });

        it('should handle string parameters correctly', () => {
            const data = {
                Type: ParameterType.String,
                Default: 'test-value',
                AllowedValues: ['value1', 'value2'],
            };

            const result = coerceParameterToTypedValues(data);

            expect(result.Default).toBe('test-value');
            expect(result.AllowedValues).toEqual(['value1', 'value2']);
        });

        it('should handle number parameters correctly', () => {
            const data = {
                Type: ParameterType.Number,
                Default: '42',
                AllowedValues: ['1', '2', '42'],
            };

            const result = coerceParameterToTypedValues(data);

            expect(result.Default).toBe(42);
            expect(result.AllowedValues).toEqual([1, 2, 42]);
        });

        it('should handle boolean parameters correctly', () => {
            const data = {
                Type: ParameterType.String,
                Default: 'true',
                AllowedValues: ['true', 'false'],
            };

            const result = coerceParameterToTypedValues(data);

            expect(result.Default).toBe(true);
            expect(result.AllowedValues).toEqual([true, false]);
        });

        it('should handle parameters without Default value', () => {
            const data = {
                Type: ParameterType.String,
                AllowedValues: ['value1', 'value2'],
            };

            const result = coerceParameterToTypedValues(data);

            expect(result.Default).toBeUndefined();
            expect(result.AllowedValues).toEqual(['value1', 'value2']);
        });

        it('should handle parameters without AllowedValues', () => {
            const data = {
                Type: ParameterType.String,
                Default: 'test-value',
            };

            const result = coerceParameterToTypedValues(data);

            expect(result.Default).toBe('test-value');
            expect(result.AllowedValues).toBeUndefined();
        });

        it('should handle parameters without Type', () => {
            const data = {
                Default: 'test-value',
                AllowedValues: ['value1', 'value2'],
            };

            const result = coerceParameterToTypedValues(data);

            expect(result.Default).toBe('test-value');
            expect(result.AllowedValues).toEqual(['value1', 'value2']);
        });

        it('should handle List<Number> type correctly', () => {
            const data = {
                Type: ParameterType.List_Number,
                Default: 42, // Single number for Default
                AllowedValues: [1, 2, 3], // Array of numbers for AllowedValues
            };

            const result = coerceParameterToTypedValues(data);

            expect(result.Default).toBe(42);
            expect(result.AllowedValues).toEqual([1, 2, 3]);
        });
    });
});
