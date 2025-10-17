import { describe, it, expect, beforeEach } from 'vitest';
import { ParameterNameGenerator } from '../../../../src/services/extractToParameter/ParameterNameGenerator';

describe('ParameterNameGenerator', () => {
    let generator: ParameterNameGenerator;

    beforeEach(() => {
        generator = new ParameterNameGenerator();
    });

    describe('context-based name generation', () => {
        it('should generate names based on property context', () => {
            const existingNames = new Set<string>();

            const result = generator.generateParameterName({
                propertyName: 'InstanceType',
                resourceName: undefined,
                existingNames,
                fallbackPrefix: 'Parameter',
            });

            expect(result).toBe('InstanceTypeParameter');
        });

        it('should generate names based on resource and property context', () => {
            const existingNames = new Set<string>();

            const result = generator.generateParameterName({
                propertyName: 'InstanceType',
                resourceName: 'MyEC2Instance',
                existingNames,
                fallbackPrefix: 'Parameter',
            });

            expect(result).toBe('MyEC2InstanceInstanceType');
        });

        it('should handle camelCase property names', () => {
            const existingNames = new Set<string>();

            const result = generator.generateParameterName({
                propertyName: 'availabilityZone',
                resourceName: undefined,
                existingNames,
                fallbackPrefix: 'Parameter',
            });

            expect(result).toBe('AvailabilityZoneParameter');
        });

        it('should handle kebab-case property names', () => {
            const existingNames = new Set<string>();

            const result = generator.generateParameterName({
                propertyName: 'instance-type',
                resourceName: undefined,
                existingNames,
                fallbackPrefix: 'Parameter',
            });

            expect(result).toBe('InstanceTypeParameter');
        });

        it('should handle snake_case property names', () => {
            const existingNames = new Set<string>();

            const result = generator.generateParameterName({
                propertyName: 'instance_type',
                resourceName: undefined,
                existingNames,
                fallbackPrefix: 'Parameter',
            });

            expect(result).toBe('InstanceTypeParameter');
        });

        it('should handle resource names with special characters', () => {
            const existingNames = new Set<string>();

            const result = generator.generateParameterName({
                propertyName: 'InstanceType',
                resourceName: 'My-EC2_Instance.Test',
                existingNames,
                fallbackPrefix: 'Parameter',
            });

            expect(result).toBe('MyEC2InstanceTestInstanceType');
        });
    });

    describe('uniqueness checking', () => {
        it('should return original name when no conflicts exist', () => {
            const existingNames = new Set(['OtherParameter', 'AnotherParameter']);

            const result = generator.generateParameterName({
                propertyName: 'InstanceType',
                resourceName: undefined,
                existingNames,
                fallbackPrefix: 'Parameter',
            });

            expect(result).toBe('InstanceTypeParameter');
        });

        it('should append number when name conflicts exist', () => {
            const existingNames = new Set(['InstanceTypeParameter']);

            const result = generator.generateParameterName({
                propertyName: 'InstanceType',
                resourceName: undefined,
                existingNames,
                fallbackPrefix: 'Parameter',
            });

            expect(result).toBe('InstanceTypeParameter2');
        });

        it('should find next available number for multiple conflicts', () => {
            const existingNames = new Set([
                'InstanceTypeParameter',
                'InstanceTypeParameter2',
                'InstanceTypeParameter3',
            ]);

            const result = generator.generateParameterName({
                propertyName: 'InstanceType',
                resourceName: undefined,
                existingNames,
                fallbackPrefix: 'Parameter',
            });

            expect(result).toBe('InstanceTypeParameter4');
        });

        it('should handle conflicts with resource-based names', () => {
            const existingNames = new Set(['MyEC2InstanceInstanceType']);

            const result = generator.generateParameterName({
                propertyName: 'InstanceType',
                resourceName: 'MyEC2Instance',
                existingNames,
                fallbackPrefix: 'Parameter',
            });

            expect(result).toBe('MyEC2InstanceInstanceType2');
        });

        it('should be case-sensitive in conflict detection', () => {
            const existingNames = new Set(['instancetypeparameter']);

            const result = generator.generateParameterName({
                propertyName: 'InstanceType',
                resourceName: undefined,
                existingNames,
                fallbackPrefix: 'Parameter',
            });

            expect(result).toBe('InstanceTypeParameter');
        });
    });

    describe('fallback naming', () => {
        it('should use fallback prefix when property name is empty', () => {
            const existingNames = new Set<string>();

            const result = generator.generateParameterName({
                propertyName: '',
                resourceName: undefined,
                existingNames,
                fallbackPrefix: 'Parameter',
            });

            expect(result).toBe('Parameter1');
        });

        it('should use fallback prefix when property name is undefined', () => {
            const existingNames = new Set<string>();

            const result = generator.generateParameterName({
                propertyName: undefined,
                resourceName: undefined,
                existingNames,
                fallbackPrefix: 'Parameter',
            });

            expect(result).toBe('Parameter1');
        });

        it('should use fallback prefix when property name contains only special characters', () => {
            const existingNames = new Set<string>();

            const result = generator.generateParameterName({
                propertyName: '---___...',
                resourceName: undefined,
                existingNames,
                fallbackPrefix: 'Parameter',
            });

            expect(result).toBe('Parameter1');
        });

        it('should increment fallback names when conflicts exist', () => {
            const existingNames = new Set(['Parameter1', 'Parameter2']);

            const result = generator.generateParameterName({
                propertyName: '',
                resourceName: undefined,
                existingNames,
                fallbackPrefix: 'Parameter',
            });

            expect(result).toBe('Parameter3');
        });

        it('should use resource name in fallback when available', () => {
            const existingNames = new Set<string>();

            const result = generator.generateParameterName({
                propertyName: '',
                resourceName: 'MyResource',
                existingNames,
                fallbackPrefix: 'Parameter',
            });

            expect(result).toBe('MyResourceParameter1');
        });
    });

    describe('edge cases', () => {
        it('should handle very long property names', () => {
            const existingNames = new Set<string>();
            const longPropertyName = 'VeryLongPropertyNameThatExceedsNormalLengthExpectations';

            const result = generator.generateParameterName({
                propertyName: longPropertyName,
                resourceName: undefined,
                existingNames,
                fallbackPrefix: 'Parameter',
            });

            expect(result).toBe('VeryLongPropertyNameThatExceedsNormalLengthExpectationsParameter');
        });

        it('should handle numeric property names', () => {
            const existingNames = new Set<string>();

            const result = generator.generateParameterName({
                propertyName: '123',
                resourceName: undefined,
                existingNames,
                fallbackPrefix: 'Parameter',
            });

            expect(result).toBe('123Parameter');
        });

        it('should handle property names starting with numbers', () => {
            const existingNames = new Set<string>();

            const result = generator.generateParameterName({
                propertyName: '2ndInstanceType',
                resourceName: undefined,
                existingNames,
                fallbackPrefix: 'Parameter',
            });

            expect(result).toBe('2ndInstanceTypeParameter');
        });

        it('should handle empty existing names set', () => {
            const existingNames = new Set<string>();

            const result = generator.generateParameterName({
                propertyName: 'InstanceType',
                resourceName: undefined,
                existingNames,
                fallbackPrefix: 'Parameter',
            });

            expect(result).toBe('InstanceTypeParameter');
        });

        it('should handle large existing names set efficiently', () => {
            const existingNames = new Set<string>();
            // Create a large set of existing names
            for (let i = 1; i <= 1000; i++) {
                existingNames.add(`InstanceTypeParameter${i}`);
            }

            const result = generator.generateParameterName({
                propertyName: 'InstanceType',
                resourceName: undefined,
                existingNames,
                fallbackPrefix: 'Parameter',
            });

            expect(result).toBe('InstanceTypeParameter1001');
        });
    });

    describe('name sanitization', () => {
        it('should remove invalid CloudFormation parameter name characters', () => {
            const existingNames = new Set<string>();

            const result = generator.generateParameterName({
                propertyName: 'Instance@Type#With$Invalid%Characters',
                resourceName: undefined,
                existingNames,
                fallbackPrefix: 'Parameter',
            });

            expect(result).toBe('InstanceTypeWithInvalidCharactersParameter');
        });

        it('should preserve valid alphanumeric characters', () => {
            const existingNames = new Set<string>();

            const result = generator.generateParameterName({
                propertyName: 'Instance123Type456',
                resourceName: undefined,
                existingNames,
                fallbackPrefix: 'Parameter',
            });

            expect(result).toBe('Instance123Type456Parameter');
        });

        it('should handle Unicode characters appropriately', () => {
            const existingNames = new Set<string>();

            const result = generator.generateParameterName({
                propertyName: 'InstanceTypeÄÖÜ',
                resourceName: undefined,
                existingNames,
                fallbackPrefix: 'Parameter',
            });

            expect(result).toBe('InstanceTypeParameter');
        });
    });
});
