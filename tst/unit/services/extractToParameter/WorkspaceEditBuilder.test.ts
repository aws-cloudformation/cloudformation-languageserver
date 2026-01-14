import { describe, it, expect, beforeEach } from 'vitest';
import { WorkspaceEdit, TextEdit } from 'vscode-languageserver';
import { ParameterType } from '../../../../src/context/semantic/ParameterType';
import { ExtractToParameterResult } from '../../../../src/services/extractToParameter/ExtractToParameterTypes';
import { WorkspaceEditBuilder } from '../../../../src/services/extractToParameter/WorkspaceEditBuilder';

describe('WorkspaceEditBuilder', () => {
    let builder: WorkspaceEditBuilder;
    const testDocumentUri = 'file:///test/template.yaml';

    beforeEach(() => {
        builder = new WorkspaceEditBuilder();
    });

    describe('createWorkspaceEdit', () => {
        it('should create workspace edit from extraction result', () => {
            const extractionResult: ExtractToParameterResult = {
                parameterName: 'InstanceTypeParam',
                parameterDefinition: {
                    Type: ParameterType.String,
                    Default: 't2.micro',
                    Description: '',
                },
                replacementEdit: {
                    range: {
                        start: { line: 5, character: 15 },
                        end: { line: 5, character: 25 },
                    },
                    newText: '!Ref InstanceTypeParam',
                },
                parameterInsertionEdit: {
                    range: {
                        start: { line: 1, character: 0 },
                        end: { line: 1, character: 0 },
                    },
                    newText:
                        'Parameters:\n  InstanceTypeParam:\n    Type: String\n    Default: t2.micro\n    Description: ""\n',
                },
            };

            const result = builder.createWorkspaceEdit(testDocumentUri, extractionResult);

            expect(result).toBeDefined();
            expect(result.changes).toBeDefined();
            expect(result.changes![testDocumentUri]).toHaveLength(2);
            expect(result.changes![testDocumentUri]).toContain(extractionResult.parameterInsertionEdit);
            expect(result.changes![testDocumentUri]).toContain(extractionResult.replacementEdit);
        });

        it('should handle extraction result with boolean parameter', () => {
            const extractionResult: ExtractToParameterResult = {
                parameterName: 'EnableFeature',
                parameterDefinition: {
                    Type: ParameterType.String,
                    Default: 'true',
                    Description: '',
                    AllowedValues: ['true', 'false'],
                },
                replacementEdit: {
                    range: {
                        start: { line: 3, character: 10 },
                        end: { line: 3, character: 14 },
                    },
                    newText: '{"Ref": "EnableFeature"}',
                },
                parameterInsertionEdit: {
                    range: {
                        start: { line: 2, character: 4 },
                        end: { line: 2, character: 4 },
                    },
                    newText:
                        '\n    "EnableFeature": {\n      "Type": "String",\n      "Default": "true",\n      "Description": "",\n      "AllowedValues": ["true", "false"]\n    },',
                },
            };

            const result = builder.createWorkspaceEdit(testDocumentUri, extractionResult);

            expect(result.changes![testDocumentUri]).toHaveLength(2);
            expect(result.changes![testDocumentUri][0]).toEqual(extractionResult.parameterInsertionEdit);
            expect(result.changes![testDocumentUri][1]).toEqual(extractionResult.replacementEdit);
        });
    });

    describe('createWorkspaceEditFromEdits', () => {
        it('should create workspace edit from multiple non-overlapping edits', () => {
            const edits: TextEdit[] = [
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
            ];

            const result = builder.createWorkspaceEditFromEdits(testDocumentUri, edits);

            expect(result.changes![testDocumentUri]).toHaveLength(2);
            // Edits should be sorted in reverse order (bottom to top)
            expect(result.changes![testDocumentUri][0].range.start.line).toBe(5);
            expect(result.changes![testDocumentUri][1].range.start.line).toBe(1);
        });

        it('should sort edits in reverse document order for proper application', () => {
            const edits: TextEdit[] = [
                {
                    range: {
                        start: { line: 1, character: 0 },
                        end: { line: 1, character: 0 },
                    },
                    newText: 'First edit',
                },
                {
                    range: {
                        start: { line: 3, character: 5 },
                        end: { line: 3, character: 10 },
                    },
                    newText: 'Second edit',
                },
                {
                    range: {
                        start: { line: 2, character: 0 },
                        end: { line: 2, character: 0 },
                    },
                    newText: 'Third edit',
                },
            ];

            const result = builder.createWorkspaceEditFromEdits(testDocumentUri, edits);

            const sortedEdits = result.changes![testDocumentUri];
            expect(sortedEdits).toHaveLength(3);
            // Should be sorted by line in descending order
            expect(sortedEdits[0].range.start.line).toBe(3);
            expect(sortedEdits[1].range.start.line).toBe(2);
            expect(sortedEdits[2].range.start.line).toBe(1);
        });

        it('should sort edits on same line by character in reverse order', () => {
            const edits: TextEdit[] = [
                {
                    range: {
                        start: { line: 5, character: 10 },
                        end: { line: 5, character: 15 },
                    },
                    newText: 'First',
                },
                {
                    range: {
                        start: { line: 5, character: 20 },
                        end: { line: 5, character: 25 },
                    },
                    newText: 'Second',
                },
                {
                    range: {
                        start: { line: 5, character: 5 },
                        end: { line: 5, character: 8 },
                    },
                    newText: 'Third',
                },
            ];

            const result = builder.createWorkspaceEditFromEdits(testDocumentUri, edits);

            const sortedEdits = result.changes![testDocumentUri];
            expect(sortedEdits).toHaveLength(3);
            // Should be sorted by character in descending order
            expect(sortedEdits[0].range.start.character).toBe(20);
            expect(sortedEdits[1].range.start.character).toBe(10);
            expect(sortedEdits[2].range.start.character).toBe(5);
        });

        it('should handle single edit', () => {
            const edits: TextEdit[] = [
                {
                    range: {
                        start: { line: 3, character: 10 },
                        end: { line: 3, character: 15 },
                    },
                    newText: 'single edit',
                },
            ];

            const result = builder.createWorkspaceEditFromEdits(testDocumentUri, edits);

            expect(result.changes![testDocumentUri]).toHaveLength(1);
            expect(result.changes![testDocumentUri][0]).toEqual(edits[0]);
        });

        it('should handle empty edits array', () => {
            const result = builder.createWorkspaceEditFromEdits(testDocumentUri, []);

            expect(result.changes![testDocumentUri]).toHaveLength(0);
        });
    });

    describe('conflict detection and validation', () => {
        it('should throw error for overlapping edits on same line', () => {
            const edits: TextEdit[] = [
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
            ];

            expect(() => {
                builder.createWorkspaceEditFromEdits(testDocumentUri, edits);
            }).toThrow('Conflicting text edits detected');
        });

        it('should throw error for overlapping edits across lines', () => {
            const edits: TextEdit[] = [
                {
                    range: {
                        start: { line: 3, character: 10 },
                        end: { line: 5, character: 5 },
                    },
                    newText: 'Multi-line edit',
                },
                {
                    range: {
                        start: { line: 4, character: 0 },
                        end: { line: 4, character: 10 },
                    },
                    newText: 'Overlapping edit',
                },
            ];

            expect(() => {
                builder.createWorkspaceEditFromEdits(testDocumentUri, edits);
            }).toThrow('Conflicting text edits detected');
        });

        it('should allow adjacent non-overlapping edits', () => {
            const edits: TextEdit[] = [
                {
                    range: {
                        start: { line: 5, character: 10 },
                        end: { line: 5, character: 15 },
                    },
                    newText: 'First edit',
                },
                {
                    range: {
                        start: { line: 5, character: 15 },
                        end: { line: 5, character: 20 },
                    },
                    newText: 'Adjacent edit',
                },
            ];

            expect(() => {
                builder.createWorkspaceEditFromEdits(testDocumentUri, edits);
            }).not.toThrow();
        });

        it('should detect overlapping zero-width insertions at same position', () => {
            const edits: TextEdit[] = [
                {
                    range: {
                        start: { line: 5, character: 10 },
                        end: { line: 5, character: 10 },
                    },
                    newText: 'First insertion',
                },
                {
                    range: {
                        start: { line: 5, character: 10 },
                        end: { line: 5, character: 10 },
                    },
                    newText: 'Second insertion',
                },
            ];

            // Zero-width ranges at same position are considered overlapping
            expect(() => {
                builder.createWorkspaceEditFromEdits(testDocumentUri, edits);
            }).toThrow('Conflicting text edits detected');
        });

        it('should handle edits with zero-width ranges correctly', () => {
            const edits: TextEdit[] = [
                {
                    range: {
                        start: { line: 5, character: 10 },
                        end: { line: 5, character: 10 },
                    },
                    newText: 'Insertion',
                },
                {
                    range: {
                        start: { line: 5, character: 15 },
                        end: { line: 5, character: 20 },
                    },
                    newText: 'Replacement',
                },
            ];

            expect(() => {
                builder.createWorkspaceEditFromEdits(testDocumentUri, edits);
            }).not.toThrow();
        });
    });

    describe('validateWorkspaceEdit', () => {
        it('should validate well-formed workspace edit', () => {
            const workspaceEdit: WorkspaceEdit = {
                changes: {
                    [testDocumentUri]: [
                        {
                            range: {
                                start: { line: 1, character: 0 },
                                end: { line: 1, character: 0 },
                            },
                            newText: 'Valid edit',
                        },
                    ],
                },
            };

            expect(() => {
                builder.validateWorkspaceEdit(workspaceEdit);
            }).not.toThrow();
        });

        it('should throw error for workspace edit without changes', () => {
            const workspaceEdit: WorkspaceEdit = {};

            expect(() => {
                builder.validateWorkspaceEdit(workspaceEdit);
            }).toThrow('Workspace edit must have changes defined');
        });

        it('should throw error for empty document URI', () => {
            const workspaceEdit: WorkspaceEdit = {
                changes: {
                    '': [
                        {
                            range: {
                                start: { line: 1, character: 0 },
                                end: { line: 1, character: 0 },
                            },
                            newText: 'Edit',
                        },
                    ],
                },
            };

            expect(() => {
                builder.validateWorkspaceEdit(workspaceEdit);
            }).toThrow('Document URI cannot be empty');
        });

        it('should throw error for non-array edits', () => {
            const workspaceEdit: WorkspaceEdit = {
                changes: {
                    [testDocumentUri]: 'not an array' as any,
                },
            };

            expect(() => {
                builder.validateWorkspaceEdit(workspaceEdit);
            }).toThrow('must be an array');
        });

        it('should throw error for empty edits array', () => {
            const workspaceEdit: WorkspaceEdit = {
                changes: {
                    [testDocumentUri]: [],
                },
            };

            expect(() => {
                builder.validateWorkspaceEdit(workspaceEdit);
            }).toThrow('No edits specified');
        });

        it('should throw error for text edit without range', () => {
            const workspaceEdit: WorkspaceEdit = {
                changes: {
                    [testDocumentUri]: [
                        {
                            newText: 'Edit without range',
                        } as any,
                    ],
                },
            };

            expect(() => {
                builder.validateWorkspaceEdit(workspaceEdit);
            }).toThrow('Text edit must have a range defined');
        });

        it('should throw error for text edit without newText', () => {
            const workspaceEdit: WorkspaceEdit = {
                changes: {
                    [testDocumentUri]: [
                        {
                            range: {
                                start: { line: 1, character: 0 },
                                end: { line: 1, character: 0 },
                            },
                        } as any,
                    ],
                },
            };

            expect(() => {
                builder.validateWorkspaceEdit(workspaceEdit);
            }).toThrow('Text edit must have newText defined');
        });

        it('should allow empty string as newText', () => {
            const workspaceEdit: WorkspaceEdit = {
                changes: {
                    [testDocumentUri]: [
                        {
                            range: {
                                start: { line: 1, character: 0 },
                                end: { line: 1, character: 5 },
                            },
                            newText: '',
                        },
                    ],
                },
            };

            expect(() => {
                builder.validateWorkspaceEdit(workspaceEdit);
            }).not.toThrow();
        });

        it('should throw error for negative line numbers', () => {
            const workspaceEdit: WorkspaceEdit = {
                changes: {
                    [testDocumentUri]: [
                        {
                            range: {
                                start: { line: -1, character: 0 },
                                end: { line: 1, character: 0 },
                            },
                            newText: 'Edit',
                        },
                    ],
                },
            };

            expect(() => {
                builder.validateWorkspaceEdit(workspaceEdit);
            }).toThrow('range start position cannot be negative');
        });

        it('should throw error for negative character positions', () => {
            const workspaceEdit: WorkspaceEdit = {
                changes: {
                    [testDocumentUri]: [
                        {
                            range: {
                                start: { line: 1, character: -5 },
                                end: { line: 1, character: 0 },
                            },
                            newText: 'Edit',
                        },
                    ],
                },
            };

            expect(() => {
                builder.validateWorkspaceEdit(workspaceEdit);
            }).toThrow('range start position cannot be negative');
        });

        it('should throw error for invalid range ordering', () => {
            const workspaceEdit: WorkspaceEdit = {
                changes: {
                    [testDocumentUri]: [
                        {
                            range: {
                                start: { line: 5, character: 10 },
                                end: { line: 3, character: 5 },
                            },
                            newText: 'Invalid range',
                        },
                    ],
                },
            };

            expect(() => {
                builder.validateWorkspaceEdit(workspaceEdit);
            }).toThrow('range end cannot be before start');
        });

        it('should throw error for character position before start on same line', () => {
            const workspaceEdit: WorkspaceEdit = {
                changes: {
                    [testDocumentUri]: [
                        {
                            range: {
                                start: { line: 5, character: 10 },
                                end: { line: 5, character: 5 },
                            },
                            newText: 'Invalid range',
                        },
                    ],
                },
            };

            expect(() => {
                builder.validateWorkspaceEdit(workspaceEdit);
            }).toThrow('range end cannot be before start');
        });
    });

    describe('createEmptyWorkspaceEdit', () => {
        it('should create empty workspace edit for document', () => {
            const result = builder.createEmptyWorkspaceEdit(testDocumentUri);

            expect(result.changes).toBeDefined();
            expect(result.changes![testDocumentUri]).toEqual([]);
        });
    });

    describe('mergeWorkspaceEdits', () => {
        it('should merge multiple workspace edits for same document', () => {
            const edit1: WorkspaceEdit = {
                changes: {
                    [testDocumentUri]: [
                        {
                            range: {
                                start: { line: 1, character: 0 },
                                end: { line: 1, character: 0 },
                            },
                            newText: 'First edit',
                        },
                    ],
                },
            };

            const edit2: WorkspaceEdit = {
                changes: {
                    [testDocumentUri]: [
                        {
                            range: {
                                start: { line: 3, character: 5 },
                                end: { line: 3, character: 10 },
                            },
                            newText: 'Second edit',
                        },
                    ],
                },
            };

            const result = builder.mergeWorkspaceEdits(testDocumentUri, edit1, edit2);

            expect(result.changes![testDocumentUri]).toHaveLength(2);
            // Should be sorted in reverse order
            expect(result.changes![testDocumentUri][0].range.start.line).toBe(3);
            expect(result.changes![testDocumentUri][1].range.start.line).toBe(1);
        });

        it('should handle workspace edits without changes for target document', () => {
            const edit1: WorkspaceEdit = {
                changes: {
                    [testDocumentUri]: [
                        {
                            range: {
                                start: { line: 1, character: 0 },
                                end: { line: 1, character: 0 },
                            },
                            newText: 'Valid edit',
                        },
                    ],
                },
            };

            const edit2: WorkspaceEdit = {
                changes: {
                    'file:///other/document.yaml': [
                        {
                            range: {
                                start: { line: 2, character: 0 },
                                end: { line: 2, character: 0 },
                            },
                            newText: 'Other document edit',
                        },
                    ],
                },
            };

            const result = builder.mergeWorkspaceEdits(testDocumentUri, edit1, edit2);

            expect(result.changes![testDocumentUri]).toHaveLength(1);
            expect(result.changes![testDocumentUri][0].newText).toBe('Valid edit');
        });

        it('should handle empty workspace edits', () => {
            const edit1: WorkspaceEdit = {};
            const edit2: WorkspaceEdit = {
                changes: {},
            };

            const result = builder.mergeWorkspaceEdits(testDocumentUri, edit1, edit2);

            expect(result.changes![testDocumentUri]).toHaveLength(0);
        });

        it('should validate merged edits for conflicts', () => {
            const edit1: WorkspaceEdit = {
                changes: {
                    [testDocumentUri]: [
                        {
                            range: {
                                start: { line: 5, character: 10 },
                                end: { line: 5, character: 20 },
                            },
                            newText: 'First edit',
                        },
                    ],
                },
            };

            const edit2: WorkspaceEdit = {
                changes: {
                    [testDocumentUri]: [
                        {
                            range: {
                                start: { line: 5, character: 15 },
                                end: { line: 5, character: 25 },
                            },
                            newText: 'Conflicting edit',
                        },
                    ],
                },
            };

            expect(() => {
                builder.mergeWorkspaceEdits(testDocumentUri, edit1, edit2);
            }).toThrow('Conflicting text edits detected');
        });
    });

    describe('error scenarios and edge cases', () => {
        it('should handle extraction result with complex parameter definition', () => {
            const extractionResult: ExtractToParameterResult = {
                parameterName: 'ComplexParam',
                parameterDefinition: {
                    Type: ParameterType.CommaDelimitedList,
                    Default: ['value1', 'value2', 'value3'],
                    Description: '',
                    AllowedValues: undefined,
                },
                replacementEdit: {
                    range: {
                        start: { line: 10, character: 20 },
                        end: { line: 12, character: 5 },
                    },
                    newText: '!Ref ComplexParam',
                },
                parameterInsertionEdit: {
                    range: {
                        start: { line: 2, character: 0 },
                        end: { line: 2, character: 0 },
                    },
                    newText:
                        '  ComplexParam:\n    Type: CommaDelimitedList\n    Default: "value1,value2,value3"\n    Description: ""\n',
                },
            };

            const result = builder.createWorkspaceEdit(testDocumentUri, extractionResult);

            expect(result.changes![testDocumentUri]).toHaveLength(2);
            expect(result.changes![testDocumentUri]).toContain(extractionResult.parameterInsertionEdit);
            expect(result.changes![testDocumentUri]).toContain(extractionResult.replacementEdit);
        });

        it('should handle very large text edits', () => {
            const largeText = 'x'.repeat(10000);
            const extractionResult: ExtractToParameterResult = {
                parameterName: 'LargeParam',
                parameterDefinition: {
                    Type: ParameterType.String,
                    Default: largeText,
                    Description: '',
                },
                replacementEdit: {
                    range: {
                        start: { line: 5, character: 0 },
                        end: { line: 5, character: largeText.length },
                    },
                    newText: '!Ref LargeParam',
                },
                parameterInsertionEdit: {
                    range: {
                        start: { line: 1, character: 0 },
                        end: { line: 1, character: 0 },
                    },
                    newText: `  LargeParam:\n    Type: String\n    Default: "${largeText}"\n    Description: ""\n`,
                },
            };

            expect(() => {
                builder.createWorkspaceEdit(testDocumentUri, extractionResult);
            }).not.toThrow();
        });

        it('should handle edits at document boundaries', () => {
            const edits: TextEdit[] = [
                {
                    range: {
                        start: { line: 0, character: 0 },
                        end: { line: 0, character: 0 },
                    },
                    newText: 'Start of document',
                },
                {
                    range: {
                        start: { line: 1000, character: 0 },
                        end: { line: 1000, character: 0 },
                    },
                    newText: 'End of document',
                },
            ];

            expect(() => {
                builder.createWorkspaceEditFromEdits(testDocumentUri, edits);
            }).not.toThrow();
        });

        it('should handle Unicode characters in text edits', () => {
            const unicodeText = '🚀 Unicode test with émojis and spëcial chars 中文';
            const extractionResult: ExtractToParameterResult = {
                parameterName: 'UnicodeParam',
                parameterDefinition: {
                    Type: ParameterType.String,
                    Default: unicodeText,
                    Description: '',
                },
                replacementEdit: {
                    range: {
                        start: { line: 3, character: 5 },
                        end: { line: 3, character: 5 + unicodeText.length },
                    },
                    newText: '!Ref UnicodeParam',
                },
                parameterInsertionEdit: {
                    range: {
                        start: { line: 1, character: 0 },
                        end: { line: 1, character: 0 },
                    },
                    newText: `  UnicodeParam:\n    Type: String\n    Default: "${unicodeText}"\n    Description: ""\n`,
                },
            };

            expect(() => {
                builder.createWorkspaceEdit(testDocumentUri, extractionResult);
            }).not.toThrow();
        });
    });
});
