import { DiagnosticSeverity, PublishDiagnosticsParams } from 'vscode-languageserver';

// JSON shape from cfn-lint --format json. Shared by local and Pyodide paths.
export type CfnLintDiagnostic = {
    Level: string;
    Message: string;
    Rule: {
        Id: string;
        Source: string;
    };
    Location: {
        Start: {
            LineNumber: number;
            ColumnNumber: number;
        };
        End: {
            LineNumber: number;
            ColumnNumber: number;
        };
        Path: unknown;
    };
    Filename: string;
};

// Returns [] (not [{uri, diagnostics: []}]) when no findings, so callers can skip publishing.
export function toPublishDiagnostics(diagnostics: CfnLintDiagnostic[], uri: string): PublishDiagnosticsParams[] {
    if (!diagnostics || diagnostics.length === 0) {
        return [];
    }

    const lspDiagnostics = diagnostics.map((item) => {
        const base = {
            severity: convertSeverity(item.Level),
            range: {
                start: {
                    line: Math.max(0, (item.Location?.Start?.LineNumber || 1) - 1),
                    character: Math.max(0, (item.Location?.Start?.ColumnNumber || 1) - 1),
                },
                end: {
                    line: Math.max(0, (item.Location?.End?.LineNumber || 1) - 1),
                    character: Math.max(0, (item.Location?.End?.ColumnNumber || 1) - 1),
                },
            },
            message: item.Message || 'Unknown cfn-lint error',
            source: 'cfn-lint',
            code: item.Rule?.Id || 'unknown',
        };

        const sourceUrl = item.Rule?.Source;
        if (sourceUrl) {
            return { ...base, codeDescription: { href: sourceUrl } };
        }
        return base;
    });

    return [{ uri, diagnostics: lspDiagnostics }];
}

function convertSeverity(level: string): DiagnosticSeverity {
    switch (level) {
        case 'Error': {
            return DiagnosticSeverity.Error;
        }
        case 'Warning': {
            return DiagnosticSeverity.Warning;
        }
        case 'Informational':
        case 'Info': {
            return DiagnosticSeverity.Information;
        }
        default: {
            return DiagnosticSeverity.Information;
        }
    }
}
