import { describe, it, expect } from 'vitest';
import { TopLevelSection } from '../../../src/context/CloudFormationEnums';
import { ParameterAttributeHoverProvider } from '../../../src/hover/ParameterAttributeHoverProvider';
import { createMockContext } from '../../utils/MockContext';

describe('ParameterAttributeHoverProvider', () => {
    const parameterAttributeHoverProvider = new ParameterAttributeHoverProvider();

    describe('Parameter Attribute Hover', () => {
        it('should return Type documentation when hovering on Type attribute', () => {
            const mockContext = createMockContext(TopLevelSection.Parameters, 'MyParam', {
                text: 'Type',
                propertyPath: ['Parameters', 'MyParam', 'Type'],
            });

            const result = parameterAttributeHoverProvider.getInformation(mockContext);

            expect(result).toContain('**Type**');
            expect(result).toContain('The data type for the parameter');
            expect(result).toContain('**String**');
            expect(result).toContain('**Number**');
            expect(result).toContain('**CommaDelimitedList**');
            expect(result).toContain('AWS-specific parameter types');
        });

        it('should return Default documentation when hovering on Default attribute', () => {
            const mockContext = createMockContext(TopLevelSection.Parameters, 'MyParam', {
                text: 'Default',
                propertyPath: ['Parameters', 'MyParam', 'Default'],
            });

            const result = parameterAttributeHoverProvider.getInformation(mockContext);

            expect(result).toContain('**Default**');
            expect(result).toContain(
                'A value of the appropriate type for the template to use if no value is specified when a stack is created',
            );
            expect(result).toContain('*Required*: No');
        });

        it('should return Description documentation when hovering on Description attribute', () => {
            const mockContext = createMockContext(TopLevelSection.Parameters, 'MyParam', {
                text: 'Description',
                propertyPath: ['Parameters', 'MyParam', 'Description'],
            });

            const result = parameterAttributeHoverProvider.getInformation(mockContext);

            expect(result).toContain('**Description**');
            expect(result).toContain('A string of up to 4000 characters that describes the parameter');
            expect(result).toContain('*Required*: No');
        });

        it('should return AllowedValues documentation when hovering on AllowedValues attribute', () => {
            const mockContext = createMockContext(TopLevelSection.Parameters, 'MyParam', {
                text: 'AllowedValues',
                propertyPath: ['Parameters', 'MyParam', 'AllowedValues'],
            });

            const result = parameterAttributeHoverProvider.getInformation(mockContext);

            expect(result).toContain('**AllowedValues**');
            expect(result).toContain('An array containing the list of values allowed for the parameter');
            expect(result).toContain(
                'When applied to a parameter of type `String`, the parameter value must be one of the allowed values',
            );
        });

        it('should return AllowedPattern documentation when hovering on AllowedPattern attribute', () => {
            const mockContext = createMockContext(TopLevelSection.Parameters, 'MyParam', {
                text: 'AllowedPattern',
                propertyPath: ['Parameters', 'MyParam', 'AllowedPattern'],
            });

            const result = parameterAttributeHoverProvider.getInformation(mockContext);

            expect(result).toContain('**AllowedPattern**');
            expect(result).toContain(
                'A regular expression that represents the patterns to allow for `String` or `CommaDelimitedList` types',
            );
            expect(result).toContain(
                'When applied on a parameter of type `String`, the pattern must match the entire parameter value provided',
            );
        });

        it('should return MinLength documentation when hovering on MinLength attribute', () => {
            const mockContext = createMockContext(TopLevelSection.Parameters, 'MyParam', {
                text: 'MinLength',
                propertyPath: ['Parameters', 'MyParam', 'MinLength'],
            });

            const result = parameterAttributeHoverProvider.getInformation(mockContext);

            expect(result).toContain('**MinLength**');
            expect(result).toContain(
                'An integer value that determines the smallest number of characters you want to allow for `String` types',
            );
            expect(result).toContain('*Required*: No');
        });

        it('should return MaxLength documentation when hovering on MaxLength attribute', () => {
            const mockContext = createMockContext(TopLevelSection.Parameters, 'MyParam', {
                text: 'MaxLength',
                propertyPath: ['Parameters', 'MyParam', 'MaxLength'],
            });

            const result = parameterAttributeHoverProvider.getInformation(mockContext);

            expect(result).toContain('**MaxLength**');
            expect(result).toContain(
                'An integer value that determines the largest number of characters you want to allow for `String` types',
            );
            expect(result).toContain('*Required*: No');
        });

        it('should return MinValue documentation when hovering on MinValue attribute', () => {
            const mockContext = createMockContext(TopLevelSection.Parameters, 'MyParam', {
                text: 'MinValue',
                propertyPath: ['Parameters', 'MyParam', 'MinValue'],
            });

            const result = parameterAttributeHoverProvider.getInformation(mockContext);

            expect(result).toContain('**MinValue**');
            expect(result).toContain(
                'A numeric value that determines the smallest numeric value you want to allow for `Number` types',
            );
            expect(result).toContain('*Required*: No');
        });

        it('should return MaxValue documentation when hovering on MaxValue attribute', () => {
            const mockContext = createMockContext(TopLevelSection.Parameters, 'MyParam', {
                text: 'MaxValue',
                propertyPath: ['Parameters', 'MyParam', 'MaxValue'],
            });

            const result = parameterAttributeHoverProvider.getInformation(mockContext);

            expect(result).toContain('**MaxValue**');
            expect(result).toContain(
                'A numeric value that determines the largest numeric value you want to allow for `Number` types',
            );
            expect(result).toContain('*Required*: No');
        });

        it('should return NoEcho documentation when hovering on NoEcho attribute', () => {
            const mockContext = createMockContext(TopLevelSection.Parameters, 'MyParam', {
                text: 'NoEcho',
                propertyPath: ['Parameters', 'MyParam', 'NoEcho'],
            });

            const result = parameterAttributeHoverProvider.getInformation(mockContext);

            expect(result).toContain('**NoEcho**');
            expect(result).toContain(
                'Whether to mask the parameter value to prevent it from being displayed in the console, command line tools, or API',
            );
            expect(result).toContain('CloudFormation returns the parameter value masked as asterisks');
        });

        it('should return ConstraintDescription documentation when hovering on ConstraintDescription attribute', () => {
            const mockContext = createMockContext(TopLevelSection.Parameters, 'MyParam', {
                text: 'ConstraintDescription',
                propertyPath: ['Parameters', 'MyParam', 'ConstraintDescription'],
            });

            const result = parameterAttributeHoverProvider.getInformation(mockContext);

            expect(result).toContain('**ConstraintDescription**');
            expect(result).toContain('A string that explains a constraint when the constraint is violated');
            expect(result).toContain('Malformed input-Parameter `MyParameter` must match pattern');
        });

        it('should return undefined for non-parameter attributes', () => {
            const mockContext = createMockContext(TopLevelSection.Parameters, 'MyParam', {
                text: 'InvalidAttribute',
                propertyPath: ['Parameters', 'MyParam', 'InvalidAttribute'],
            });

            const result = parameterAttributeHoverProvider.getInformation(mockContext);

            expect(result).toBeUndefined();
        });

        it('should return undefined for empty text', () => {
            const mockContext = createMockContext(TopLevelSection.Parameters, 'MyParam', {
                text: '',
                propertyPath: ['Parameters', 'MyParam'],
            });

            const result = parameterAttributeHoverProvider.getInformation(mockContext);

            expect(result).toBeUndefined();
        });
    });

    describe('isParameterAttribute static method', () => {
        it('should return true for valid parameter attributes', () => {
            const validAttributes = [
                'Type',
                'Default',
                'Description',
                'AllowedValues',
                'AllowedPattern',
                'MinLength',
                'MaxLength',
                'MinValue',
                'MaxValue',
                'NoEcho',
                'ConstraintDescription',
            ];

            for (const attribute of validAttributes) {
                expect(ParameterAttributeHoverProvider.isParameterAttribute(attribute)).toBe(true);
            }
        });

        it('should return false for invalid parameter attributes', () => {
            const invalidAttributes = [
                'InvalidAttribute',
                'Properties',
                'Condition',
                'DependsOn',
                'type',
                'default',
                '',
            ];

            for (const attribute of invalidAttributes) {
                expect(ParameterAttributeHoverProvider.isParameterAttribute(attribute)).toBe(false);
            }
        });
    });
});
