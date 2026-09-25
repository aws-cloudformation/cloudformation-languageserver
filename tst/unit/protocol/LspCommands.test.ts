import { describe, expect, it } from 'vitest';
import { createLspCommands, resolveCommandSuffix, sanitizeCommandSuffix } from '../../../src/protocol/LspCommands';
import { ExtendedInitializeParams } from '../../../src/server/InitParams';

const BaseCommandIds = {
    clearDiagnostic: '/command/template/clear-diagnostic',
    trackCodeActionAccepted: '/command/codeAction/track',
    updateRegion: '/command/region/update',
};

function paramsWithCommandSuffix(commandSuffix: unknown): ExtendedInitializeParams {
    return {
        processId: null,
        rootUri: null,
        capabilities: {},
        initializationOptions: {
            aws: {
                clientInfo: {
                    extension: { name: 'toolkit-vscode', version: '1.0.0' },
                },
                commandSuffix,
            },
        },
    } as unknown as ExtendedInitializeParams;
}

describe('LspCommands', () => {
    describe('createLspCommands', () => {
        it('should return the unsuffixed command ids when no suffix is given', () => {
            expect(createLspCommands()).toEqual(BaseCommandIds);
        });

        it('should return the unsuffixed command ids for an empty suffix', () => {
            expect(createLspCommands('')).toEqual(BaseCommandIds);
        });

        it('should append the suffix to every command id', () => {
            expect(createLspCommands('aws.cloudformation')).toEqual({
                clearDiagnostic: '/command/template/clear-diagnostic.aws.cloudformation',
                trackCodeActionAccepted: '/command/codeAction/track.aws.cloudformation',
                updateRegion: '/command/region/update.aws.cloudformation',
            });
        });

        it('should produce disjoint command sets for two different clients', () => {
            const toolkit = Object.values(createLspCommands('amazonwebservices.aws-toolkit-vscode'));
            const standalone = Object.values(createLspCommands('aws.cloudformation'));

            expect(toolkit.filter((id) => standalone.includes(id))).toEqual([]);
        });

        it('should produce the same command set for the same client', () => {
            expect(createLspCommands('aws.cloudformation')).toEqual(createLspCommands('aws.cloudformation'));
        });
    });

    describe('sanitizeCommandSuffix', () => {
        it.each([
            ['aws.cloudformation', 'aws.cloudformation'],
            ['amazonwebservices.aws-toolkit-vscode', 'amazonwebservices.aws-toolkit-vscode'],
            ['Test_Client_1', 'Test_Client_1'],
        ])('should keep the already valid name %s', (name, expected) => {
            expect(sanitizeCommandSuffix(name)).toBe(expected);
        });

        it('should replace each run of disallowed characters with a single dash', () => {
            expect(sanitizeCommandSuffix('Test AWS CloudFormation')).toBe('Test-AWS-CloudFormation');
            expect(sanitizeCommandSuffix('my   ext/tool\\kit:v2')).toBe('my-ext-tool-kit-v2');
            expect(sanitizeCommandSuffix('café ✓ 拡張')).toBe('caf');
        });

        it('should trim separators from both ends', () => {
            expect(sanitizeCommandSuffix('.-_aws.cloudformation_-.')).toBe('aws.cloudformation');
            expect(sanitizeCommandSuffix('  aws.cloudformation  ')).toBe('aws.cloudformation');
        });

        it('should truncate long names without leaving a trailing separator', () => {
            const suffix = sanitizeCommandSuffix(`${'a'.repeat(63)}-${'b'.repeat(20)}`);

            expect(suffix).toBe('a'.repeat(63));
            expect(suffix).toHaveLength(63);
        });

        it('should cap the suffix length', () => {
            expect(sanitizeCommandSuffix('x'.repeat(200))).toHaveLength(64);
        });

        it.each([
            ['empty', ''],
            ['whitespace only', ' '.repeat(3)],
            ['symbols only', '!@#$%^&*()'],
            ['separators only', '.-_'],
        ])('should return undefined for a name that is %s', (_label, name) => {
            expect(sanitizeCommandSuffix(name)).toBeUndefined();
        });

        it('should make the sanitized suffix usable in command ids', () => {
            const commands = createLspCommands(sanitizeCommandSuffix('Test AWS CloudFormation'));

            expect(commands.updateRegion).toBe('/command/region/update.Test-AWS-CloudFormation');
        });
    });

    describe('resolveCommandSuffix', () => {
        it('should use the configured command suffix', () => {
            expect(resolveCommandSuffix(paramsWithCommandSuffix('aws.cloudformation'))).toBe('aws.cloudformation');
        });

        it('should sanitize the configured command suffix', () => {
            expect(resolveCommandSuffix(paramsWithCommandSuffix('AWS Toolkit (VS Code)'))).toBe('AWS-Toolkit-VS-Code');
        });

        it('should return undefined when the sanitized command suffix is empty', () => {
            expect(resolveCommandSuffix(paramsWithCommandSuffix('  ***  '))).toBeUndefined();
        });

        it('should return undefined when no initialization options are sent', () => {
            const params = { processId: null, rootUri: null, capabilities: {} } as ExtendedInitializeParams;

            expect(resolveCommandSuffix(params)).toBeUndefined();
        });

        it('should return undefined when the aws metadata has no command suffix', () => {
            const params = {
                processId: null,
                rootUri: null,
                capabilities: {},
                initializationOptions: { aws: { telemetryEnabled: false } },
            } as ExtendedInitializeParams;

            expect(resolveCommandSuffix(params)).toBeUndefined();
        });

        it('should not derive a suffix from the extension name of existing clients', () => {
            const params = {
                processId: null,
                rootUri: null,
                capabilities: {},
                initializationOptions: {
                    aws: { clientInfo: { extension: { name: 'toolkit-vscode', version: '1.0.0' } } },
                },
            } as ExtendedInitializeParams;

            expect(resolveCommandSuffix(params)).toBeUndefined();
        });

        it.each([
            ['a number', 42],
            ['null', null],
            ['an object', { id: 'aws.cloudformation' }],
            ['an array', ['aws.cloudformation']],
            ['a boolean', true],
        ])('should throw when the command suffix is %s', (_label, suffix) => {
            expect(() => resolveCommandSuffix(paramsWithCommandSuffix(suffix))).toThrow(
                /initializationOptions\.aws\.commandSuffix/,
            );
        });
    });
});
