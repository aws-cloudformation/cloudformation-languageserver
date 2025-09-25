import { describe, it, expect } from 'vitest';
import { Parameter } from '../../../../src/context/semantic/Entity';
import { ParameterType } from '../../../../src/context/semantic/parameter/ParameterType';

describe('Entity', () => {
    describe('Parameter.from', () => {
        it('should create parameter with valid data', () => {
            const data = {
                Type: ParameterType.String,
                Default: 'test-value',
                Description: 'A test parameter',
                AllowedValues: ['test-value', 'other-value'],
            };

            const parameter = Parameter.from('TestParam', data);

            expect(parameter.name).toBe('TestParam');
            expect(parameter.Type).toBe(ParameterType.String);
            expect(parameter.Default).toBe('test-value');
            expect(parameter.Description).toBe('A test parameter');
            expect(parameter.AllowedValues).toEqual(['test-value', 'other-value']);
        });

        it('should handle null object gracefully', () => {
            const parameter = Parameter.from('TestParam', null as any);

            expect(parameter.name).toBe('TestParam');
            expect(parameter.Type).toBeUndefined();
            expect(parameter.Default).toBeUndefined();
            expect(parameter.Description).toBeUndefined();
            expect(parameter.AllowedValues).toBeUndefined();
            expect(parameter.AllowedPattern).toBeUndefined();
            expect(parameter.ConstraintDescription).toBeUndefined();
        });

        it('should handle undefined object gracefully', () => {
            const parameter = Parameter.from('TestParam', undefined as any);

            expect(parameter.name).toBe('TestParam');
            expect(parameter.Type).toBeUndefined();
            expect(parameter.Default).toBeUndefined();
            expect(parameter.Description).toBeUndefined();
            expect(parameter.AllowedValues).toBeUndefined();
        });

        it('should handle empty object', () => {
            const parameter = Parameter.from('TestParam', {});

            expect(parameter.name).toBe('TestParam');
            expect(parameter.Type).toBeUndefined();
            expect(parameter.Default).toBeUndefined();
            expect(parameter.Description).toBeUndefined();
            expect(parameter.AllowedValues).toBeUndefined();
        });

        it('should handle object with some undefined properties', () => {
            const data = {
                Type: ParameterType.String,
                Description: undefined,
                Default: 'test-value',
                AllowedValues: undefined,
            };

            const parameter = Parameter.from('TestParam', data);

            expect(parameter.name).toBe('TestParam');
            expect(parameter.Type).toBe(ParameterType.String);
            expect(parameter.Default).toBe('test-value');
            expect(parameter.Description).toBeUndefined();
            expect(parameter.AllowedValues).toBeUndefined();
        });

        it('should handle numeric properties correctly', () => {
            const data = {
                Type: ParameterType.Number,
                MinValue: 1,
                MaxValue: 100,
                MinLength: 5,
                MaxLength: 50,
            };

            const parameter = Parameter.from('TestParam', data);

            expect(parameter.name).toBe('TestParam');
            expect(parameter.Type).toBe(ParameterType.Number);
            expect(parameter.MinValue).toBe(1);
            expect(parameter.MaxValue).toBe(100);
            expect(parameter.MinLength).toBe(5);
            expect(parameter.MaxLength).toBe(50);
        });

        it('should handle NoEcho boolean property', () => {
            const data = {
                Type: ParameterType.String,
                NoEcho: true,
            };

            const parameter = Parameter.from('TestParam', data);

            expect(parameter.name).toBe('TestParam');
            expect(parameter.NoEcho).toBe(true);
        });
    });
});
