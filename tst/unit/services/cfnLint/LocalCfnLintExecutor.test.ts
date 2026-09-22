import { spawn, type ChildProcess } from 'child_process';
import { EventEmitter } from 'events';
import { Readable } from 'stream';
import { describe, expect, beforeEach, vi, test } from 'vitest';
import { DiagnosticSeverity } from 'vscode-languageserver';
import { LocalCfnLintExecutor } from '../../../../src/services/cfnLint/LocalCfnLintExecutor';
import { CloudFormationFileType } from '../../../../src/document/Document';
import { DefaultSettings } from '../../../../src/settings/Settings';

// Mock the module: spawn is a free function, not an injectable interface (cf. PyodideWorkerManager.test.ts).
vi.mock('child_process', async (importOriginal) => {
    const actual = await importOriginal<typeof import('child_process')>();
    return { ...actual, spawn: vi.fn() };
});

const mockFilePath = 'test.yaml';
const mockUri = 'file:///test.yaml';
const mockCfnLintPath = '/usr/local/bin/cfn-lint';
const mockSettings = DefaultSettings.diagnostics.cfnLint;

interface MockDiagnostic {
    ruleId: string;
    level: string;
    expectedSeverity: DiagnosticSeverity;
}

const errorFinding: MockDiagnostic = {
    ruleId: 'E1001',
    level: 'Error',
    expectedSeverity: DiagnosticSeverity.Error,
};
const warningFinding: MockDiagnostic = {
    ruleId: 'W8001',
    level: 'Warning',
    expectedSeverity: DiagnosticSeverity.Warning,
};
const infoFinding: MockDiagnostic = {
    ruleId: 'I4010',
    level: 'Info',
    expectedSeverity: DiagnosticSeverity.Information,
};

/**
 * Fake ChildProcess backed by a real EventEmitter so multiple listeners per event work.
 * ChildProcess extends EventEmitter, not EventTarget, so EventTarget cannot be used here.
 */
function createMockChildProcess(
    exitCode: number | null,
    stdout: string,
    stderr: string = '',
    signal: string | null = null,
): ChildProcess {
    const stdoutStream = new Readable({ read() {} });
    const stderrStream = new Readable({ read() {} });
    // eslint-disable-next-line unicorn/prefer-event-target
    const child = new EventEmitter() as unknown as ChildProcess;
    (child as unknown as { stdout: Readable }).stdout = stdoutStream;
    (child as unknown as { stderr: Readable }).stderr = stderrStream;

    setImmediate(() => {
        if (stdout) stdoutStream.push(stdout);
        stdoutStream.push(null);
        if (stderr) stderrStream.push(stderr);
        stderrStream.push(null);
        child.emit('close', exitCode, signal);
    });

    return child;
}

/** Builds cfn-lint `--format json` output for the given findings. */
function makeDiagnosticsJson(findings: MockDiagnostic[], sourceUrl = 'https://example.com'): string {
    return JSON.stringify(
        findings.map(({ ruleId, level }) => ({
            Filename: mockFilePath,
            Id: 'test-id',
            Level: level,
            Location: {
                Start: { LineNumber: 1, ColumnNumber: 1 },
                End: { LineNumber: 1, ColumnNumber: 10 },
                Path: ['Resources', 'TestResource'],
            },
            Message: 'Test diagnostic',
            ParentId: null,
            Rule: {
                Id: ruleId,
                Description: 'Test rule description',
                ShortDescription: 'Short description',
                Source: sourceUrl,
            },
        })),
    );
}

