import { stubInterface } from 'ts-sinon';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { Range, WorkspaceEdit } from 'vscode-languageserver';
import { Context } from '../../../../src/context/Context';
import { TopLevelSection } from '../../../../src/context/ContextType';
import { SyntaxTree } from '../../../../src/context/syntaxtree/SyntaxTree';
import { SyntaxTreeManager } from '../../../../src/context/syntaxtree/SyntaxTreeManager';
import { DocumentType } from '../../../../src/document/Document';
import { ExtractToParameterProvider } from '../../../../src/services/extractToParameter/ExtractToParameterProvider';
import { ParameterType } from '../../../../src/services/extractToParameter/ExtractToParameterTypes';
import { EditorSettings } from '../../../../src/settings/Settings';

describe('ExtractToParameterProvider', () => {
    let provider: ExtractToParameterProvider;
    let mockContext: Context;
    let mockRange: Range;
    let mockEditorSettings: EditorSettings;
    let mockSyntaxTreeManager: ReturnType<typeof stubInterface<SyntaxTreeManager>>;
    let mockSyntaxTree: ReturnType<typeof stubInterface<SyntaxTree>>;

    beforeEach(() => {
        mockSyntaxTreeManager = stubInterface<SyntaxTreeManager>();
        mockSyntaxTree = stubInterface<SyntaxTree>();
        provider = new ExtractToParameterProvider(mockSyntaxTreeManager);

        mockRange = {
            start: { line: 0, character: 0 },
            end: { line: 0, character: 10 },
        };

        mockEditorSettings = {
            insertSpaces: true,
            tabSize: 2,
            detectIndentation: false,
        };

        // Create a minimal mock context
        mockContext = {
            documentType: DocumentType.JSON,
            section: 'Resources',
            hasLogicalId: true,
            logicalId: 'MyResource',
            propertyPath: ['Resources', 'MyResource', 'Properties', 'InstanceType'],
            text: 't2.micro',
            isValue: () => true,
            isKey: () => false,
            getRootEntityText: () => '',
            syntaxNode: {
                type: 'string',
                text: '"t2.micro"',
                startPosition: { row: 0, column: 0 },
                endPosition: { row: 0, column: 10 },
            },
        } as any;
    });

    describe('canExtract method', () => {
        it('should return true for valid string literal in resource property', () => {
            const result = provider.canExtract(mockContext);
            expect(result).toBe(true);
        });

        it('should return false when context is not a value', () => {
            vi.spyOn(mockContext, 'isValue').mockReturnValue(false);

            const result = provider.canExtract(mockContext);
            expect(result).toBe(false);
        });

        it('should return false for intrinsic function references', () => {
            (mockContext.syntaxNode as any) = {
                type: 'object',
                text: '{"Ref": "MyParameter"}',
                startPosition: { row: 0, column: 0 },
                endPosition: { row: 0, column: 22 },
                children: [
                    {
                        type: 'pair',
                        children: [
                            { type: 'string', text: '"Ref"' },
                            { type: 'string', text: '"MyParameter"' },
                        ],
                    },
                ],
            } as any;

            const result = provider.canExtract(mockContext);
            expect(result).toBe(false);
        });

        it('should return false for YAML intrinsic function references', () => {
            (mockContext.documentType as any) = DocumentType.YAML;
            (mockContext.syntaxNode as any) = {
                type: 'flow_node',
                text: '!Ref MyParameter',
                startPosition: { row: 0, column: 0 },
                endPosition: { row: 0, column: 16 },
                children: [
                    { type: 'tag', text: '!Ref' },
                    { type: 'plain_scalar', text: 'MyParameter' },
                ],
            } as any;

            const result = provider.canExtract(mockContext);
            expect(result).toBe(false);
        });

        it('should return true for number literals', () => {
            (mockContext.syntaxNode as any) = {
                type: 'number',
                text: '42',
                startPosition: { row: 0, column: 0 },
                endPosition: { row: 0, column: 2 },
            } as any;

            const result = provider.canExtract(mockContext);
            expect(result).toBe(true);
        });

        it('should return true for boolean literals', () => {
            (mockContext.syntaxNode as any) = {
                type: 'true',
                text: 'true',
                startPosition: { row: 0, column: 0 },
                endPosition: { row: 0, column: 4 },
            } as any;

            const result = provider.canExtract(mockContext);
            expect(result).toBe(true);
        });

        it('should return true for array literals', () => {
            (mockContext.syntaxNode as any) = {
                type: 'array',
                text: '["item1", "item2"]',
                startPosition: { row: 0, column: 0 },
                endPosition: { row: 0, column: 18 },
                children: [
                    { type: 'string', text: '"item1"' },
                    { type: 'string', text: '"item2"' },
                ],
            } as any;

            const result = provider.canExtract(mockContext);
            expect(result).toBe(true);
        });

        it('should return false for unsupported node types', () => {
            (mockContext.syntaxNode as any) = {
                type: 'comment',
                text: '# This is a comment',
                startPosition: { row: 0, column: 0 },
                endPosition: { row: 0, column: 19 },
            } as any;

            const result = provider.canExtract(mockContext);
            expect(result).toBe(false);
        });

        it('should return false for null or undefined nodes', () => {
            (mockContext.syntaxNode as any) = null as any;

            const result = provider.canExtract(mockContext);
            expect(result).toBe(false);
        });
    });

    describe('generateExtraction method', () => {
        it('should generate extraction for string literal with proper parameter name', () => {
            // Mock template content for structure utils
            const mockTemplateContent = `{
                "AWSTemplateFormatVersion": "2010-09-09",
                "Resources": {
                    "MyResource": {
                        "Type": "AWS::EC2::Instance",
                        "Properties": {
                            "InstanceType": "t2.micro"
                        }
                    }
                }
            }`;

            // Mock the document to return template content
            vi.spyOn(mockContext as any, 'getRootEntityText').mockReturnValue(mockTemplateContent);

            const result = provider.generateExtraction(mockContext, mockRange, mockEditorSettings);

            expect(result).toBeDefined();
            expect(result?.parameterName).toBe('MyResourceInstanceType');
            expect(result?.parameterDefinition.Type).toBe(ParameterType.STRING);
            expect(result?.parameterDefinition.Default).toBe('t2.micro');
            expect(result?.parameterDefinition.Description).toBe('');
            expect(result?.replacementEdit.newText).toBe('{"Ref": "MyResourceInstanceType"}');
        });

        it('should generate extraction for number literal', () => {
            (mockContext.syntaxNode as any) = {
                type: 'number',
                text: '42',
                startPosition: { row: 0, column: 0 },
                endPosition: { row: 0, column: 2 },
            } as any;
            (mockContext.text as any) = '42';

            const mockTemplateContent = `{
                "Resources": {
                    "MyResource": {
                        "Properties": {
                            "Port": 42
                        }
                    }
                }
            }`;

            vi.spyOn(mockContext as any, 'getRootEntityText').mockReturnValue(mockTemplateContent);

            const result = provider.generateExtraction(mockContext, mockRange, mockEditorSettings);

            expect(result).toBeDefined();
            expect(result?.parameterDefinition.Type).toBe(ParameterType.NUMBER);
            expect(result?.parameterDefinition.Default).toBe(42);
        });

        it('should generate extraction for boolean literal with AllowedValues', () => {
            (mockContext.syntaxNode as any) = {
                type: 'true',
                text: 'true',
                startPosition: { row: 0, column: 0 },
                endPosition: { row: 0, column: 4 },
            } as any;
            (mockContext.text as any) = 'true';

            const mockTemplateContent = `{
                "Resources": {
                    "MyResource": {
                        "Properties": {
                            "Enabled": true
                        }
                    }
                }
            }`;

            vi.spyOn(mockContext as any, 'getRootEntityText').mockReturnValue(mockTemplateContent);

            const result = provider.generateExtraction(mockContext, mockRange, mockEditorSettings);

            expect(result).toBeDefined();
            expect(result?.parameterDefinition.Type).toBe(ParameterType.STRING);
            expect(result?.parameterDefinition.Default).toBe('true');
            expect(result?.parameterDefinition.AllowedValues).toEqual(['true', 'false']);
        });

        it('should generate extraction for array literal', () => {
            (mockContext.syntaxNode as any) = {
                type: 'array',
                text: '["item1", "item2"]',
                startPosition: { row: 0, column: 0 },
                endPosition: { row: 0, column: 18 },
                children: [
                    { type: 'string', text: '"item1"' },
                    { type: 'string', text: '"item2"' },
                ],
            } as any;
            (mockContext.text as any) = '["item1", "item2"]';

            const mockTemplateContent = `{
                "Resources": {
                    "MyResource": {
                        "Properties": {
                            "Items": ["item1", "item2"]
                        }
                    }
                }
            }`;

            vi.spyOn(mockContext as any, 'getRootEntityText').mockReturnValue(mockTemplateContent);

            const result = provider.generateExtraction(mockContext, mockRange, mockEditorSettings);

            expect(result).toBeDefined();
            expect(result?.parameterDefinition.Type).toBe(ParameterType.COMMA_DELIMITED_LIST);
            expect(result?.parameterDefinition.Default).toBe('item1,item2');
        });

        it('should handle YAML format with proper reference syntax', () => {
            (mockContext.documentType as any) = DocumentType.YAML;
            (mockContext.syntaxNode as any) = {
                type: 'plain_scalar',
                text: 't2.micro',
                startPosition: { row: 0, column: 0 },
                endPosition: { row: 0, column: 8 },
            } as any;

            const mockTemplateContent = `
AWSTemplateFormatVersion: '2010-09-09'
Resources:
  MyResource:
    Type: AWS::EC2::Instance
    Properties:
      InstanceType: t2.micro
            `;

            vi.spyOn(mockContext as any, 'getRootEntityText').mockReturnValue(mockTemplateContent);

            const result = provider.generateExtraction(mockContext, mockRange, mockEditorSettings);

            expect(result).toBeDefined();
            expect(result?.replacementEdit.newText).toBe('!Ref MyResourceInstanceType');
        });

        it('should generate unique parameter names when conflicts exist', () => {
            const mockTemplateContent = `{
                "Parameters": {
                    "MyResourceInstanceType": {
                        "Type": "String",
                        "Default": "existing"
                    }
                },
                "Resources": {
                    "MyResource": {
                        "Properties": {
                            "InstanceType": "t2.micro"
                        }
                    }
                }
            }`;

            vi.spyOn(mockContext as any, 'getRootEntityText').mockReturnValue(mockTemplateContent);

            const result = provider.generateExtraction(mockContext, mockRange, mockEditorSettings);

            expect(result).toBeDefined();
            expect(result?.parameterName).toBe('MyResourceInstanceType2');
        });

        it('should return undefined for non-extractable contexts', () => {
            vi.spyOn(mockContext, 'isValue').mockReturnValue(false);

            const result = provider.generateExtraction(mockContext, mockRange, mockEditorSettings);

            expect(result).toBeUndefined();
        });

        it('should handle empty template content gracefully', () => {
            vi.spyOn(mockContext as any, 'getRootEntityText').mockReturnValue('');

            const result = provider.generateExtraction(mockContext, mockRange, mockEditorSettings);

            expect(result).toBeDefined();
            expect(result?.parameterName).toBe('MyResourceInstanceType');
        });

        it('should handle malformed template content gracefully', () => {
            vi.spyOn(mockContext as any, 'getRootEntityText').mockReturnValue('invalid json {');

            const result = provider.generateExtraction(mockContext, mockRange, mockEditorSettings);

            expect(result).toBeDefined();
            expect(result?.parameterName).toBe('MyResourceInstanceType');
        });
    });

    describe('parameter definitions', () => {
        it('should create parameters with empty descriptions', () => {
            const mockTemplateContent = `{
                "Resources": {
                    "MyResource": {
                        "Properties": {
                            "InstanceType": "t2.micro"
                        }
                    }
                }
            }`;

            vi.spyOn(mockContext as any, 'getRootEntityText').mockReturnValue(mockTemplateContent);

            const result = provider.generateExtraction(mockContext, mockRange, mockEditorSettings);

            expect(result).toBeDefined();
            expect(result?.parameterDefinition.Description).toBe('');
        });

        it('should create parameters with proper constraints for each type', () => {
            // Test string parameter - no additional constraints
            let result = provider.generateExtraction(mockContext, mockRange, mockEditorSettings);
            expect(result?.parameterDefinition.AllowedValues).toBeUndefined();

            // Test boolean parameter - has AllowedValues constraint
            (mockContext.syntaxNode as any) = {
                type: 'true',
                text: 'true',
                startPosition: { row: 0, column: 0 },
                endPosition: { row: 0, column: 4 },
            } as any;

            const mockTemplateContent = `{
                "Resources": {
                    "MyResource": {
                        "Properties": {
                            "Enabled": true
                        }
                    }
                }
            }`;

            vi.spyOn(mockContext as any, 'getRootEntityText').mockReturnValue(mockTemplateContent);

            result = provider.generateExtraction(mockContext, mockRange, mockEditorSettings);
            expect(result?.parameterDefinition.AllowedValues).toEqual(['true', 'false']);
        });
    });

    describe('workspace edit creation', () => {
        const testDocumentUri = 'file:///test/template.yaml';

        it('should create workspace edit from extraction result', () => {
            const mockTemplateContent = `{
                "Resources": {
                    "MyResource": {
                        "Properties": {
                            "InstanceType": "t2.micro"
                        }
                    }
                }
            }`;

            vi.spyOn(mockContext as any, 'getRootEntityText').mockReturnValue(mockTemplateContent);

            const extractionResult = provider.generateExtraction(mockContext, mockRange, mockEditorSettings);
            expect(extractionResult).toBeDefined();

            const workspaceEdit = provider.createWorkspaceEdit(testDocumentUri, extractionResult!);

            expect(workspaceEdit).toBeDefined();
            expect(workspaceEdit.changes).toBeDefined();
            expect(workspaceEdit.changes![testDocumentUri]).toHaveLength(2);
            expect(workspaceEdit.changes![testDocumentUri]).toContain(extractionResult!.parameterInsertionEdit);
            expect(workspaceEdit.changes![testDocumentUri]).toContain(extractionResult!.replacementEdit);
        });

        it('should validate workspace edits correctly', () => {
            const validWorkspaceEdit: WorkspaceEdit = {
                changes: {
                    [testDocumentUri]: [
                        {
                            range: {
                                start: { line: 1, character: 0 },
                                end: { line: 1, character: 0 },
                            },
                            newText: 'Parameters:\n',
                        },
                        {
                            range: {
                                start: { line: 5, character: 15 },
                                end: { line: 5, character: 25 },
                            },
                            newText: '!Ref TestParam',
                        },
                    ],
                },
            };

            expect(() => {
                provider.validateWorkspaceEdit(validWorkspaceEdit);
            }).not.toThrow();
        });

        it('should throw error for invalid workspace edits', () => {
            const invalidWorkspaceEdit: WorkspaceEdit = {
                changes: {
                    [testDocumentUri]: [
                        {
                            range: {
                                start: { line: 5, character: 10 },
                                end: { line: 5, character: 20 },
                            },
                            newText: 'First edit',
                        },
                        {
                            range: {
                                start: { line: 5, character: 15 },
                                end: { line: 5, character: 25 },
                            },
                            newText: 'Overlapping edit',
                        },
                    ],
                },
            };

            expect(() => {
                provider.validateWorkspaceEdit(invalidWorkspaceEdit);
            }).toThrow('Conflicting text edits detected');
        });

        it('should handle workspace edit creation for complex extraction results', () => {
            // Test with boolean parameter that has AllowedValues
            // Use a different range for the literal to avoid overlap with parameter insertion
            const literalRange: Range = {
                start: { line: 5, character: 20 },
                end: { line: 5, character: 24 },
            };

            (mockContext.syntaxNode as any) = {
                type: 'true',
                text: 'true',
                startPosition: { row: 5, column: 20 },
                endPosition: { row: 5, column: 24 },
            } as any;
            (mockContext.text as any) = 'true';

            const mockTemplateContent = `{
                "Resources": {
                    "MyResource": {
                        "Properties": {
                            "Enabled": true
                        }
                    }
                }
            }`;

            vi.spyOn(mockContext as any, 'getRootEntityText').mockReturnValue(mockTemplateContent);

            const extractionResult = provider.generateExtraction(mockContext, literalRange, mockEditorSettings);
            expect(extractionResult).toBeDefined();
            expect(extractionResult!.parameterDefinition.AllowedValues).toEqual(['true', 'false']);

            const workspaceEdit = provider.createWorkspaceEdit(testDocumentUri, extractionResult!);

            expect(workspaceEdit.changes![testDocumentUri]).toHaveLength(2);

            // The edits should be on different lines or positions to avoid conflicts
            const edits = workspaceEdit.changes![testDocumentUri];
            const parameterEdit = edits.find(
                (edit) => edit.newText.includes('Parameters') || edit.newText.includes('MyResourceEnabled'),
            );
            const replacementEdit = edits.find((edit) => edit.newText.includes('Ref'));

            expect(parameterEdit).toBeDefined();
            expect(replacementEdit).toBeDefined();

            // Validate the workspace edit
            expect(() => {
                provider.validateWorkspaceEdit(workspaceEdit);
            }).not.toThrow();
        });

        it('should handle workspace edit creation for YAML templates', () => {
            (mockContext.documentType as any) = DocumentType.YAML;
            (mockContext.syntaxNode as any) = {
                type: 'plain_scalar',
                text: 't2.micro',
                startPosition: { row: 0, column: 0 },
                endPosition: { row: 0, column: 8 },
            } as any;

            const mockTemplateContent = `
AWSTemplateFormatVersion: '2010-09-09'
Resources:
  MyResource:
    Type: AWS::EC2::Instance
    Properties:
      InstanceType: t2.micro
            `;

            vi.spyOn(mockContext as any, 'getRootEntityText').mockReturnValue(mockTemplateContent);

            const extractionResult = provider.generateExtraction(mockContext, mockRange, mockEditorSettings);
            expect(extractionResult).toBeDefined();
            expect(extractionResult!.replacementEdit.newText).toBe('!Ref MyResourceInstanceType');

            const workspaceEdit = provider.createWorkspaceEdit(testDocumentUri, extractionResult!);

            expect(workspaceEdit.changes![testDocumentUri]).toHaveLength(2);
            expect(workspaceEdit.changes![testDocumentUri][1].newText).toBe('!Ref MyResourceInstanceType');

            // Validate the workspace edit
            expect(() => {
                provider.validateWorkspaceEdit(workspaceEdit);
            }).not.toThrow();
        });
    });

    describe('hasMultipleOccurrences method', () => {
        it('should return true when multiple occurrences exist', () => {
            const mockTemplateContent = `{
                "Resources": {
                    "Bucket1": {
                        "Type": "AWS::S3::Bucket",
                        "Properties": {
                            "BucketName": "my-bucket"
                        }
                    },
                    "Bucket2": {
                        "Type": "AWS::S3::Bucket",
                        "Properties": {
                            "BucketName": "my-bucket"
                        }
                    }
                }
            }`;

            // Mock the syntax tree to return the template content with proper Resources section structure
            (mockContext.syntaxNode as any) = {
                type: 'string',
                text: '"my-bucket"',
                startPosition: { row: 0, column: 0 },
                endPosition: { row: 0, column: 11 },
                tree: {
                    rootNode: {
                        text: mockTemplateContent,
                        children: [
                            {
                                type: 'pair',
                                startPosition: { row: 0, column: 0 },
                                endPosition: { row: 0, column: 0 },
                                childForFieldName: (field: string) => {
                                    if (field === 'key') {
                                        return {
                                            text: '"Resources"',
                                            startPosition: { row: 0, column: 0 },
                                            endPosition: { row: 0, column: 0 },
                                        };
                                    }
                                    if (field === 'value') {
                                        return {
                                            type: 'object',
                                            startPosition: { row: 0, column: 0 },
                                            endPosition: { row: 0, column: 0 },
                                            children: [
                                                {
                                                    type: 'string',
                                                    text: '"my-bucket"',
                                                    startPosition: { row: 0, column: 0 },
                                                    endPosition: { row: 0, column: 11 },
                                                    children: [],
                                                },
                                                {
                                                    type: 'string',
                                                    text: '"my-bucket"',
                                                    startPosition: { row: 1, column: 0 },
                                                    endPosition: { row: 1, column: 11 },
                                                    children: [],
                                                },
                                            ],
                                        };
                                    }
                                    return null;
                                },
                                children: [],
                            },
                        ],
                    },
                },
            } as any;

            vi.spyOn(mockContext as any, 'getRootEntityText').mockReturnValue(mockTemplateContent);

            // Setup SyntaxTree mock to return Resources section with multiple occurrences
            const mockResourcesSection = {
                type: 'object',
                children: [
                    {
                        type: 'string',
                        text: '"my-bucket"',
                        startPosition: { row: 0, column: 0 },
                        endPosition: { row: 0, column: 11 },
                        children: [],
                    },
                    {
                        type: 'string',
                        text: '"my-bucket"',
                        startPosition: { row: 1, column: 0 },
                        endPosition: { row: 1, column: 11 },
                        children: [],
                    },
                ],
            };

            const sectionsMap = new Map();
            sectionsMap.set(TopLevelSection.Resources, mockResourcesSection as any);
            mockSyntaxTree.findTopLevelSections.returns(sectionsMap);
            mockSyntaxTreeManager.getSyntaxTree.returns(mockSyntaxTree);

            const result = provider.hasMultipleOccurrences(mockContext, 'file:///test.json');
            expect(result).toBe(true);
        });

        it('should return false when only one occurrence exists', () => {
            const mockTemplateContent = `{
                "Resources": {
                    "Bucket1": {
                        "Type": "AWS::S3::Bucket",
                        "Properties": {
                            "BucketName": "unique-bucket"
                        }
                    }
                }
            }`;

            (mockContext.syntaxNode as any) = {
                type: 'string',
                text: '"unique-bucket"',
                startPosition: { row: 0, column: 0 },
                endPosition: { row: 0, column: 15 },
                tree: {
                    rootNode: {
                        text: mockTemplateContent,
                        children: [
                            {
                                type: 'string',
                                text: '"unique-bucket"',
                                startPosition: { row: 0, column: 0 },
                                endPosition: { row: 0, column: 15 },
                                children: [],
                            },
                        ],
                    },
                },
            } as any;

            vi.spyOn(mockContext as any, 'getRootEntityText').mockReturnValue(mockTemplateContent);

            const result = provider.hasMultipleOccurrences(mockContext, 'file:///test.json');
            expect(result).toBe(false);
        });

        it('should return false for non-extractable contexts', () => {
            vi.spyOn(mockContext, 'isValue').mockReturnValue(false);

            const result = provider.hasMultipleOccurrences(mockContext, 'file:///test.json');
            expect(result).toBe(false);
        });
    });

    describe('generateAllOccurrencesExtraction method', () => {
        it('should generate extraction for all occurrences of a string literal', () => {
            const mockTemplateContent = `{
                "Resources": {
                    "Bucket1": {
                        "Type": "AWS::S3::Bucket",
                        "Properties": {
                            "BucketName": "my-bucket"
                        }
                    },
                    "Bucket2": {
                        "Type": "AWS::S3::Bucket",
                        "Properties": {
                            "BucketName": "my-bucket"
                        }
                    }
                }
            }`;

            (mockContext.syntaxNode as any) = {
                type: 'string',
                text: '"my-bucket"',
                startPosition: { row: 0, column: 0 },
                endPosition: { row: 0, column: 11 },
                tree: {
                    rootNode: {
                        text: mockTemplateContent,
                        children: [
                            {
                                type: 'pair',
                                startPosition: { row: 0, column: 0 },
                                endPosition: { row: 0, column: 0 },
                                childForFieldName: (field: string) => {
                                    if (field === 'key') {
                                        return {
                                            text: '"Resources"',
                                            startPosition: { row: 0, column: 0 },
                                            endPosition: { row: 0, column: 0 },
                                        };
                                    }
                                    if (field === 'value') {
                                        return {
                                            type: 'object',
                                            startPosition: { row: 0, column: 0 },
                                            endPosition: { row: 0, column: 0 },
                                            children: [
                                                {
                                                    type: 'string',
                                                    text: '"my-bucket"',
                                                    startPosition: { row: 0, column: 0 },
                                                    endPosition: { row: 0, column: 11 },
                                                    children: [],
                                                },
                                                {
                                                    type: 'string',
                                                    text: '"my-bucket"',
                                                    startPosition: { row: 1, column: 0 },
                                                    endPosition: { row: 1, column: 11 },
                                                    children: [],
                                                },
                                            ],
                                        };
                                    }
                                    return null;
                                },
                                children: [],
                            },
                        ],
                    },
                },
            } as any;

            vi.spyOn(mockContext as any, 'getRootEntityText').mockReturnValue(mockTemplateContent);

            // Setup SyntaxTree mock to return Resources section with multiple occurrences
            const mockResourcesSection = {
                type: 'object',
                children: [
                    {
                        type: 'string',
                        text: '"my-bucket"',
                        startPosition: { row: 0, column: 0 },
                        endPosition: { row: 0, column: 11 },
                        children: [],
                    },
                    {
                        type: 'string',
                        text: '"my-bucket"',
                        startPosition: { row: 1, column: 0 },
                        endPosition: { row: 1, column: 11 },
                        children: [],
                    },
                ],
            };

            const sectionsMap = new Map();
            sectionsMap.set(TopLevelSection.Resources, mockResourcesSection as any);
            mockSyntaxTree.findTopLevelSections.returns(sectionsMap);
            mockSyntaxTreeManager.getSyntaxTree.returns(mockSyntaxTree);

            const result = provider.generateAllOccurrencesExtraction(
                mockContext,
                mockRange,
                mockEditorSettings,
                'file:///test.json',
            );

            expect(result).toBeDefined();
            expect(result?.parameterName).toBe('MyResourceInstanceType');
            expect(result?.parameterDefinition.Type).toBe(ParameterType.STRING);
            expect(result?.parameterDefinition.Default).toBe('my-bucket');
            expect(result?.replacementEdits).toBeDefined();
            expect(result?.replacementEdits.length).toBeGreaterThan(0);
            expect(result?.parameterInsertionEdit).toBeDefined();
        });

        it('should return undefined for non-extractable contexts', () => {
            vi.spyOn(mockContext, 'isValue').mockReturnValue(false);

            const result = provider.generateAllOccurrencesExtraction(
                mockContext,
                mockRange,
                mockEditorSettings,
                'file:///test.json',
            );
            expect(result).toBeUndefined();
        });

        it('should handle templates with no syntax tree', () => {
            (mockContext.syntaxNode as any) = {
                type: 'string',
                text: '"my-bucket"',
                startPosition: { row: 0, column: 0 },
                endPosition: { row: 0, column: 11 },
            } as any;

            // Don't pass URI to simulate no syntax tree available
            const result = provider.generateAllOccurrencesExtraction(mockContext, mockRange, mockEditorSettings);
            expect(result).toBeUndefined();
        });
    });
});
