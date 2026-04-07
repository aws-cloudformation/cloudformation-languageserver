import { beforeEach, describe, expect, test, vi } from 'vitest';
import { CompletionItemKind, CompletionList, InsertTextFormat } from 'vscode-languageserver';
import { CompletionFormatter } from '../../../src/autocomplete/CompletionFormatter';
import { ResourceAttribute, TopLevelSection } from '../../../src/context/CloudFormationEnums';
import { DocumentType } from '../../../src/document/Document';
import { CombinedSchemas } from '../../../src/schema/CombinedSchemas';
import { ResourceSchema } from '../../../src/schema/ResourceSchema';
import { SchemaRetriever } from '../../../src/schema/SchemaRetriever';
import { DefaultSettings } from '../../../src/settings/Settings';
import { createResourceContext, createTopLevelContext } from '../../utils/MockContext';

describe('CompletionFormatAdapter', () => {
    let formatter: CompletionFormatter;
    const defaultEditorSettings = DefaultSettings.editor;

    beforeEach(() => {
        formatter = CompletionFormatter.getInstance();
    });

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

            const result = formatter.format(mockCompletions, mockContext, defaultEditorSettings);

            expect(result).toBeDefined();
            expect(result.items).toHaveLength(2);
            expect(result.items[0].insertText).toBe('Resources:\n  ');
            expect(result.items[1].insertText).toBe('AWS::EC2::Instance');
        });

        test('should adapt completions for JSON document type', () => {
            const mockContext = createTopLevelContext('Unknown', { type: DocumentType.JSON, nodeType: 'string' });

            const result = formatter.format(mockCompletions, mockContext, defaultEditorSettings);

            expect(result).toBeDefined();
            expect(result.items).toHaveLength(2);
            // JSON uses textEdit instead of insertText
            expect(result.items[0].textEdit).toBeDefined();
            expect(result.items[0].insertText).toBeUndefined();
            expect(result.items[1].textEdit).toBeDefined();
        });
    });

    describe('individual item adaptation', () => {
        test('should adapt item for JSON document type', () => {
            const mockContext = createTopLevelContext('Unknown', { type: DocumentType.JSON, nodeType: 'string' });
            const completions: CompletionList = {
                isIncomplete: false,
                items: [{ label: 'Resources', kind: CompletionItemKind.Property }],
            };

            const result = formatter.format(completions, mockContext, defaultEditorSettings);

            // JSON uses textEdit instead of insertText
            expect(result.items[0].textEdit).toBeDefined();
            expect(result.items[0].insertText).toBeUndefined();
        });

        test('should adapt item for YAML document type', () => {
            const mockContext = createTopLevelContext('Unknown', { type: DocumentType.YAML });
            const completions: CompletionList = {
                isIncomplete: false,
                items: [{ label: 'Resources', kind: CompletionItemKind.Property }],
            };

            const result = formatter.format(completions, mockContext, defaultEditorSettings);

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

            const result = formatter.format(completions, mockContext, defaultEditorSettings);

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

            const result = formatter.format(completions, mockContext, defaultEditorSettings);

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

            const result = formatter.format(completions, mockContext, defaultEditorSettings);

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

            const result = formatter.format(completions, mockContext, defaultEditorSettings);

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

            const result = formatter.format(completions, mockContext, defaultEditorSettings);

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

            const result = formatter.format(completions, mockContext, defaultEditorSettings);

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

            const result = formatter.format(completions, mockContext, defaultEditorSettings);

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

            const result = formatter.format(completions, mockContext, defaultEditorSettings);

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

            const result = formatter.format(completions, mockContext, defaultEditorSettings);

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

            const result = formatter.format(completions, mockContext, defaultEditorSettings);

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

            const result = formatter.format(completions, mockContext, defaultEditorSettings);

            expect(result.items[0].insertText).toBe('IsProduction');
            expect(result.items[1].insertText).toBe('CreateNATGateway');
            expect(result.items[2].insertText).toBe('ShouldCreateCache');
        });
    });

    describe('JSON formatting with schema-based type lookup', () => {
        let mockSchemaRetriever: SchemaRetriever;
        let mockCombinedSchemas: CombinedSchemas;
        let mockResourceSchema: ResourceSchema;

        beforeEach(() => {
            mockResourceSchema = {
                resolveJsonPointerPath: vi.fn((path: string) => {
                    // Simulate schema lookup for different properties
                    switch (path) {
                        case '/properties/BucketName': {
                            return [{ type: 'string' }];
                        }
                        case '/properties/Tags': {
                            return [{ type: 'array' }];
                        }
                        case '/properties/BucketEncryption': {
                            return [{ type: 'object' }];
                        }
                        case '/properties/VersioningConfiguration': {
                            return [{ type: 'object' }];
                        }
                        case '/properties/PublicAccessBlockConfiguration': {
                            return [{ type: 'object' }];
                        }
                        // No default
                    }
                    return [];
                }),
            } as unknown as ResourceSchema;

            mockCombinedSchemas = {
                schemas: new Map([['AWS::S3::Bucket', mockResourceSchema]]),
            } as CombinedSchemas;

            mockSchemaRetriever = {
                getDefault: vi.fn(() => mockCombinedSchemas),
            } as unknown as SchemaRetriever;
        });

        test('should format object properties with braces in JSON', () => {
            const mockContext = createResourceContext('MyBucket', {
                type: DocumentType.JSON,
                text: 'BucketEncryption',
                propertyPath: ['Resources', 'MyBucket', 'Properties', 'BucketEncryption'],
                data: { Type: 'AWS::S3::Bucket' },
                nodeType: 'string',
            });

            const completions: CompletionList = {
                isIncomplete: false,
                items: [
                    {
                        label: 'BucketEncryption',
                        kind: CompletionItemKind.Property,
                        data: { type: 'simple' },
                    },
                ],
            };

            const lineContent = '        "BucketEncryption"';
            const result = formatter.format(
                completions,
                mockContext,
                defaultEditorSettings,
                lineContent,
                mockSchemaRetriever,
            );

            expect(result.items[0].textEdit).toBeDefined();
            expect(result.items[0].textEdit?.newText).toContain('"BucketEncryption": {');
            expect(result.items[0].textEdit?.newText).toContain('}');
        });

        test('should format array properties with brackets in JSON', () => {
            const mockContext = createResourceContext('MyBucket', {
                type: DocumentType.JSON,
                text: 'Tags',
                propertyPath: ['Resources', 'MyBucket', 'Properties', 'Tags'],
                data: { Type: 'AWS::S3::Bucket' },
                nodeType: 'string',
            });

            const completions: CompletionList = {
                isIncomplete: false,
                items: [
                    {
                        label: 'Tags',
                        kind: CompletionItemKind.Property,
                        data: { type: 'simple' },
                    },
                ],
            };

            const lineContent = '        "Tags"';
            const result = formatter.format(
                completions,
                mockContext,
                defaultEditorSettings,
                lineContent,
                mockSchemaRetriever,
            );

            expect(result.items[0].textEdit).toBeDefined();
            expect(result.items[0].textEdit?.newText).toContain('"Tags": [');
            expect(result.items[0].textEdit?.newText).toContain(']');
        });

        test('should format string properties with quotes in JSON', () => {
            const mockContext = createResourceContext('MyBucket', {
                type: DocumentType.JSON,
                text: 'BucketName',
                propertyPath: ['Resources', 'MyBucket', 'Properties', 'BucketName'],
                data: { Type: 'AWS::S3::Bucket' },
                nodeType: 'string',
            });

            const completions: CompletionList = {
                isIncomplete: false,
                items: [
                    {
                        label: 'BucketName',
                        kind: CompletionItemKind.Property,
                        data: { type: 'simple' },
                    },
                ],
            };

            const lineContent = '        "BucketName"';
            const result = formatter.format(
                completions,
                mockContext,
                defaultEditorSettings,
                lineContent,
                mockSchemaRetriever,
            );

            expect(result.items[0].textEdit).toBeDefined();
            expect(result.items[0].textEdit?.newText).toContain('"BucketName": "$0"');
        });

        test('should use explicit data.type when provided', () => {
            const mockContext = createResourceContext('MyBucket', {
                type: DocumentType.JSON,
                text: 'Properties',
                propertyPath: ['Resources', 'MyBucket', 'Properties'],
                data: { Type: 'AWS::S3::Bucket' },
                nodeType: 'string',
            });

            const completions: CompletionList = {
                isIncomplete: false,
                items: [
                    {
                        label: 'Properties',
                        kind: CompletionItemKind.Property,
                        data: { type: 'object' },
                    },
                ],
            };

            const lineContent = '      "Properties"';
            const result = formatter.format(
                completions,
                mockContext,
                defaultEditorSettings,
                lineContent,
                mockSchemaRetriever,
            );

            expect(result.items[0].textEdit).toBeDefined();
            expect(result.items[0].textEdit?.newText).toContain('"Properties": {');
            // Should not call schema lookup since explicit type is provided
            expect(mockResourceSchema.resolveJsonPointerPath).not.toHaveBeenCalled();
        });

        test('should handle resource attributes with predefined types', () => {
            const mockContext = createResourceContext('MyBucket', {
                type: DocumentType.JSON,
                text: 'Metadata',
                propertyPath: ['Resources', 'MyBucket', 'Metadata'],
                data: { Type: 'AWS::S3::Bucket' },
                nodeType: 'string',
            });

            const completions: CompletionList = {
                isIncomplete: false,
                items: [
                    {
                        label: 'Metadata',
                        kind: CompletionItemKind.Property,
                    },
                ],
            };

            const lineContent = '      "Metadata"';
            const result = formatter.format(
                completions,
                mockContext,
                defaultEditorSettings,
                lineContent,
                mockSchemaRetriever,
            );

            expect(result.items[0].textEdit).toBeDefined();
            expect(result.items[0].textEdit?.newText).toContain('"Metadata": {');
            expect(result.items[0].textEdit?.newText).toContain('}');
        });

        test('should handle DependsOn as string type', () => {
            const mockContext = createResourceContext('MyBucket', {
                type: DocumentType.JSON,
                text: 'DependsOn',
                propertyPath: ['Resources', 'MyBucket'],
                data: { Type: 'AWS::S3::Bucket' },
            });

            const completions: CompletionList = {
                isIncomplete: false,
                items: [
                    {
                        label: 'DependsOn',
                        kind: CompletionItemKind.Property,
                    },
                ],
            };

            const lineContent = '      "DependsOn"';
            const result = formatter.format(
                completions,
                mockContext,
                defaultEditorSettings,
                lineContent,
                mockSchemaRetriever,
            );

            expect(result.items[0].textEdit).toBeDefined();
            // DependsOn is a string type, so should not format as object
            expect(result.items[0].textEdit?.newText).toContain('"DependsOn":');
            expect(result.items[0].textEdit?.newText).not.toContain('{');
        });

        test('should not format when lineContent is missing', () => {
            const mockContext = createResourceContext('MyBucket', {
                type: DocumentType.JSON,
                text: 'BucketEncryption',
                propertyPath: ['Resources', 'MyBucket', 'Properties', 'BucketEncryption'],
                data: { Type: 'AWS::S3::Bucket' },
                nodeType: 'string',
            });

            const completions: CompletionList = {
                isIncomplete: false,
                items: [
                    {
                        label: 'BucketEncryption',
                        kind: CompletionItemKind.Property,
                    },
                ],
            };

            const result = formatter.format(
                completions,
                mockContext,
                defaultEditorSettings,
                undefined,
                mockSchemaRetriever,
            );

            expect(result.items[0].textEdit).toBeDefined();
            // Without lineContent, shouldFormat is false, so it just adds the basic format with indentation
            expect(result.items[0].textEdit?.newText).toContain('"BucketEncryption":');
        });

        test('should handle missing schema gracefully', () => {
            const mockContext = createResourceContext('MyResource', {
                type: DocumentType.JSON,
                text: 'SomeProperty',
                propertyPath: ['Resources', 'MyResource', 'Properties'],
                data: { Type: 'AWS::Unknown::Resource' },
            });

            const completions: CompletionList = {
                isIncomplete: false,
                items: [
                    {
                        label: 'SomeProperty',
                        kind: CompletionItemKind.Property,
                    },
                ],
            };

            const lineContent = '        "SomeProperty"';
            const result = formatter.format(
                completions,
                mockContext,
                defaultEditorSettings,
                lineContent,
                mockSchemaRetriever,
            );

            // Should not crash and should return basic formatting
            expect(result.items[0].textEdit).toBeDefined();
            expect(result.items[0].textEdit?.newText).toContain('"SomeProperty":');
        });

        test('should handle array type in schema', () => {
            const mockContext = createResourceContext('MyBucket', {
                type: DocumentType.JSON,
                text: 'Tags',
                propertyPath: ['Resources', 'MyBucket', 'Properties', 'Tags'],
                data: { Type: 'AWS::S3::Bucket' },
                nodeType: 'string',
            });

            const completions: CompletionList = {
                isIncomplete: false,
                items: [
                    {
                        label: 'Tags',
                        kind: CompletionItemKind.Property,
                    },
                ],
            };

            const lineContent = '        "Tags"';
            const result = formatter.format(
                completions,
                mockContext,
                defaultEditorSettings,
                lineContent,
                mockSchemaRetriever,
            );

            expect(result.items[0].textEdit).toBeDefined();
            const newText = result.items[0].textEdit?.newText ?? '';
            expect(newText).toContain('"Tags": [');
            expect(newText).toContain(']');
        });

        test('should preserve indentation in formatted output', () => {
            // Create a mock context with custom startPosition
            const mockContext = createResourceContext('MyBucket', {
                type: DocumentType.JSON,
                text: 'BucketEncryption',
                propertyPath: ['Resources', 'MyBucket', 'Properties'],
                data: { Type: 'AWS::S3::Bucket' },
            });

            // Override the startPosition using Object.defineProperty to bypass readonly
            Object.defineProperty(mockContext, 'startPosition', {
                value: { row: 5, column: 8 },
                writable: false,
                configurable: true,
            });

            const completions: CompletionList = {
                isIncomplete: false,
                items: [
                    {
                        label: 'BucketEncryption',
                        kind: CompletionItemKind.Property,
                    },
                ],
            };

            const lineContent = '        "BucketEncryption"';
            const result = formatter.format(
                completions,
                mockContext,
                defaultEditorSettings,
                lineContent,
                mockSchemaRetriever,
            );

            expect(result.items[0].textEdit).toBeDefined();
            const newText = result.items[0].textEdit?.newText ?? '';
            // Should maintain the 8-space indentation
            expect(newText).toMatch(/^ {8}"/);
        });
    });

    describe('getIndentPlaceholder', () => {
        test('should return {INDENT1} for single indent level', () => {
            expect(CompletionFormatter.getIndentPlaceholder(1)).toBe('{INDENT1}');
        });

        test('should return {INDENT2} for double indent level', () => {
            expect(CompletionFormatter.getIndentPlaceholder(2)).toBe('{INDENT2}');
        });

        test('should return {INDENT5} for five indent levels', () => {
            expect(CompletionFormatter.getIndentPlaceholder(5)).toBe('{INDENT5}');
        });
    });

    describe('YAML intrinsic function formatting', () => {
        test('should not add colon to intrinsic function items', () => {
            const mockContext = createTopLevelContext('Resources', { type: DocumentType.YAML });
            const completions: CompletionList = {
                isIncomplete: false,
                items: [
                    {
                        label: '!Ref',
                        kind: CompletionItemKind.Function,
                        data: { isIntrinsicFunction: true },
                    },
                    {
                        label: '!Sub',
                        kind: CompletionItemKind.Function,
                        data: { isIntrinsicFunction: true },
                    },
                ],
            };

            const result = formatter.format(completions, mockContext, defaultEditorSettings);

            expect(result.items[0].insertText).toBe('!Ref');
            expect(result.items[1].insertText).toBe('!Sub');
        });

        test('should not add colon to Constant kind items', () => {
            const mockContext = createTopLevelContext('Resources', { type: DocumentType.YAML });
            const completions: CompletionList = {
                isIncomplete: false,
                items: [{ label: 'MyConstant', kind: CompletionItemKind.Constant }],
            };

            const result = formatter.format(completions, mockContext, defaultEditorSettings);

            expect(result.items[0].insertText).toBe('MyConstant');
        });

        test('should not add colon to Event kind items', () => {
            const mockContext = createTopLevelContext('Resources', { type: DocumentType.YAML });
            const completions: CompletionList = {
                isIncomplete: false,
                items: [{ label: 'MyEvent', kind: CompletionItemKind.Event }],
            };

            const result = formatter.format(completions, mockContext, defaultEditorSettings);

            expect(result.items[0].insertText).toBe('MyEvent');
        });

        test('should format Properties label with colon and newline indent', () => {
            const mockContext = createTopLevelContext('Resources', { type: DocumentType.YAML });
            const completions: CompletionList = {
                isIncomplete: false,
                items: [{ label: 'Properties', kind: CompletionItemKind.Property }],
            };

            const result = formatter.format(completions, mockContext, defaultEditorSettings);

            expect(result.items[0].insertText).toBe('Properties:\n  ');
        });
    });

    describe('snippet format preservation', () => {
        test('should skip formatting for items with InsertTextFormat.Snippet', () => {
            const mockContext = createTopLevelContext('Resources', { type: DocumentType.YAML });
            const snippetText = 'MySnippet:\n  Key: ${1:value}';
            const completions: CompletionList = {
                isIncomplete: false,
                items: [
                    {
                        label: 'MySnippet',
                        kind: CompletionItemKind.Snippet,
                        insertText: snippetText,
                        insertTextFormat: InsertTextFormat.Snippet,
                    },
                ],
            };

            const result = formatter.format(completions, mockContext, defaultEditorSettings);

            expect(result.items[0].insertText).toBe(snippetText);
            expect(result.items[0].insertTextFormat).toBe(InsertTextFormat.Snippet);
        });
    });

    describe('JSON filterText handling', () => {
        test('should set filterText with quotes when in JSON string context', () => {
            const mockContext = createTopLevelContext('Unknown', {
                type: DocumentType.JSON,
                nodeType: 'string',
                text: 'Res',
                propertyPath: ['Res'],
            });
            const completions: CompletionList = {
                isIncomplete: false,
                items: [{ label: 'Resources', kind: CompletionItemKind.Property }],
            };

            const result = formatter.format(completions, mockContext, defaultEditorSettings);

            expect(result.items[0].filterText).toBe('"Res"');
        });
    });

    describe('JSON Description formatting', () => {
        test('should format Description as string type in JSON', () => {
            const mockContext = createResourceContext('MyResource', {
                type: DocumentType.JSON,
                text: 'Description',
                propertyPath: ['Description'],
                nodeType: 'string',
            });

            const completions: CompletionList = {
                isIncomplete: false,
                items: [{ label: 'Description', kind: CompletionItemKind.Property }],
            };

            const lineContent = '  "Description"';
            const result = formatter.format(completions, mockContext, defaultEditorSettings, lineContent);

            expect(result.items[0].textEdit).toBeDefined();
            expect(result.items[0].textEdit?.newText).toContain('"Description": "$0"');
        });
    });

    describe('schema type array handling', () => {
        let mockSchemaRetriever: SchemaRetriever;
        let mockCombinedSchemas: CombinedSchemas;
        let mockResourceSchema: ResourceSchema;

        beforeEach(() => {
            mockResourceSchema = {
                resolveJsonPointerPath: vi.fn((path: string) => {
                    if (path === '/properties/MultiTypeProperty') {
                        return [{ type: ['string', 'number'] }];
                    }
                    return [];
                }),
            } as unknown as ResourceSchema;

            mockCombinedSchemas = {
                schemas: new Map([['AWS::Custom::Resource', mockResourceSchema]]),
            } as CombinedSchemas;

            mockSchemaRetriever = {
                getDefault: vi.fn(() => mockCombinedSchemas),
            } as unknown as SchemaRetriever;
        });

        test('should use first type from array type definition', () => {
            const mockContext = createResourceContext('MyResource', {
                type: DocumentType.JSON,
                text: 'MultiTypeProperty',
                propertyPath: ['Resources', 'MyResource', 'Properties', 'MultiTypeProperty'],
                data: { Type: 'AWS::Custom::Resource' },
                nodeType: 'string',
            });

            const completions: CompletionList = {
                isIncomplete: false,
                items: [{ label: 'MultiTypeProperty', kind: CompletionItemKind.Property }],
            };

            const lineContent = '        "MultiTypeProperty"';
            const result = formatter.format(
                completions,
                mockContext,
                defaultEditorSettings,
                lineContent,
                mockSchemaRetriever,
            );

            expect(result.items[0].textEdit).toBeDefined();
            // First type is 'string', so should format as string
            expect(result.items[0].textEdit?.newText).toContain('"MultiTypeProperty": "$0"');
        });
    });

    describe('JSON value completions', () => {
        function mockValueNode(context: any) {
            const node = context.syntaxNode;
            const pairParent = {
                type: 'pair',
                childForFieldName: (name: string) => (name === 'value' ? node : null),
            };
            Object.defineProperty(node, 'parent', { value: pairParent, writable: true });
        }

        test('should format resource type value completion without colon', () => {
            const mockContext = createResourceContext('MyBucket', {
                type: DocumentType.JSON,
                text: 'AWS::S3::B',
                propertyPath: ['Resources', 'MyBucket', 'Type'],
                data: { Type: 'AWS::S3::B' },
                nodeType: 'string',
            });
            mockValueNode(mockContext);

            const completions: CompletionList = {
                isIncomplete: false,
                items: [
                    {
                        label: 'AWS::S3::Bucket',
                        kind: CompletionItemKind.Class,
                    },
                ],
            };

            const lineContent = '      "Type": "AWS::S3::B"';
            const result = formatter.format(completions, mockContext, defaultEditorSettings, lineContent);

            expect(result.items[0].textEdit).toBeDefined();
            // Value completions should not append a colon after the value
            expect(result.items[0].textEdit?.newText).not.toMatch(/:$/);
            expect(result.items[0].textEdit?.newText).not.toMatch(/:\s*$/);
            // Should include quotes around the value
            expect(result.items[0].textEdit?.newText).toContain('"AWS::S3::Bucket"');
            // filterText should include quotes for VS Code matching
            expect(result.items[0].filterText).toBe('"AWS::S3::Bucket"');
        });

        test('should not replace the key when completing a value', () => {
            const mockContext = createResourceContext('MyBucket', {
                type: DocumentType.JSON,
                text: 'AWS::S3::B',
                propertyPath: ['Resources', 'MyBucket', 'Type'],
                data: { Type: 'AWS::S3::B' },
                nodeType: 'string',
            });
            mockValueNode(mockContext);

            const completions: CompletionList = {
                isIncomplete: false,
                items: [
                    {
                        label: 'AWS::S3::Bucket',
                        kind: CompletionItemKind.Class,
                    },
                ],
            };

            const lineContent = '      "Type": "AWS::S3::B"';
            const result = formatter.format(completions, mockContext, defaultEditorSettings, lineContent);

            // Range should start near the value, not at column 0
            const textEdit = result.items[0].textEdit as any;
            expect(textEdit.range.start.character).toBeGreaterThan(0);
        });
    });
});
