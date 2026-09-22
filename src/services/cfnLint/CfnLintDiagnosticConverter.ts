import { DiagnosticSeverity, PublishDiagnosticsParams } from 'vscode-languageserver';

// Matches the JSON shape emitted by cfn-lint --format json (cfnlint/formatters/json.py).
// Both the local subprocess path and the Pyodide path produce this structure so that a
// single converter handles both and field-mapping logic has exactly one home.
export interface CfnLintDiagnostic {
    Level: string;
    Message: string;
    Rule: {
        Id: string;
        Description: string;
        ShortDescription: string;
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
    // Id and ParentId are present in the JSON but not consumed for LSP diagnostics.
}

// Convert a list of cfn-lint JSON findings to LSP PublishDiagnosticsParams.
// uri is the document URI to attach all diagnostics to.
// Returns an empty array (not a single entry with empty diagnostics) when there are no findings,
// matching the contract callers rely on to skip publishing.
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

// Map cfn-lint Level strings (as emitted by JsonFormatter, capitalized) to LSP severity.
// 'Informational' is cfn-lint's canonical level for I-prefix rules; 'Info' is not emitted
// by the JSON formatter but is accepted for forward-compatibility.
// Unknown levels default to Information (least alarming, matches previous local-path behavior).
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
