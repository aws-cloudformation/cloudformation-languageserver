import { beforeEach, describe, expect, it } from 'vitest';
import { createLspCommands } from '../../../src/protocol/LspCommands';
import { CfnInfraCore } from '../../../src/server/CfnInfraCore';
import { ExtendedInitializeParams } from '../../../src/server/InitParams';
import { createMockComponents } from '../../utils/MockServerComponents';

describe('CfnInfraCore commands', () => {
    let components: ReturnType<typeof createMockComponents>;

    function createCore(params: ExtendedInitializeParams, overrides: Partial<CfnInfraCore> = {}) {
        return new CfnInfraCore(components.lsp, params, {
            featureFlags: components.featureFlags,
            dataStoreFactory: components.dataStoreFactory,
            documentManager: components.documentManager,
            ...overrides,
        });
    }

    function paramsWithCommandSuffix(commandSuffix: unknown): ExtendedInitializeParams {
        return {
            processId: null,
            rootUri: null,
            capabilities: {},
            initializationOptions: {
                aws: { clientInfo: { extension: { name: 'toolkit-vscode', version: '1.0.0' } }, commandSuffix },
            },
        } as unknown as ExtendedInitializeParams;
    }

    beforeEach(() => {
        components = createMockComponents();
    });

    it('should derive client-specific commands from the configured command suffix', () => {
        const core = createCore(paramsWithCommandSuffix('aws.cloudformation'));

        expect(core.commands).toEqual(createLspCommands('aws.cloudformation'));
    });

    it('should derive the commands from the sanitized command suffix', () => {
        const core = createCore(paramsWithCommandSuffix('Test AWS CloudFormation'));

        expect(core.commands).toEqual(createLspCommands('Test-AWS-CloudFormation'));
    });

    it('should derive the unsuffixed commands when the client sends no command suffix', () => {
        const core = createCore({} as ExtendedInitializeParams);

        expect(core.commands).toEqual(createLspCommands());
    });

    it('should derive the unsuffixed commands for existing clients that only send an extension name', () => {
        const core = createCore(paramsWithCommandSuffix(undefined));

        expect(core.commands).toEqual(createLspCommands());
    });

    it('should fail initialization when the command suffix is not a string', () => {
        expect(() => createCore(paramsWithCommandSuffix(42))).toThrow(/initializationOptions\.aws\.commandSuffix/);
    });

    it('should honor an explicit commands override', () => {
        const commands = createLspCommands('override');

        const core = createCore(paramsWithCommandSuffix('aws.cloudformation'), { commands });

        expect(core.commands).toBe(commands);
    });
});
