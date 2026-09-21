import { spawn } from 'child_process';
import { writeFile, unlink } from 'fs/promises';
import { tmpdir } from 'os';
import { join } from 'path';
import { PublishDiagnosticsParams, DiagnosticSeverity } from 'vscode-languageserver';
import { CloudFormationFileType } from '../../document/Document';
import { CfnLintSettings } from '../../settings/Settings';
import { extractErrorMessage } from '../../utils/errors/ErrorUtils';

interface CfnLintDiagnostic {
    Level: string;
    Message: string;
    Rule: {
        Id: string;
        Description: string;
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
        Path: string[];
    };
    Filename: string;
}

export class LocalCfnLintExecutor {
    // cfn-lint exit codes: 2 = error findings, 4 = warnings, 8 = informational. ORed together.
    private static readonly FINDINGS_BITMASK = 2 | 4 | 8;

    constructor(
        private readonly cfnLintPath: string,
        private settings: CfnLintSettings,
    ) {}

    updateSettings(settings: CfnLintSettings): void {
        this.settings = settings;
    }

    async lintTemplate(
        content: string,
        uri: string,
        fileType: CloudFormationFileType,
    ): Promise<PublishDiagnosticsParams[]> {
        const tempFile = join(
            tmpdir(),
            `cfn-lint-${Date.now()}.${fileType === CloudFormationFileType.Template ? 'yaml' : 'json'}`,
        );

        try {
            await writeFile(tempFile, content, 'utf8');
            return await this.lintFile(tempFile, uri, fileType);
        } finally {
            try {
                await unlink(tempFile);
            } catch {
                // Ignore cleanup errors
            }
        }
    }

    async lintFile(
        filePath: string,
        uri: string,
        fileType: CloudFormationFileType,
        workspaceRoot?: string,
    ): Promise<PublishDiagnosticsParams[]> {
        const rawDiagnostics = await this.executeCfnLint(filePath, workspaceRoot);
        return this.convertToLspFormat(rawDiagnostics, uri);
    }

    private async executeCfnLint(filePath: string, workspaceRoot?: string): Promise<CfnLintDiagnostic[]> {
        return await new Promise((resolve, reject) => {
            const args = this.buildArgs(filePath);
            const child = spawn(this.cfnLintPath, args, {
                stdio: ['ignore', 'pipe', 'pipe'],
                cwd: workspaceRoot,
            });

            let stdout = '';
            let stderr = '';

            child.stdout?.on('data', (data: Buffer) => {
                stdout += data.toString();
            });

            child.stderr?.on('data', (data: Buffer) => {
                stderr += data.toString();
            });

            child.on('close', (code, signal) => {
                if (code === null) {
                    reject(new Error(`cfn-lint terminated by signal ${signal}: ${stderr || stdout || 'no output'}`));
                    return;
                }

                if ((code & ~LocalCfnLintExecutor.FINDINGS_BITMASK) !== 0) {
                    reject(new Error(`cfn-lint failed (exit code ${code}): ${stderr || stdout || 'unknown error'}`));
                    return;
                }

                try {
                    // Valid bitmask code (0/2/4/6/8/10/12/14): parse findings JSON.
                    const diagnostics: CfnLintDiagnostic[] = stdout.trim()
                        ? (JSON.parse(stdout) as CfnLintDiagnostic[])
                        : [];
                    resolve(diagnostics);
                } catch (error) {
                    reject(
                        new Error(
                            `Failed to parse cfn-lint output (exit code ${code}): ` +
                                `${extractErrorMessage(error)}${stderr ? ` stderr: ${stderr}` : ''}`,
                        ),
                    );
                }
            });

            child.on('error', (error) => {
                reject(new Error(`Failed to execute cfn-lint: ${extractErrorMessage(error)}`));
            });
        });
    }

    private buildArgs(filePath: string): string[] {
        const args = ['--format', 'json'];

        if (this.settings.includeChecks.length > 0) {
            args.push('--include-checks', ...this.settings.includeChecks);
        }
        if (this.settings.includeExperimental) {
            args.push('--include-experimental');
        }
        if (this.settings.ignoreChecks.length > 0) {
            args.push('--ignore-checks', ...this.settings.ignoreChecks);
        }
        if (this.settings.mandatoryChecks.length > 0) {
            args.push('--mandatory-checks', ...this.settings.mandatoryChecks);
        }
        for (const rule of this.settings.configureRules) {
            args.push('--configure-rule', rule);
        }
        if (this.settings.regions.length > 0) {
            args.push('--regions', ...this.settings.regions);
        }
        for (const rule of this.settings.appendRules) {
            args.push('--append-rules', rule);
        }
        for (const rule of this.settings.customRules) {
            args.push('--custom-rules', rule);
        }
        if (this.settings.overrideSpec) {
            args.push('--override-spec', this.settings.overrideSpec);
        }
        for (const schema of this.settings.registrySchemas) {
            args.push('--registry-schemas', schema);
        }

        args.push(filePath);
        return args;
    }

    private convertToLspFormat(diagnostics: CfnLintDiagnostic[], uri: string): PublishDiagnosticsParams[] {
        if (!diagnostics || diagnostics.length === 0) {
            return [];
        }

        const lspDiagnostics = diagnostics.map((item) => ({
            severity: this.convertSeverity(item.Level),
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
        }));

        return [{ uri, diagnostics: lspDiagnostics }];
    }

    private convertSeverity(level: string): DiagnosticSeverity {
        switch (level) {
            case 'Error': {
                return DiagnosticSeverity.Error;
            }
            case 'Warning': {
                return DiagnosticSeverity.Warning;
            }
            case 'Info': {
                return DiagnosticSeverity.Information;
            }
            default: {
                return DiagnosticSeverity.Information;
            }
        }
    }
}
