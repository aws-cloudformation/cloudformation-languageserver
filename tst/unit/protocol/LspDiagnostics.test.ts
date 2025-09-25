import { StubbedInstance, stubInterface } from 'ts-sinon';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { Connection } from 'vscode-languageserver/node';
import { DiagnosticSeverity, PublishDiagnosticsParams } from 'vscode-languageserver-protocol';
import { LspDiagnostics } from '../../../src/protocol/LspDiagnostics';

describe('LspDiagnostics', () => {
    let lspDiagnostics: LspDiagnostics;
    let mockConnection: StubbedInstance<Connection>;

    beforeEach(() => {
        vi.clearAllMocks();
        mockConnection = stubInterface<Connection>();
        lspDiagnostics = new LspDiagnostics(mockConnection);
    });

    describe('constructor', () => {
        it('should initialize with connection', () => {
            expect(lspDiagnostics).toBeDefined();
        });
    });

    describe('publishDiagnostics', () => {
        it('should publish diagnostics for a document', async () => {
            const params: PublishDiagnosticsParams = {
                uri: 'file:///test.yaml',
                diagnostics: [
                    {
                        range: {
                            start: { line: 0, character: 0 },
                            end: { line: 0, character: 10 },
                        },
                        severity: DiagnosticSeverity.Error,
                        message: 'Test error',
                        source: 'cfn-lint',
                    },
                ],
            };

            await lspDiagnostics.publishDiagnostics(params);

            expect(mockConnection.sendDiagnostics.calledWith(params)).toBe(true);
        });

        it('should publish empty diagnostics array', async () => {
            const params: PublishDiagnosticsParams = {
                uri: 'file:///test.yaml',
                diagnostics: [],
            };

            await lspDiagnostics.publishDiagnostics(params);

            expect(mockConnection.sendDiagnostics.calledWith(params)).toBe(true);
        });

        it('should handle multiple diagnostics', async () => {
            const params: PublishDiagnosticsParams = {
                uri: 'file:///test.yaml',
                diagnostics: [
                    {
                        range: {
                            start: { line: 0, character: 0 },
                            end: { line: 0, character: 10 },
                        },
                        severity: DiagnosticSeverity.Error,
                        message: 'Error 1',
                        source: 'cfn-lint',
                    },
                    {
                        range: {
                            start: { line: 1, character: 5 },
                            end: { line: 1, character: 15 },
                        },
                        severity: DiagnosticSeverity.Warning,
                        message: 'Warning 1',
                        source: 'cfn-lint',
                    },
                    {
                        range: {
                            start: { line: 2, character: 0 },
                            end: { line: 2, character: 20 },
                        },
                        severity: DiagnosticSeverity.Information,
                        message: 'Info 1',
                        source: 'cfn-lint',
                    },
                ],
            };

            await lspDiagnostics.publishDiagnostics(params);

            expect(mockConnection.sendDiagnostics.calledWith(params)).toBe(true);
        });

        it('should handle diagnostics with different severity levels', async () => {
            const params: PublishDiagnosticsParams = {
                uri: 'file:///test.yaml',
                diagnostics: [
                    {
                        range: {
                            start: { line: 0, character: 0 },
                            end: { line: 0, character: 10 },
                        },
                        severity: DiagnosticSeverity.Error,
                        message: 'Critical error',
                    },
                    {
                        range: {
                            start: { line: 1, character: 0 },
                            end: { line: 1, character: 10 },
                        },
                        severity: DiagnosticSeverity.Warning,
                        message: 'Warning message',
                    },
                    {
                        range: {
                            start: { line: 2, character: 0 },
                            end: { line: 2, character: 10 },
                        },
                        severity: DiagnosticSeverity.Information,
                        message: 'Information message',
                    },
                    {
                        range: {
                            start: { line: 3, character: 0 },
                            end: { line: 3, character: 10 },
                        },
                        severity: DiagnosticSeverity.Hint,
                        message: 'Hint message',
                    },
                ],
            };

            await lspDiagnostics.publishDiagnostics(params);

            expect(mockConnection.sendDiagnostics.calledWith(params)).toBe(true);
        });

        it('should handle diagnostics with additional properties', async () => {
            const params: PublishDiagnosticsParams = {
                uri: 'file:///test.yaml',
                diagnostics: [
                    {
                        range: {
                            start: { line: 0, character: 0 },
                            end: { line: 0, character: 10 },
                        },
                        severity: DiagnosticSeverity.Error,
                        message: 'Error with code',
                        code: 'E001',
                        source: 'cfn-lint',
                        relatedInformation: [
                            {
                                location: {
                                    uri: 'file:///related.yaml',
                                    range: {
                                        start: { line: 5, character: 0 },
                                        end: { line: 5, character: 10 },
                                    },
                                },
                                message: 'Related issue here',
                            },
                        ],
                    },
                ],
            };

            await lspDiagnostics.publishDiagnostics(params);

            expect(mockConnection.sendDiagnostics.calledWith(params)).toBe(true);
        });

        it('should handle different URI formats', async () => {
            const testCases = [
                'file:///absolute/path/test.yaml',
                'file:///C:/Windows/path/test.json',
                'file:///home/user/project/template.yml',
                'untitled:Untitled-1',
            ];

            for (const uri of testCases) {
                const params: PublishDiagnosticsParams = {
                    uri,
                    diagnostics: [
                        {
                            range: {
                                start: { line: 0, character: 0 },
                                end: { line: 0, character: 5 },
                            },
                            severity: DiagnosticSeverity.Error,
                            message: `Error in ${uri}`,
                        },
                    ],
                };

                await lspDiagnostics.publishDiagnostics(params);

                expect(mockConnection.sendDiagnostics.calledWith(params)).toBe(true);
            }
        });

        it('should clear diagnostics when empty array is provided', async () => {
            // First publish some diagnostics
            const initialParams: PublishDiagnosticsParams = {
                uri: 'file:///test.yaml',
                diagnostics: [
                    {
                        range: {
                            start: { line: 0, character: 0 },
                            end: { line: 0, character: 10 },
                        },
                        severity: DiagnosticSeverity.Error,
                        message: 'Error',
                    },
                ],
            };

            await lspDiagnostics.publishDiagnostics(initialParams);

            // Then clear them
            const clearParams: PublishDiagnosticsParams = {
                uri: 'file:///test.yaml',
                diagnostics: [],
            };

            await lspDiagnostics.publishDiagnostics(clearParams);

            expect(mockConnection.sendDiagnostics.calledWith(clearParams)).toBe(true);
        });
    });

    describe('connection integration', () => {
        it('should maintain reference to connection', () => {
            expect((lspDiagnostics as any).connection).toBe(mockConnection);
        });

        it('should work with mocked connection', async () => {
            const params: PublishDiagnosticsParams = {
                uri: 'file:///test.yaml',
                diagnostics: [],
            };

            mockConnection.sendDiagnostics.resolves();
            await expect(lspDiagnostics.publishDiagnostics(params)).resolves.toBeUndefined();
        });
    });

    describe('edge cases', () => {
        it('should handle empty URI', async () => {
            const params: PublishDiagnosticsParams = {
                uri: '',
                diagnostics: [],
            };

            await lspDiagnostics.publishDiagnostics(params);

            expect(mockConnection.sendDiagnostics.calledWith(params)).toBe(true);
        });

        it('should handle diagnostics with zero-length ranges', async () => {
            const params: PublishDiagnosticsParams = {
                uri: 'file:///test.yaml',
                diagnostics: [
                    {
                        range: {
                            start: { line: 0, character: 5 },
                            end: { line: 0, character: 5 },
                        },
                        severity: DiagnosticSeverity.Error,
                        message: 'Zero-length range error',
                    },
                ],
            };

            await lspDiagnostics.publishDiagnostics(params);

            expect(mockConnection.sendDiagnostics.calledWith(params)).toBe(true);
        });

        it('should handle diagnostics with multi-line ranges', async () => {
            const params: PublishDiagnosticsParams = {
                uri: 'file:///test.yaml',
                diagnostics: [
                    {
                        range: {
                            start: { line: 0, character: 0 },
                            end: { line: 5, character: 10 },
                        },
                        severity: DiagnosticSeverity.Warning,
                        message: 'Multi-line issue',
                    },
                ],
            };

            await lspDiagnostics.publishDiagnostics(params);

            expect(mockConnection.sendDiagnostics.calledWith(params)).toBe(true);
        });
    });
});
