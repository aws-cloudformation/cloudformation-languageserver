import { describe, it, expect } from 'vitest';
import { TopLevelSection } from '../../../src/context/CloudFormationEnums';
import { OutputSectionFieldHoverProvider } from '../../../src/hover/OutputSectionFieldHoverProvider';
import { createMockContext } from '../../utils/MockContext';

describe('OutputSectionFieldHoverProvider', () => {
    const outputSectionFieldHoverProvider = new OutputSectionFieldHoverProvider();

    describe('Output Section Field Hover', () => {
        it('should return Description documentation when hovering on Description attribute', () => {
            const mockContext = createMockContext(TopLevelSection.Outputs, 'MyOutput', {
                text: 'Description',
                propertyPath: ['Outputs', 'MyOutput', 'Description'],
            });

            const result = outputSectionFieldHoverProvider.getInformation(mockContext);

            expect(result).toContain('**Description (optional)**');
            expect(result).toContain('A `String` type that describes the output value');
            expect(result).toContain('between 0 and 1024 bytes in length');
            expect(result).toContain("You can't use a parameter or function to specify the description");
        });

        it('should return Value documentation when hovering on Value attribute', () => {
            const mockContext = createMockContext(TopLevelSection.Outputs, 'MyOutput', {
                text: 'Value',
                propertyPath: ['Outputs', 'MyOutput', 'Value'],
            });

            const result = outputSectionFieldHoverProvider.getInformation(mockContext);

            expect(result).toContain('**Value (required)**');
            expect(result).toContain('The value of the property returned by the [describe-stacks]');
            expect(result).toContain(
                'The value of an output can include literals, parameter references, pseudo parameters, a mapping value, or intrinsic functions',
            );
        });

        it('should return Export documentation when hovering on Export attribute', () => {
            const mockContext = createMockContext(TopLevelSection.Outputs, 'MyOutput', {
                text: 'Export',
                propertyPath: ['Outputs', 'MyOutput', 'Export'],
            });

            const result = outputSectionFieldHoverProvider.getInformation(mockContext);

            expect(result).toContain('**Export (optional)**');
            expect(result).toContain('The name of the resource output to be exported for a cross-stack reference');
            expect(result).toContain('You can use intrinsic functions to customize the Name value of an export');
            expect(result).toContain('Get exported outputs from a deployed CloudFormation stack');
        });

        it('should return undefined for non-output attributes', () => {
            const mockContext = createMockContext(TopLevelSection.Outputs, 'MyOutput', {
                text: 'InvalidAttribute',
                propertyPath: ['Outputs', 'MyOutput', 'InvalidAttribute'],
            });

            const result = outputSectionFieldHoverProvider.getInformation(mockContext);

            expect(result).toBeUndefined();
        });

        it('should return undefined for empty text', () => {
            const mockContext = createMockContext(TopLevelSection.Outputs, 'MyOutput', {
                text: '',
                propertyPath: ['Outputs', 'MyOutput'],
            });

            const result = outputSectionFieldHoverProvider.getInformation(mockContext);

            expect(result).toBeUndefined();
        });

        it('should return undefined for parameter attributes (case sensitivity)', () => {
            const mockContext = createMockContext(TopLevelSection.Outputs, 'MyOutput', {
                text: 'Type',
                propertyPath: ['Outputs', 'MyOutput', 'Type'],
            });

            const result = outputSectionFieldHoverProvider.getInformation(mockContext);

            expect(result).toBeUndefined();
        });

        it('should return undefined for resource attributes', () => {
            const mockContext = createMockContext(TopLevelSection.Outputs, 'MyOutput', {
                text: 'DependsOn',
                propertyPath: ['Outputs', 'MyOutput', 'DependsOn'],
            });

            const result = outputSectionFieldHoverProvider.getInformation(mockContext);

            expect(result).toBeUndefined();
        });

        it('should be case sensitive for attribute names', () => {
            const mockContext = createMockContext(TopLevelSection.Outputs, 'MyOutput', {
                text: 'description',
                propertyPath: ['Outputs', 'MyOutput', 'description'],
            });

            const result = outputSectionFieldHoverProvider.getInformation(mockContext);

            expect(result).toBeUndefined();
        });
    });

    describe('isOutputSectionField static method', () => {
        it('should return true for valid output attributes', () => {
            const validAttributes = ['Description', 'Value', 'Export'];

            for (const attribute of validAttributes) {
                expect(OutputSectionFieldHoverProvider.isOutputSectionField(attribute)).toBe(true);
            }
        });

        it('should return false for invalid output attributes', () => {
            const invalidAttributes = [
                'InvalidAttribute',
                'Type',
                'Default',
                'Properties',
                'Condition',
                'DependsOn',
                'description',
                'value',
                'export',
                '',
                'Name', // This is a property of Export, not a top-level output attribute
            ];

            for (const attribute of invalidAttributes) {
                expect(OutputSectionFieldHoverProvider.isOutputSectionField(attribute)).toBe(false);
            }
        });

        it('should return false for parameter attributes', () => {
            const parameterAttributes = [
                'Type',
                'Default',
                'AllowedValues',
                'AllowedPattern',
                'MinLength',
                'MaxLength',
                'MinValue',
                'MaxValue',
                'NoEcho',
                'ConstraintDescription',
            ];

            for (const attribute of parameterAttributes) {
                expect(OutputSectionFieldHoverProvider.isOutputSectionField(attribute)).toBe(false);
            }
        });

        it('should return false for resource attributes', () => {
            const resourceAttributes = [
                'CreationPolicy',
                'DeletionPolicy',
                'UpdatePolicy',
                'UpdateReplacePolicy',
                'Condition',
                'DependsOn',
                'Metadata',
            ];

            for (const attribute of resourceAttributes) {
                expect(OutputSectionFieldHoverProvider.isOutputSectionField(attribute)).toBe(false);
            }
        });
    });
});
