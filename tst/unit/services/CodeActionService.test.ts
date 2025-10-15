import equal from 'fast-deep-equal';
import { SyntaxNode } from 'tree-sitter';
import { stubInterface } from 'ts-sinon';
import { describe, it, beforeEach, expect } from 'vitest';
import { CodeActionParams, Diagnostic, DiagnosticSeverity, CodeAction } from 'vscode-languageserver';
import { ContextManager } from '../../../src/context/ContextManager';
import { SyntaxTree } from '../../../src/context/syntaxtree/SyntaxTree';
import { SyntaxTreeManager } from '../../../src/context/syntaxtree/SyntaxTreeManager';
import { DocumentManager } from '../../../src/document/DocumentManager';
import { CodeActionService } from '../../../src/services/CodeActionService';
import { CFN_VALIDATION_SOURCE } from '../../../src/stacks/actions/ValidationWorkflow';

/* eslint-disable vitest/expect-expect */
describe('CodeActionService', () => {
    let codeActionService: CodeActionService;
    let mockSyntaxTreeManager: ReturnType<typeof stubInterface<SyntaxTreeManager>>;
    let mockDocumentManager: ReturnType<typeof stubInterface<DocumentManager>>;
    let mockSyntaxTree: ReturnType<typeof stubInterface<SyntaxTree>>;

    beforeEach(() => {
        mockSyntaxTreeManager = stubInterface<SyntaxTreeManager>();
        mockDocumentManager = stubInterface<DocumentManager>();
        mockSyntaxTree = stubInterface<SyntaxTree>();
        const mockContextManager = stubInterface<ContextManager>();
        codeActionService = new CodeActionService(
            mockSyntaxTreeManager,
            mockDocumentManager,
            mockContextManager,
        );
    });

    function verifyCodeAction(params: CodeActionParams, actual: CodeAction[], ...expected: CodeAction[]) {
        expect(actual.length).toBe(expected.length + 1);
        for (const [index, expectedAction] of expected.entries()) {
            expect(equal(actual[index], expectedAction)).toBe(true);
        }

        expect(
            equal(actual[actual.length - 1], {
                title: 'Ask AI',
                kind: 'quickfix',
                diagnostics: params.context.diagnostics,
                command: {
                    title: 'Ask AI',
                    command: '/command/llm/diagnostic/analyze',
                    arguments: [params.textDocument.uri, params.context.diagnostics],
                },
            }),
        ).toBe(true);
    }

    describe('generateCodeActions', () => {
        it('should generate code actions for CFN Lint diagnostics', () => {
            const diagnostic: Diagnostic = {
                range: {
                    start: { line: 5, character: 10 },
                    end: { line: 5, character: 20 },
                },
                message: "'Type' is a required property",
                severity: DiagnosticSeverity.Error,
                source: 'cfn-lint',
                code: 'E3003', // Required Property missing
            };

            const params: CodeActionParams = {
                textDocument: { uri: 'file:///test.yaml' },
                range: {
                    start: { line: 5, character: 10 },
                    end: { line: 5, character: 20 },
                },
                context: {
                    diagnostics: [diagnostic],
                },
            };

            // Create mock SyntaxNode that represents a YAML block mapping structure
            const mockNode = {
                type: 'plain_scalar',
                startPosition: { row: 5, column: 10 },
                endPosition: { row: 5, column: 20 },
                parent: {
                    type: 'block_mapping_pair',
                    children: [
                        {
                            type: 'block_node',
                            children: [
                                {
                                    type: 'block_mapping_pair',
                                    startPosition: { row: 6, column: 4 },
                                    text: 'Properties:\n    ExistingProp: value',
                                },
                            ],
                        },
                    ],
                },
            } as any as SyntaxNode;

            mockSyntaxTreeManager.getSyntaxTree.returns(mockSyntaxTree);
            mockSyntaxTree.getNodeAtPosition.returns(mockNode);

            const result = codeActionService.generateCodeActions(params);

            verifyCodeAction(params, result, {
                title: "Add required property 'Type'",
                kind: 'quickfix',
                diagnostics: [diagnostic],
                edit: {
                    changes: {
                        'file:///test.yaml': [
                            {
                                range: {
                                    start: { line: 6, character: 0 },
                                    end: { line: 6, character: 0 },
                                },
                                newText: '    Type: ""\n',
                            },
                        ],
                    },
                },
            });
        });

        it('should generate code actions for invalid property diagnostics', () => {
            const diagnostic: Diagnostic = {
                range: {
                    start: { line: 3, character: 0 },
                    end: { line: 3, character: 5 },
                },
                message: "Additional properties are not allowed ('Foo1' was unexpected)",
                severity: DiagnosticSeverity.Error,
                source: 'cfn-lint',
                code: 'E3002', // Invalid Property for resource type
            };

            const params: CodeActionParams = {
                textDocument: { uri: 'file:///test.yaml' },
                range: {
                    start: { line: 3, character: 0 },
                    end: { line: 3, character: 5 },
                },
                context: {
                    diagnostics: [diagnostic],
                },
            };

            // Create mock SyntaxNode for a key-value pair
            const mockNode = {
                type: 'plain_scalar',
                startPosition: { row: 3, column: 0 },
                endPosition: { row: 3, column: 5 },
                parent: {
                    type: 'block_mapping_pair',
                    startPosition: { row: 3, column: 0 },
                    endPosition: { row: 3, column: 15 },
                },
            } as any as SyntaxNode;

            mockSyntaxTreeManager.getSyntaxTree.returns(mockSyntaxTree);
            mockSyntaxTree.getNodeAtPosition.returns(mockNode);

            const result = codeActionService.generateCodeActions(params);

            verifyCodeAction(params, result, {
                title: "Remove invalid property 'Foo1'",
                kind: 'quickfix',
                diagnostics: [diagnostic],
                edit: {
                    changes: {
                        'file:///test.yaml': [
                            {
                                range: {
                                    start: { line: 3, character: 0 },
                                    end: { line: 3, character: 5 },
                                },
                                newText: '',
                            },
                        ],
                    },
                },
            });
        });

        it('should not generate code actions for non-CFN Lint diagnostics', () => {
            const diagnostic: Diagnostic = {
                range: {
                    start: { line: 3, character: 0 },
                    end: { line: 3, character: 5 },
                },
                message: 'Bad indentation of a mapping entry',
                severity: DiagnosticSeverity.Error,
                source: 'yaml',
            };

            const params: CodeActionParams = {
                textDocument: { uri: 'file:///test.yaml' },
                range: {
                    start: { line: 3, character: 0 },
                    end: { line: 3, character: 5 },
                },
                context: {
                    diagnostics: [diagnostic],
                },
            };

            const result = codeActionService.generateCodeActions(params);

            verifyCodeAction(params, result);
        });

        it('should handle missing syntax tree gracefully', () => {
            const diagnostic: Diagnostic = {
                range: {
                    start: { line: 1, character: 0 },
                    end: { line: 1, character: 5 },
                },
                message: "'Type' is a required property",
                severity: DiagnosticSeverity.Error,
                source: 'cfn-lint',
                code: 'E3003',
            };

            const params: CodeActionParams = {
                textDocument: { uri: 'file:///test.yaml' },
                range: {
                    start: { line: 1, character: 0 },
                    end: { line: 1, character: 5 },
                },
                context: {
                    diagnostics: [diagnostic],
                },
            };

            // Return undefined syntax tree
            mockSyntaxTreeManager.getSyntaxTree.returns(undefined);

            const result = codeActionService.generateCodeActions(params);

            verifyCodeAction(params, result);
        });

        it('should generate code actions for CFN validation diagnostics', () => {
            const diagnostic: Diagnostic = {
                range: {
                    start: { line: 5, character: 10 },
                    end: { line: 5, character: 20 },
                },
                message: 'Validation failed',
                severity: DiagnosticSeverity.Error,
                source: CFN_VALIDATION_SOURCE,
                data: 'test-uuid-123',
            };

            const params: CodeActionParams = {
                textDocument: { uri: 'file:///test.yaml' },
                range: {
                    start: { line: 5, character: 10 },
                    end: { line: 5, character: 20 },
                },
                context: {
                    diagnostics: [diagnostic],
                },
            };

            const result = codeActionService.generateCodeActions(params);

            verifyCodeAction(params, result, {
                title: 'Remove validation error',
                kind: 'quickfix',
                diagnostics: [diagnostic],
                command: {
                    title: 'Remove validation error',
                    command: '/command/template/clear-diagnostic',
                    arguments: [params.textDocument.uri, 'test-uuid-123'],
                },
            });
        });

        it('should handle errors gracefully', () => {
            const diagnostic: Diagnostic = {
                range: {
                    start: { line: 1, character: 0 },
                    end: { line: 1, character: 5 },
                },
                message: "'Type' is a required property",
                severity: DiagnosticSeverity.Error,
                source: 'cfn-lint',
                code: 'E3003',
            };

            const params: CodeActionParams = {
                textDocument: { uri: 'file:///test.yaml' },
                range: {
                    start: { line: 1, character: 0 },
                    end: { line: 1, character: 5 },
                },
                context: {
                    diagnostics: [diagnostic],
                },
            };

            mockSyntaxTreeManager.getSyntaxTree.throws(new Error('Syntax tree error'));

            // Should not throw an error and should return empty array
            expect(() => {
                const result = codeActionService.generateCodeActions(params);
                verifyCodeAction(params, result);
            }).not.toThrow();
        });
    });
});
