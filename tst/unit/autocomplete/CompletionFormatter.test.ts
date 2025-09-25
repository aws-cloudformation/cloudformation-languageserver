import { beforeEach, describe, expect, test } from 'vitest';
import { CompletionItemKind, CompletionList } from 'vscode-languageserver';
import { CompletionFormatter } from '../../../src/autocomplete/CompletionFormatter';
import { ResourceAttribute, TopLevelSection } from '../../../src/context/ContextType';
import { DocumentType } from '../../../src/document/Document';
import { DefaultSettings, EditorSettings } from '../../../src/settings/Settings';
import { createTopLevelContext } from '../../utils/MockContext';

describe('CompletionFormatAdapter', () => {
    describe('adaptCompletions', () => {
        let mockCompletions: CompletionList;

        beforeEach(() => {
            mockCompletions = {
                isIncomplete: false,
                items: [
                    {
                        label: 'Resources',
                        kind: CompletionItemKind.Property,
                        insertText: 'Resources',
                    },
                    {
                        label: 'AWS::EC2::Instance',
                        kind: CompletionItemKind.Class,
                        insertText: 'AWS::EC2::Instance',
                    },
                ],
            };
        });

        test('should adapt completions for YAML document type', () => {
            const mockContext = createTopLevelContext('Unknown', { type: DocumentType.YAML });

            const result = CompletionFormatter.format(mockCompletions, mockContext, DefaultSettings.editor);

            expect(result).toBeDefined();
            expect(result.items).toHaveLength(2);
            expect(result.items[0].insertText).toBe('Resources:\n  ');
            expect(result.items[1].insertText).toBe('AWS::EC2::Instance');
        });

        test('should adapt completions for JSON document type', () => {
            const mockContext = createTopLevelContext('Unknown', { type: DocumentType.JSON });

            const result = CompletionFormatter.format(mockCompletions, mockContext, DefaultSettings.editor);

            expect(result).toBeDefined();
            expect(result.items).toHaveLength(2);
            expect(result.items[0].insertText).toBe('Resources');
            expect(result.items[1].insertText).toBe('AWS::EC2::Instance');
        });
    });

    describe('individual item adaptation', () => {
        test('should adapt item for JSON document type', () => {
            const mockContext = createTopLevelContext('Unknown', { type: DocumentType.JSON });
            const completions: CompletionList = {
                isIncomplete: false,
                items: [{ label: 'Resources', kind: CompletionItemKind.Property }],
            };

            const result = CompletionFormatter.format(completions, mockContext, DefaultSettings.editor);

            expect(result.items[0].insertText).toBe('Resources');
        });

        test('should adapt item for YAML document type', () => {
            const mockContext = createTopLevelContext('Unknown', { type: DocumentType.YAML });
            const completions: CompletionList = {
                isIncomplete: false,
                items: [{ label: 'Resources', kind: CompletionItemKind.Property }],
            };

            const result = CompletionFormatter.format(completions, mockContext, DefaultSettings.editor);

            expect(result.items[0].insertText).toBe('Resources:\n  ');
        });

        test('should preserve other item properties', () => {
            const mockContext = createTopLevelContext('Unknown', { type: DocumentType.YAML });
            const completions: CompletionList = {
                isIncomplete: false,
                items: [
                    {
                        label: 'Resources',
                        kind: CompletionItemKind.Property,
                        detail: 'CloudFormation Section',
                        sortText: 'a',
                    },
                ],
            };

            const result = CompletionFormatter.format(completions, mockContext, DefaultSettings.editor);

            expect(result.items[0].label).toBe('Resources');
            expect(result.items[0].kind).toBe(CompletionItemKind.Property);
            expect(result.items[0].detail).toBe('CloudFormation Section');
            expect(result.items[0].sortText).toBe('a');
            expect(result.items[0].insertText).toBe('Resources:\n  ');
        });
    });

    describe('YAML formatting', () => {
        let mockContext: ReturnType<typeof createTopLevelContext>;

        beforeEach(() => {
            mockContext = createTopLevelContext('Unknown', { type: DocumentType.YAML });
        });

        test('should format AWSTemplateFormatVersion with default value', () => {
            const completions: CompletionList = {
                isIncomplete: false,
                items: [{ label: TopLevelSection.AWSTemplateFormatVersion, kind: CompletionItemKind.Property }],
            };

            const result = CompletionFormatter.format(completions, mockContext, DefaultSettings.editor);

            expect(result.items[0].insertText).toBe('AWSTemplateFormatVersion: "2010-09-09"');
        });

        test('should format Description and Transform with colon and space', () => {
            const completions: CompletionList = {
                isIncomplete: false,
                items: [
                    { label: TopLevelSection.Description, kind: CompletionItemKind.Property },
                    { label: TopLevelSection.Transform, kind: CompletionItemKind.Property },
                ],
            };

            const result = CompletionFormatter.format(completions, mockContext, DefaultSettings.editor);

            expect(result.items[0].insertText).toBe('Description: ');
            expect(result.items[1].insertText).toBe('Transform: ');
        });

        test('should format other top-level sections with colon and newline indent', () => {
            const completions: CompletionList = {
                isIncomplete: false,
                items: [
                    { label: TopLevelSection.Resources, kind: CompletionItemKind.Property },
                    { label: TopLevelSection.Parameters, kind: CompletionItemKind.Property },
                    { label: TopLevelSection.Outputs, kind: CompletionItemKind.Property },
                ],
            };

            const result = CompletionFormatter.format(completions, mockContext, DefaultSettings.editor);

            expect(result.items[0].insertText).toBe('Resources:\n  ');
            expect(result.items[1].insertText).toBe('Parameters:\n  ');
            expect(result.items[2].insertText).toBe('Outputs:\n  ');
        });

        test('should format resource attributes with colon and space', () => {
            const completions: CompletionList = {
                isIncomplete: false,
                items: [
                    { label: ResourceAttribute.CreationPolicy, kind: CompletionItemKind.Property },
                    { label: ResourceAttribute.DependsOn, kind: CompletionItemKind.Property },
                    { label: ResourceAttribute.UpdatePolicy, kind: CompletionItemKind.Property },
                ],
            };

            const result = CompletionFormatter.format(completions, mockContext, DefaultSettings.editor);

            expect(result.items[0].insertText).toBe('CreationPolicy: ');
            expect(result.items[1].insertText).toBe('DependsOn: ');
            expect(result.items[2].insertText).toBe('UpdatePolicy: ');
        });

        test('should return AWS resource types as-is', () => {
            const completions: CompletionList = {
                isIncomplete: false,
                items: [
                    { label: 'AWS::EC2::Instance', kind: CompletionItemKind.Class },
                    { label: 'AWS::S3::Bucket', kind: CompletionItemKind.Class },
                    { label: 'AWS::Lambda::Function', kind: CompletionItemKind.Class },
                ],
            };

            const result = CompletionFormatter.format(completions, mockContext, DefaultSettings.editor);

            expect(result.items[0].insertText).toBe('AWS::EC2::Instance');
            expect(result.items[1].insertText).toBe('AWS::S3::Bucket');
            expect(result.items[2].insertText).toBe('AWS::Lambda::Function');
        });

        test('should format other labels with colon and space', () => {
            const completions: CompletionList = {
                isIncomplete: false,
                items: [
                    { label: 'Type', kind: CompletionItemKind.Property },
                    { label: 'CreationPolicy', kind: CompletionItemKind.Property },
                    { label: 'CustomProperty', kind: CompletionItemKind.Property },
                ],
            };

            const result = CompletionFormatter.format(completions, mockContext, DefaultSettings.editor);

            expect(result.items[0].insertText).toBe('Type: ');
            expect(result.items[1].insertText).toBe('CreationPolicy: ');
            expect(result.items[2].insertText).toBe('CustomProperty: ');
        });

        test('should format object type properties without space after colon', () => {
            const completions: CompletionList = {
                isIncomplete: false,
                items: [
                    {
                        label: 'ObjectProperty',
                        kind: CompletionItemKind.Property,
                        data: { type: 'object' },
                    },
                    {
                        label: 'SimpleProperty',
                        kind: CompletionItemKind.Property,
                        data: { type: 'simple' },
                    },
                ],
            };

            const result = CompletionFormatter.format(completions, mockContext, DefaultSettings.editor);

            expect(result.items[0].insertText).toBe('ObjectProperty:');
            expect(result.items[1].insertText).toBe('SimpleProperty: ');
        });

        test('should format array type properties with colon and newline indent', () => {
            const completions: CompletionList = {
                isIncomplete: false,
                items: [
                    {
                        label: 'ArrayProperty',
                        kind: CompletionItemKind.Property,
                        data: { type: 'array' },
                    },
                    {
                        label: 'SimpleProperty',
                        kind: CompletionItemKind.Property,
                        data: { type: 'simple' },
                    },
                ],
            };

            const result = CompletionFormatter.format(completions, mockContext, DefaultSettings.editor);

            expect(result.items[0].insertText).toBe('ArrayProperty:\n  ');
            expect(result.items[1].insertText).toBe('SimpleProperty: ');
        });

        test('should not format enum values with colons', () => {
            const completions: CompletionList = {
                isIncomplete: false,
                items: [
                    { label: 'AuthenticatedRead', kind: CompletionItemKind.EnumMember },
                    { label: 'Private', kind: CompletionItemKind.EnumMember },
                    { label: 'PublicRead', kind: CompletionItemKind.EnumMember },
                ],
            };

            const result = CompletionFormatter.format(completions, mockContext, DefaultSettings.editor);

            expect(result.items[0].insertText).toBe('AuthenticatedRead');
            expect(result.items[1].insertText).toBe('Private');
            expect(result.items[2].insertText).toBe('PublicRead');
        });

        test('should not format reference values with colons', () => {
            const completions: CompletionList = {
                isIncomplete: false,
                items: [
                    { label: 'IsProduction', kind: CompletionItemKind.Reference },
                    { label: 'CreateNATGateway', kind: CompletionItemKind.Reference },
                    { label: 'ShouldCreateCache', kind: CompletionItemKind.Reference },
                ],
            };

            const result = CompletionFormatter.format(completions, mockContext, DefaultSettings.editor);

            expect(result.items[0].insertText).toBe('IsProduction');
            expect(result.items[1].insertText).toBe('CreateNATGateway');
            expect(result.items[2].insertText).toBe('ShouldCreateCache');
        });
    });

    describe('Indentation Settings', () => {
        test('should use 2 spaces when tabSize is 2 and insertSpaces is true', () => {
            const editorSettings: EditorSettings = {
                tabSize: 2,
                insertSpaces: true,
            };
            const mockContext = createTopLevelContext('Unknown', { type: DocumentType.YAML });
            const completions: CompletionList = {
                isIncomplete: false,
                items: [
                    { label: TopLevelSection.Resources, kind: CompletionItemKind.Property },
                    { label: 'Properties', kind: CompletionItemKind.Property },
                    {
                        label: 'ArrayProperty',
                        kind: CompletionItemKind.Property,
                        data: { type: 'array' },
                    },
                ],
            };

            const result = CompletionFormatter.format(completions, mockContext, editorSettings);

            expect(result.items[0].insertText).toBe('Resources:\n  '); // 2 spaces
            expect(result.items[1].insertText).toBe('Properties:\n  '); // 2 spaces
            expect(result.items[2].insertText).toBe('ArrayProperty:\n  '); // 2 spaces
        });

        test('should use 4 spaces when tabSize is 4 and insertSpaces is true', () => {
            const editorSettings: EditorSettings = {
                tabSize: 4,
                insertSpaces: true,
            };
            const mockContext = createTopLevelContext('Unknown', { type: DocumentType.YAML });
            const completions: CompletionList = {
                isIncomplete: false,
                items: [
                    { label: TopLevelSection.Resources, kind: CompletionItemKind.Property },
                    { label: 'Properties', kind: CompletionItemKind.Property },
                    {
                        label: 'ArrayProperty',
                        kind: CompletionItemKind.Property,
                        data: { type: 'array' },
                    },
                ],
            };

            const result = CompletionFormatter.format(completions, mockContext, editorSettings);

            expect(result.items[0].insertText).toBe('Resources:\n    '); // 4 spaces
            expect(result.items[1].insertText).toBe('Properties:\n    '); // 4 spaces
            expect(result.items[2].insertText).toBe('ArrayProperty:\n    '); // 4 spaces
        });

        test('should use spaces even when insertSpaces is false', () => {
            const editorSettings: EditorSettings = {
                tabSize: 4,
                insertSpaces: false,
            };
            const mockContext = createTopLevelContext('Unknown', { type: DocumentType.YAML });
            const completions: CompletionList = {
                isIncomplete: false,
                items: [
                    { label: TopLevelSection.Resources, kind: CompletionItemKind.Property },
                    { label: 'Properties', kind: CompletionItemKind.Property },
                    {
                        label: 'ArrayProperty',
                        kind: CompletionItemKind.Property,
                        data: { type: 'array' },
                    },
                ],
            };

            const result = CompletionFormatter.format(completions, mockContext, editorSettings);

            expect(result.items[0].insertText).toBe('Resources:\n    '); // 4 spaces
            expect(result.items[1].insertText).toBe('Properties:\n    '); // 4 spaces
            expect(result.items[2].insertText).toBe('ArrayProperty:\n    '); // 4 spaces
        });

        test('should not affect non-indented completions', () => {
            const editorSettings: EditorSettings = {
                tabSize: 8,
                insertSpaces: false,
            };
            const mockContext = createTopLevelContext('Unknown', { type: DocumentType.YAML });
            const completions: CompletionList = {
                isIncomplete: false,
                items: [
                    { label: TopLevelSection.AWSTemplateFormatVersion, kind: CompletionItemKind.Property },
                    { label: TopLevelSection.Description, kind: CompletionItemKind.Property },
                    { label: 'AWS::S3::Bucket', kind: CompletionItemKind.Class },
                    { label: 'AuthenticatedRead', kind: CompletionItemKind.EnumMember },
                    {
                        label: 'ObjectProperty',
                        kind: CompletionItemKind.Property,
                        data: { type: 'object' },
                    },
                ],
            };

            const result = CompletionFormatter.format(completions, mockContext, editorSettings);

            // These should not be affected by indentation settings
            expect(result.items[0].insertText).toBe('AWSTemplateFormatVersion: "2010-09-09"');
            expect(result.items[1].insertText).toBe('Description: ');
            expect(result.items[2].insertText).toBe('AWS::S3::Bucket');
            expect(result.items[3].insertText).toBe('AuthenticatedRead');
            expect(result.items[4].insertText).toBe('ObjectProperty:');
        });

        test('should not affect JSON formatting regardless of indentation settings', () => {
            const editorSettings: EditorSettings = {
                tabSize: 8,
                insertSpaces: false,
            };
            const mockContext = createTopLevelContext('Unknown', { type: DocumentType.JSON });
            const completions: CompletionList = {
                isIncomplete: false,
                items: [
                    { label: TopLevelSection.Resources, kind: CompletionItemKind.Property },
                    { label: 'Properties', kind: CompletionItemKind.Property },
                ],
            };

            const result = CompletionFormatter.format(completions, mockContext, editorSettings);

            // JSON formatting should not be affected by indentation settings
            expect(result.items[0].insertText).toBe('Resources');
            expect(result.items[1].insertText).toBe('Properties');
        });
    });
});