describe('LocalCfnLintExecutor', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    describe('exit code handling', () => {
        // Exit code is a 2|4|8 severity bitmask; combined codes (e.g. 6 = errors + warnings) are valid.
        test.each([
            { exitCode: 0, description: 'no issues', findings: [] as MockDiagnostic[] },
            { exitCode: 2, description: 'error findings', findings: [errorFinding] },
            { exitCode: 4, description: 'warning findings', findings: [warningFinding] },
            { exitCode: 6, description: 'errors + warnings', findings: [errorFinding, warningFinding] },
            { exitCode: 8, description: 'informational findings', findings: [infoFinding] },
            { exitCode: 10, description: 'errors + informational', findings: [errorFinding, infoFinding] },
            { exitCode: 12, description: 'warnings + informational', findings: [warningFinding, infoFinding] },
            {
                exitCode: 14,
                description: 'all severity levels',
                findings: [errorFinding, warningFinding, infoFinding],
            },
        ])('should parse diagnostics from exit code $exitCode ($description)', async ({ exitCode, findings }) => {
            vi.mocked(spawn).mockReturnValue(createMockChildProcess(exitCode, makeDiagnosticsJson(findings)));

            const executor = new LocalCfnLintExecutor(mockCfnLintPath, mockSettings);
            const result = await executor.lintFile(mockFilePath, mockUri, CloudFormationFileType.Template);

            if (findings.length === 0) {
                expect(result).toEqual([]);
            } else {
                expect(result).toHaveLength(1);
                expect(result[0].diagnostics).toHaveLength(findings.length);
                const severities = result[0].diagnostics.map((d) => d.severity);
                expect(severities).toEqual(findings.map((f) => f.expectedSeverity));
            }
        });

        test('should reject with a parse error when stdout is not valid JSON', async () => {
            vi.mocked(spawn).mockReturnValue(createMockChildProcess(2, 'not json'));

            const executor = new LocalCfnLintExecutor(mockCfnLintPath, mockSettings);
            await expect(executor.lintFile(mockFilePath, mockUri, CloudFormationFileType.Template)).rejects.toThrow(
                /Failed to parse cfn-lint output \(exit code 2\)/,
            );
        });

        test('should include the parse error even when stderr has content', async () => {
            vi.mocked(spawn).mockReturnValue(createMockChildProcess(2, 'not json', 'some warning'));

            const executor = new LocalCfnLintExecutor(mockCfnLintPath, mockSettings);
            await expect(executor.lintFile(mockFilePath, mockUri, CloudFormationFileType.Template)).rejects.toThrow(
                /Unexpected token/,
            );
        });

        test('should reject when cfn-lint exits with code 1 (tool error)', async () => {
            vi.mocked(spawn).mockReturnValue(createMockChildProcess(1, '', 'ValueError: bad arguments'));

            const executor = new LocalCfnLintExecutor(mockCfnLintPath, mockSettings);
            await expect(executor.lintFile(mockFilePath, mockUri, CloudFormationFileType.Template)).rejects.toThrow(
                'cfn-lint failed (exit code 1): ValueError: bad arguments',
            );
        });

        test('should include stdout in exit-1 error when stderr is empty', async () => {
            vi.mocked(spawn).mockReturnValue(createMockChildProcess(1, 'Configuration error: bad config'));

            const executor = new LocalCfnLintExecutor(mockCfnLintPath, mockSettings);
            await expect(executor.lintFile(mockFilePath, mockUri, CloudFormationFileType.Template)).rejects.toThrow(
                'cfn-lint failed (exit code 1): Configuration error: bad config',
            );
        });

        test('should reject when cfn-lint is killed by a signal', async () => {
            vi.mocked(spawn).mockReturnValue(createMockChildProcess(null, '', '', 'SIGKILL'));

            const executor = new LocalCfnLintExecutor(mockCfnLintPath, mockSettings);
            await expect(executor.lintFile(mockFilePath, mockUri, CloudFormationFileType.Template)).rejects.toThrow(
                'cfn-lint terminated by signal SIGKILL',
            );
        });

        test('should return empty diagnostics when stdout is empty', async () => {
            vi.mocked(spawn).mockReturnValue(createMockChildProcess(0, ''));

            const executor = new LocalCfnLintExecutor(mockCfnLintPath, mockSettings);
            const result = await executor.lintFile(mockFilePath, mockUri, CloudFormationFileType.Template);

            expect(result).toEqual([]);
        });

        test('should map severity levels correctly', async () => {
            const allFindings = [errorFinding, warningFinding, infoFinding];
            vi.mocked(spawn).mockReturnValue(createMockChildProcess(14, makeDiagnosticsJson(allFindings)));

            const executor = new LocalCfnLintExecutor(mockCfnLintPath, mockSettings);
            const result = await executor.lintFile(mockFilePath, mockUri, CloudFormationFileType.Template);

            expect(result).toHaveLength(1);
            expect(result[0].diagnostics).toHaveLength(3);
            expect(result[0].diagnostics[0].severity).toBe(DiagnosticSeverity.Error);
            expect(result[0].diagnostics[1].severity).toBe(DiagnosticSeverity.Warning);
            expect(result[0].diagnostics[2].severity).toBe(DiagnosticSeverity.Information);
        });

        test('should populate codeDescription.href from Rule.Source', async () => {
            const docsUrl = 'https://docs.aws.amazon.com/cfn-lint/rules/E1001.html';
            vi.mocked(spawn).mockReturnValue(
                createMockChildProcess(2, makeDiagnosticsJson([errorFinding], docsUrl)),
            );

            const executor = new LocalCfnLintExecutor(mockCfnLintPath, mockSettings);
            const result = await executor.lintFile(mockFilePath, mockUri, CloudFormationFileType.Template);

            expect(result[0].diagnostics[0].codeDescription).toEqual({ href: docsUrl });
        });

        test('should omit codeDescription when Rule.Source is empty', async () => {
            vi.mocked(spawn).mockReturnValue(
                createMockChildProcess(2, makeDiagnosticsJson([errorFinding], '')),
            );

            const executor = new LocalCfnLintExecutor(mockCfnLintPath, mockSettings);
            const result = await executor.lintFile(mockFilePath, mockUri, CloudFormationFileType.Template);

            expect(result[0].diagnostics[0].codeDescription).toBeUndefined();
        });
    });

    describe('settings passthrough', () => {
        test('should pass default settings as CLI args', async () => {
            vi.mocked(spawn).mockReturnValue(createMockChildProcess(0, '[]'));

            const executor = new LocalCfnLintExecutor(mockCfnLintPath, mockSettings);
            await executor.lintFile(mockFilePath, mockUri, CloudFormationFileType.Template);

            const spawnArgs = vi.mocked(spawn).mock.calls[0][1] as string[];
            expect(spawnArgs).toContain('--format');
            expect(spawnArgs).toContain('--include-checks');
            expect(spawnArgs).toContain('I');
            expect(spawnArgs).toContain('--include-experimental');
            expect(spawnArgs[spawnArgs.length - 1]).toBe(mockFilePath);
        });

        test('should pass ignore-checks when configured', async () => {
            vi.mocked(spawn).mockReturnValue(createMockChildProcess(0, '[]'));
            const settings = { ...mockSettings, ignoreChecks: ['W3002', 'E1001'] as readonly string[] };

            const executor = new LocalCfnLintExecutor(mockCfnLintPath, settings);
            await executor.lintFile(mockFilePath, mockUri, CloudFormationFileType.Template);

            const spawnArgs = vi.mocked(spawn).mock.calls[0][1] as string[];
            expect(spawnArgs).toContain('--ignore-checks');
            expect(spawnArgs).toContain('W3002');
            expect(spawnArgs).toContain('E1001');
        });

        test('should omit flags for empty settings', async () => {
            vi.mocked(spawn).mockReturnValue(createMockChildProcess(0, '[]'));
            const settings = {
                ...mockSettings,
                includeChecks: [] as readonly string[],
                includeExperimental: false,
                ignoreChecks: [] as readonly string[],
            };

            const executor = new LocalCfnLintExecutor(mockCfnLintPath, settings);
            await executor.lintFile(mockFilePath, mockUri, CloudFormationFileType.Template);

            const spawnArgs = vi.mocked(spawn).mock.calls[0][1] as string[];
            expect(spawnArgs).not.toContain('--include-checks');
            expect(spawnArgs).not.toContain('--include-experimental');
            expect(spawnArgs).not.toContain('--ignore-checks');
        });

        test('should reflect updated settings', async () => {
            vi.mocked(spawn).mockReturnValue(createMockChildProcess(0, '[]'));
            const executor = new LocalCfnLintExecutor(mockCfnLintPath, mockSettings);

            executor.updateSettings({ ...mockSettings, includeExperimental: false });
            await executor.lintFile(mockFilePath, mockUri, CloudFormationFileType.Template);

            const spawnArgs = vi.mocked(spawn).mock.calls[0][1] as string[];
            expect(spawnArgs).not.toContain('--include-experimental');
        });
    });
});
