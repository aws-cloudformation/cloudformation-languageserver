import { describe, it, expect, beforeEach } from 'vitest';
import { Range } from 'vscode-languageserver';
import { ParameterType } from '../../../../src/context/semantic/ParameterType';
import { DocumentType } from '../../../../src/document/Document';
import { ParameterDefinition } from '../../../../src/services/extractToParameter/ExtractToParameterTypes';
import { TextEditGenerator } from '../../../../src/services/extractToParameter/TextEditGenerator';
import { EditorSettings } from '../../../../src/settings/Settings';

describe('TextEditGenerator', () => {
    let generator: TextEditGenerator;
    let defaultEditorSettings: EditorSettings;

    beforeEach(() => {
        generator = new TextEditGenerator();
        defaultEditorSettings = {
            tabSize: 4,
            insertSpaces: true,
            detectIndentation: false,
        };
    });

    describe('generateParameterInsertionEdit', () => {
        it('should generate parameter insertion edit for JSON template with existing Parameters section', () => {
            const parameterName = 'InstanceTypeParam';
            const parameterDefinition: ParameterDefinition = {
                Type: ParameterType.String,
                Default: 't2.micro',
                Description: '',
            };
            const insertionPoint: Range = {
                start: { line: 3, character: 4 },
                end: { line: 3, character: 4 },
            };

            const result = generator.generateParameterInsertionEdit(
                parameterName,
                parameterDefinition,
                insertionPoint,
                DocumentType.JSON,
                true, // withinExistingSection
                defaultEditorSettings,
            );

            expect(result).toBeDefined();
            expect(result.range).toEqual(insertionPoint);
            expect(result.newText).toContain('"InstanceTypeParam"');
            expect(result.newText).toContain('"Type": "String"');
            expect(result.newText).toContain('"Default": "t2.micro"');
            expect(result.newText).toContain('"Description": ""');
            // Should include comma at the beginning for existing section
            expect(result.newText).toMatch(/^,/);
        });

        it('should generate parameter insertion edit for JSON template without existing Parameters section', () => {
            const parameterName = 'InstanceTypeParam';
            const parameterDefinition: ParameterDefinition = {
                Type: ParameterType.String,
                Default: 't2.micro',
                Description: '',
            };
            const insertionPoint: Range = {
                start: { line: 1, character: 0 },
                end: { line: 1, character: 0 },
            };

            const result = generator.generateParameterInsertionEdit(
                parameterName,
                parameterDefinition,
                insertionPoint,
                DocumentType.JSON,
                false, // withinExistingSection
                defaultEditorSettings,
            );

            expect(result).toBeDefined();
            expect(result.range).toEqual(insertionPoint);
            expect(result.newText).toContain('"Parameters"');
            expect(result.newText).toContain('"InstanceTypeParam"');
            expect(result.newText).toContain('"Type": "String"');
            expect(result.newText).toContain('"Default": "t2.micro"');
            // Should NOT include leading comma as insertion point is after existing comma
            // Should include trailing comma after Parameters section
            expect(result.newText).not.toMatch(/^,/);
            expect(result.newText).toMatch(/},$/);
        });

        it('should generate parameter insertion edit for YAML template with existing Parameters section', () => {
            const parameterName = 'InstanceTypeParam';
            const parameterDefinition: ParameterDefinition = {
                Type: ParameterType.String,
                Default: 't2.micro',
                Description: '',
            };
            const insertionPoint: Range = {
                start: { line: 3, character: 0 },
                end: { line: 3, character: 0 },
            };

            const result = generator.generateParameterInsertionEdit(
                parameterName,
                parameterDefinition,
                insertionPoint,
                DocumentType.YAML,
                true, // withinExistingSection
                defaultEditorSettings,
            );

            expect(result).toBeDefined();
            expect(result.range).toEqual(insertionPoint);
            expect(result.newText).toContain('InstanceTypeParam:');
            expect(result.newText).toContain('Type: String');
            expect(result.newText).toContain('Default: t2.micro');
            expect(result.newText).toContain('Description: ""');
            // Should have proper YAML indentation (4 spaces with default settings)
            expect(result.newText).toMatch(/^ {4}\w+:/m);
        });

        it('should generate parameter insertion edit for YAML template without existing Parameters section', () => {
            const parameterName = 'InstanceTypeParam';
            const parameterDefinition: ParameterDefinition = {
                Type: ParameterType.String,
                Default: 't2.micro',
                Description: '',
            };
            const insertionPoint: Range = {
                start: { line: 1, character: 0 },
                end: { line: 1, character: 0 },
            };

            const result = generator.generateParameterInsertionEdit(
                parameterName,
                parameterDefinition,
                insertionPoint,
                DocumentType.YAML,
                false, // withinExistingSection
                defaultEditorSettings,
            );

            expect(result).toBeDefined();
            expect(result.range).toEqual(insertionPoint);
            expect(result.newText).toContain('Parameters:');
            expect(result.newText).toContain('InstanceTypeParam:');
            expect(result.newText).toContain('Type: String');
            expect(result.newText).toContain('Default: t2.micro');
            // Should include leading newline for YAML structure
            expect(result.newText).toMatch(/^\n/);
        });

        it('should handle boolean parameter with AllowedValues in JSON', () => {
            const parameterName = 'EnableFeature';
            const parameterDefinition: ParameterDefinition = {
                Type: ParameterType.String,
                Default: 'true',
                Description: '',
                AllowedValues: ['true', 'false'],
            };
            const insertionPoint: Range = {
                start: { line: 3, character: 4 },
                end: { line: 3, character: 4 },
            };

            const result = generator.generateParameterInsertionEdit(
                parameterName,
                parameterDefinition,
                insertionPoint,
                DocumentType.JSON,
                true,
                defaultEditorSettings,
            );

            expect(result.newText).toContain('"AllowedValues": ["true", "false"]');
        });

        it('should handle boolean parameter with AllowedValues in YAML', () => {
            const parameterName = 'EnableFeature';
            const parameterDefinition: ParameterDefinition = {
                Type: ParameterType.String,
                Default: 'true',
                Description: '',
                AllowedValues: ['true', 'false'],
            };
            const insertionPoint: Range = {
                start: { line: 3, character: 0 },
                end: { line: 3, character: 0 },
            };

            const result = generator.generateParameterInsertionEdit(
                parameterName,
                parameterDefinition,
                insertionPoint,
                DocumentType.YAML,
                true,
                defaultEditorSettings,
            );

            expect(result.newText).toContain('AllowedValues:');
            expect(result.newText).toContain('- "true"');
            expect(result.newText).toContain('- "false"');
        });

        it('should handle numeric parameter in JSON', () => {
            const parameterName = 'MaxSize';
            const parameterDefinition: ParameterDefinition = {
                Type: ParameterType.Number,
                Default: 10,
                Description: '',
            };
            const insertionPoint: Range = {
                start: { line: 3, character: 4 },
                end: { line: 3, character: 4 },
            };

            const result = generator.generateParameterInsertionEdit(
                parameterName,
                parameterDefinition,
                insertionPoint,
                DocumentType.JSON,
                true,
                defaultEditorSettings,
            );

            expect(result.newText).toContain('"Type": "Number"');
            expect(result.newText).toContain('"Default": 10');
        });

        it('should handle array parameter in YAML', () => {
            const parameterName = 'SubnetIds';
            const parameterDefinition: ParameterDefinition = {
                Type: ParameterType.CommaDelimitedList,
                Default: ['subnet-123', 'subnet-456'],
                Description: '',
            };
            const insertionPoint: Range = {
                start: { line: 3, character: 0 },
                end: { line: 3, character: 0 },
            };

            const result = generator.generateParameterInsertionEdit(
                parameterName,
                parameterDefinition,
                insertionPoint,
                DocumentType.YAML,
                true,
                defaultEditorSettings,
            );

            expect(result.newText).toContain('Type: CommaDelimitedList');
            expect(result.newText).toContain('Default: "subnet-123,subnet-456"');
        });
    });

    describe('generateLiteralReplacementEdit', () => {
        it('should generate literal replacement edit with Ref syntax for JSON', () => {
            const parameterName = 'InstanceTypeParam';
            const literalRange: Range = {
                start: { line: 5, character: 20 },
                end: { line: 5, character: 30 },
            };

            const result = generator.generateLiteralReplacementEdit(parameterName, literalRange, DocumentType.JSON);

            expect(result).toBeDefined();
            expect(result.range).toEqual(literalRange);
            expect(result.newText).toBe('{"Ref": "InstanceTypeParam"}');
        });

        it('should generate literal replacement edit with Ref syntax for YAML', () => {
            const parameterName = 'InstanceTypeParam';
            const literalRange: Range = {
                start: { line: 5, character: 15 },
                end: { line: 5, character: 25 },
            };

            const result = generator.generateLiteralReplacementEdit(parameterName, literalRange, DocumentType.YAML);

            expect(result).toBeDefined();
            expect(result.range).toEqual(literalRange);
            expect(result.newText).toBe('!Ref InstanceTypeParam');
        });

        it('should handle parameter names with special characters in JSON', () => {
            const parameterName = 'My-Parameter_Name123';
            const literalRange: Range = {
                start: { line: 5, character: 20 },
                end: { line: 5, character: 30 },
            };

            const result = generator.generateLiteralReplacementEdit(parameterName, literalRange, DocumentType.JSON);

            expect(result.newText).toBe('{"Ref": "My-Parameter_Name123"}');
        });

        it('should handle parameter names with special characters in YAML', () => {
            const parameterName = 'My-Parameter_Name123';
            const literalRange: Range = {
                start: { line: 5, character: 15 },
                end: { line: 5, character: 25 },
            };

            const result = generator.generateLiteralReplacementEdit(parameterName, literalRange, DocumentType.YAML);

            expect(result.newText).toBe('!Ref My-Parameter_Name123');
        });
    });

    describe('edge cases and error handling', () => {
        it('should handle empty parameter name gracefully', () => {
            const literalRange: Range = {
                start: { line: 5, character: 20 },
                end: { line: 5, character: 30 },
            };

            const result = generator.generateLiteralReplacementEdit('', literalRange, DocumentType.JSON);

            expect(result.newText).toBe('{"Ref": ""}');
        });

        it('should handle zero-width range', () => {
            const parameterName = 'TestParam';
            const literalRange: Range = {
                start: { line: 5, character: 20 },
                end: { line: 5, character: 20 },
            };

            const result = generator.generateLiteralReplacementEdit(parameterName, literalRange, DocumentType.JSON);

            expect(result.range).toEqual(literalRange);
            expect(result.newText).toBe('{"Ref": "TestParam"}');
        });

        it('should handle complex default values in JSON', () => {
            const parameterName = 'ComplexParam';
            const parameterDefinition: ParameterDefinition = {
                Type: ParameterType.String,
                Default: 'value with "quotes" and \n newlines',
                Description: '',
            };
            const insertionPoint: Range = {
                start: { line: 3, character: 4 },
                end: { line: 3, character: 4 },
            };

            const result = generator.generateParameterInsertionEdit(
                parameterName,
                parameterDefinition,
                insertionPoint,
                DocumentType.JSON,
                true,
                defaultEditorSettings,
            );

            // Should properly escape quotes and newlines in JSON
            expect(result.newText).toContain('\\"quotes\\"');
            expect(result.newText).toContain('\\n');
        });

        it('should handle complex default values in YAML', () => {
            const parameterName = 'ComplexParam';
            const parameterDefinition: ParameterDefinition = {
                Type: ParameterType.String,
                Default: 'value with "quotes" and \n newlines',
                Description: '',
            };
            const insertionPoint: Range = {
                start: { line: 3, character: 0 },
                end: { line: 3, character: 0 },
            };

            const result = generator.generateParameterInsertionEdit(
                parameterName,
                parameterDefinition,
                insertionPoint,
                DocumentType.YAML,
                true,
                defaultEditorSettings,
            );

            // YAML should quote strings with special characters
            expect(result.newText).toContain('"value with \\"quotes\\" and \\n newlines"');
        });
    });

    describe('formatting and indentation', () => {
        it('should maintain proper JSON indentation for nested parameter', () => {
            const parameterName = 'TestParam';
            const parameterDefinition: ParameterDefinition = {
                Type: ParameterType.String,
                Default: 'test',
                Description: '',
            };
            const insertionPoint: Range = {
                start: { line: 3, character: 4 },
                end: { line: 3, character: 4 },
            };

            const result = generator.generateParameterInsertionEdit(
                parameterName,
                parameterDefinition,
                insertionPoint,
                DocumentType.JSON,
                true,
                defaultEditorSettings,
            );

            // Should have proper 4-space indentation for JSON
            const lines = result.newText.split('\n');
            expect(lines[1]).toMatch(/^ {8}"/); // Parameter name line (after initial newline)
            expect(lines[2]).toMatch(/^ {12}"/); // Type line (12 spaces = 3 levels of 4-space indentation)
        });

        it('should maintain proper YAML indentation for nested parameter', () => {
            const parameterName = 'TestParam';
            const parameterDefinition: ParameterDefinition = {
                Type: ParameterType.String,
                Default: 'test',
                Description: '',
            };
            const insertionPoint: Range = {
                start: { line: 3, character: 0 },
                end: { line: 3, character: 0 },
            };

            const result = generator.generateParameterInsertionEdit(
                parameterName,
                parameterDefinition,
                insertionPoint,
                DocumentType.YAML,
                true,
                defaultEditorSettings,
            );

            // Should have proper 4-space indentation for YAML (using default tabSize: 4)
            const lines = result.newText.split('\n');
            expect(lines[1]).toMatch(/^ {4}\w+:/); // Parameter name line (4 spaces) - after leading newline
            expect(lines[2]).toMatch(/^ {8}\w+:/); // Type line (8 spaces = 2 levels of 4-space indentation)
        });

        it('should add proper newlines for JSON parameter insertion', () => {
            const parameterName = 'TestParam';
            const parameterDefinition: ParameterDefinition = {
                Type: ParameterType.String,
                Default: 'test',
                Description: '',
            };
            const insertionPoint: Range = {
                start: { line: 3, character: 4 },
                end: { line: 3, character: 4 },
            };

            const result = generator.generateParameterInsertionEdit(
                parameterName,
                parameterDefinition,
                insertionPoint,
                DocumentType.JSON,
                true,
                defaultEditorSettings,
            );

            // Should start with comma and end with newline for proper formatting
            expect(result.newText).toMatch(/^,/);
            expect(result.newText).toMatch(/\n\s*$/);
        });

        it('should add proper newlines for YAML parameter insertion', () => {
            const parameterName = 'TestParam';
            const parameterDefinition: ParameterDefinition = {
                Type: ParameterType.String,
                Default: 'test',
                Description: '',
            };
            const insertionPoint: Range = {
                start: { line: 3, character: 0 },
                end: { line: 3, character: 0 },
            };

            const result = generator.generateParameterInsertionEdit(
                parameterName,
                parameterDefinition,
                insertionPoint,
                DocumentType.YAML,
                true,
                defaultEditorSettings,
            );

            // Should end with newline for proper YAML formatting
            expect(result.newText).toMatch(/\n$/);
        });
    });

    describe('editor settings integration', () => {
        it('should use 2-space indentation when tabSize is 2', () => {
            const editorSettings: EditorSettings = {
                tabSize: 2,
                insertSpaces: true,
                detectIndentation: false,
            };
            const parameterName = 'TestParam';
            const parameterDefinition: ParameterDefinition = {
                Type: ParameterType.String,
                Default: 'test',
                Description: '',
            };
            const insertionPoint: Range = {
                start: { line: 3, character: 0 },
                end: { line: 3, character: 0 },
            };

            const result = generator.generateParameterInsertionEdit(
                parameterName,
                parameterDefinition,
                insertionPoint,
                DocumentType.YAML,
                true,
                editorSettings,
            );

            const lines = result.newText.split('\n');
            expect(lines[1]).toMatch(/^ {2}\w+:/); // Parameter name line (2 spaces) - after leading newline
            expect(lines[2]).toMatch(/^ {4}\w+:/); // Type line (4 spaces = 2 levels of 2-space indentation)
        });

        it('should use tabs for JSON when insertSpaces is false', () => {
            const editorSettings: EditorSettings = {
                tabSize: 4,
                insertSpaces: false,
                detectIndentation: false,
            };
            const parameterName = 'TestParam';
            const parameterDefinition: ParameterDefinition = {
                Type: ParameterType.String,
                Default: 'test',
                Description: '',
            };
            const insertionPoint: Range = {
                start: { line: 3, character: 4 },
                end: { line: 3, character: 4 },
            };

            const result = generator.generateParameterInsertionEdit(
                parameterName,
                parameterDefinition,
                insertionPoint,
                DocumentType.JSON,
                true,
                editorSettings,
            );

            const lines = result.newText.split('\n');
            expect(lines[1]).toMatch(/^\t\t"/); // Parameter name line (2 tabs)
            expect(lines[2]).toMatch(/^\t\t\t"/); // Type line (3 tabs)
        });

        it('should always use spaces for YAML even when insertSpaces is false', () => {
            const editorSettings: EditorSettings = {
                tabSize: 3,
                insertSpaces: false, // Should be ignored for YAML
                detectIndentation: false,
            };
            const parameterName = 'TestParam';
            const parameterDefinition: ParameterDefinition = {
                Type: ParameterType.String,
                Default: 'test',
                Description: '',
            };
            const insertionPoint: Range = {
                start: { line: 3, character: 0 },
                end: { line: 3, character: 0 },
            };

            const result = generator.generateParameterInsertionEdit(
                parameterName,
                parameterDefinition,
                insertionPoint,
                DocumentType.YAML,
                true,
                editorSettings,
            );

            const lines = result.newText.split('\n');
            expect(lines[1]).toMatch(/^ {3}\w+:/); // Parameter name line (3 spaces) - after leading newline
            expect(lines[2]).toMatch(/^ {6}\w+:/); // Type line (6 spaces = 2 levels of 3-space indentation)
            // Should not contain tabs
            expect(result.newText).not.toContain('\t');
        });
    });
});
