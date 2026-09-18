import { spawn, type ChildProcess } from 'child_process';
import { EventEmitter } from 'events';
import { Readable } from 'stream';
import { describe, expect, beforeEach, vi, test } from 'vitest';
import { LocalCfnLintExecutor } from '../../../../src/services/cfnLint/LocalCfnLintExecutor';
import { CloudFormationFileType } from '../../../../src/document/Document';

// Mock the module: spawn is a free function, not an injectable interface (cf. PyodideWorkerManager.test.ts).
vi.mock('child_process', async (importOriginal) => {
    const actual = await importOriginal<typeof import('child_process')>();
    return { ...actual, spawn: vi.fn() };
});

const mockFilePath = 'test.yaml';
const mockUri = 'file:///test.yaml';
const mockCfnLintPath = '/usr/local/bin/cfn-lint';

interface MockDiagnostic {
    ruleId: string;
    level: string;
}

const errorFinding: MockDiagnostic = { ruleId: 'E1001', level: 'Error' };
const warningFinding: MockDiagnostic = { ruleId: 'W8001', level: 'Warning' };
const infoFinding: MockDiagnostic = { ruleId: 'I4010', level: 'Info' };

/**
 * Fake ChildProcess backed by a real EventEmitter so multiple listeners per event work (a Map keyed
 * by event name would drop all but the last). Emits 'close' after stdout/stderr flush.
 */
function createMockChildProcess(exitCode: number | null, stdout: string, stderr: string = ''): ChildProcess {
    const stdoutStream = new Readable({ read() {} });
    const stderrStream = new Readable({ read() {} });
    const child = new EventEmitter() as unknown as ChildProcess;
    (child as unknown as { stdout: Readable }).stdout = stdoutStream;
    (child as unknown as { stderr: Readable }).stderr = stderrStream;

    setImmediate(() => {
        if (stdout) stdoutStream.push(stdout);
        stdoutStream.push(null);
        if (stderr) stderrStream.push(stderr);
        stderrStream.push(null);
        child.emit('close', exitCode);
    });

    return child;
}

/** Builds cfn-lint `--format json` output for the given findings. */
function makeDiagnosticsJson(findings: MockDiagnostic[]): string {
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
            Rule: {
                Id: ruleId,
                Description: 'Test rule description',
                Source: 'https://example.com',
            },
        })),
    );
}

describe('LocalCfnLintExecutor', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    describe('exit code handling', () => {
        // Exit code is a 2|4|8 severity bitmask, so combined codes (e.g. 6 = errors + warnings) are
        // valid; each fixture matches the severities its code encodes, so we assert content not just parsing.
        test.each([
            { exitCode: 0, description: 'no issues', findings: [], expectedCount: 0 },
            { exitCode: 2, description: 'error findings', findings: [errorFinding], expectedCount: 1 },
            { exitCode: 4, description: 'warning findings', findings: [warningFinding], expectedCount: 1 },
            {
                exitCode: 6,
                description: 'errors + warnings',
                findings: [errorFinding, warningFinding],
                expectedCount: 2,
            },
            { exitCode: 8, description: 'informational findings', findings: [infoFinding], expectedCount: 1 },
            {
                exitCode: 10,
                description: 'errors + informational',
                findings: [errorFinding, infoFinding],
                expectedCount: 2,
            },
            {
                exitCode: 12,
                description: 'warnings + informational',
                findings: [warningFinding, infoFinding],
                expectedCount: 2,
            },
            {
                exitCode: 14,
                description: 'all severity levels',
                findings: [errorFinding, warningFinding, infoFinding],
                expectedCount: 3,
            },
        ])(
            'should parse diagnostics from exit code $exitCode ($description)',
            async ({ exitCode, findings, expectedCount }) => {
                vi.mocked(spawn).mockReturnValue(createMockChildProcess(exitCode, makeDiagnosticsJson(findings)));

                const executor = new LocalCfnLintExecutor(mockCfnLintPath);
                const result = await executor.lintFile(mockFilePath, mockUri, CloudFormationFileType.Template);

                if (expectedCount === 0) {
                    expect(result).toEqual([]);
                } else {
                    expect(result).toHaveLength(1);
                    expect(result[0].diagnostics).toHaveLength(expectedCount);
                }
            },
        );

        test('should reject with a parse error when stdout is not valid JSON', async () => {
            vi.mocked(spawn).mockReturnValue(createMockChildProcess(2, 'not json', 'Malformed output'));

            const executor = new LocalCfnLintExecutor(mockCfnLintPath);
            await expect(executor.lintFile(mockFilePath, mockUri, CloudFormationFileType.Template)).rejects.toThrow(
                'Failed to parse cfn-lint output (exit code 2)',
            );
        });

        test('should reject when cfn-lint exits with code 1 (tool error)', async () => {
            vi.mocked(spawn).mockReturnValue(createMockChildProcess(1, '', 'ValueError: bad arguments'));

            const executor = new LocalCfnLintExecutor(mockCfnLintPath);
            await expect(executor.lintFile(mockFilePath, mockUri, CloudFormationFileType.Template)).rejects.toThrow(
                'cfn-lint failed (exit code 1): ValueError: bad arguments',
            );
        });

        test('should return empty diagnostics when stdout is empty', async () => {
            vi.mocked(spawn).mockReturnValue(createMockChildProcess(0, ''));

            const executor = new LocalCfnLintExecutor(mockCfnLintPath);
            const result = await executor.lintFile(mockFilePath, mockUri, CloudFormationFileType.Template);

            expect(result).toEqual([]);
        });

        test('should map informational level to Information severity', async () => {
            vi.mocked(spawn).mockReturnValue(createMockChildProcess(8, makeDiagnosticsJson([infoFinding])));

            const executor = new LocalCfnLintExecutor(mockCfnLintPath);
            const result = await executor.lintFile(mockFilePath, mockUri, CloudFormationFileType.Template);

            expect(result).toHaveLength(1);
            expect(result[0].diagnostics).toHaveLength(1);
            expect(result[0].diagnostics[0].code).toBe('I4010');
        });

        test('should map warning level to Warning severity', async () => {
            vi.mocked(spawn).mockReturnValue(createMockChildProcess(4, makeDiagnosticsJson([warningFinding])));

            const executor = new LocalCfnLintExecutor(mockCfnLintPath);
            const result = await executor.lintFile(mockFilePath, mockUri, CloudFormationFileType.Template);

            expect(result).toHaveLength(1);
            expect(result[0].diagnostics).toHaveLength(1);
            expect(result[0].diagnostics[0].code).toBe('W8001');
        });
    });
});
