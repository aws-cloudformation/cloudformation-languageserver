import { stubInterface } from 'ts-sinon';
import { describe, it, beforeEach, expect } from 'vitest';
import { CancellationToken } from 'vscode-jsonrpc';
import { CodeActionParams, CodeAction, Diagnostic, DiagnosticSeverity } from 'vscode-languageserver';
import { codeActionHandler } from '../../../src/handlers/CodeActionHandler';
import { CodeActionService } from '../../../src/services/CodeActionService';
import { createMockComponents } from '../../utils/MockServerComponents';

describe('CodeActionHandler', () => {
    let mockServerComponents: ReturnType<typeof createMockComponents>;
    let mockCodeActionService: ReturnType<typeof stubInterface<CodeActionService>>;
    let handler: any;

    beforeEach(() => {
        mockServerComponents = createMockComponents();
        mockCodeActionService = stubInterface<CodeActionService>();

        // Replace the codeActionService in mockServerComponents
        (mockServerComponents as any).codeActionService = mockCodeActionService;

        handler = codeActionHandler(mockServerComponents);
    });

    it('should generate code actions successfully', () => {
        const diagnostic: Diagnostic = {
            range: {
                start: { line: 5, character: 10 },
                end: { line: 5, character: 20 },
            },
            message: "Required property 'Type' missing",
            severity: DiagnosticSeverity.Error,
            source: 'cfn-lint',
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

        const expectedCodeActions: CodeAction[] = [
            {
                title: "Add required property 'Type'",
                kind: 'quickfix',
                diagnostics: [diagnostic],
                edit: {
                    changes: {
                        'file:///test.yaml': [
                            {
                                range: {
                                    start: { line: 5, character: 20 },
                                    end: { line: 5, character: 20 },
                                },
                                newText: '\n  Type: ""',
                            },
                        ],
                    },
                },
            },
        ];

        mockCodeActionService.generateCodeActions.returns(expectedCodeActions);

        const token = {} as CancellationToken;
        const result = handler(params, token);

        expect(mockCodeActionService.generateCodeActions.calledWith(params)).toBe(true);
        expect(result).toEqual(expectedCodeActions);
    });

    it('should handle empty diagnostics', () => {
        const params: CodeActionParams = {
            textDocument: { uri: 'file:///test.yaml' },
            range: {
                start: { line: 5, character: 10 },
                end: { line: 5, character: 20 },
            },
            context: {
                diagnostics: [],
            },
        };

        mockCodeActionService.generateCodeActions.returns([]);

        const token = {} as CancellationToken;
        const result = handler(params, token);

        expect(result).toEqual([]);
    });

    it('should handle errors gracefully', () => {
        const diagnostic: Diagnostic = {
            range: {
                start: { line: 5, character: 10 },
                end: { line: 5, character: 20 },
            },
            message: 'Some error',
            severity: DiagnosticSeverity.Error,
            source: 'cfn-lint',
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

        mockCodeActionService.generateCodeActions.throws(new Error('Service error'));

        const token = {} as CancellationToken;
        const result = handler(params, token);

        expect(result).toEqual([]);
    });
});
