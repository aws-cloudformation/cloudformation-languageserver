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

    function paramsWithExtensionName(name: unknown): ExtendedInitializeParams {
        return {
            processId: null,
            rootUri: null,
            capabilities: {},
            initializationOptions: {
                aws: { clientInfo: { extension: { name, version: '1.0.0' } } },
            },
        } as unknown as ExtendedInitializeParams;
    }

    beforeEach(() => {
        components = createMockComponents();
    });

    it('should derive client-specific commands from the extension name', () => {
        const core = createCore(paramsWithExtensionName('aws.cloudformation'));

        expect(core.commands).toEqual(createLspCommands('aws.cloudformation'));
    });

    it('should derive the commands from the sanitized extension name', () => {
        const core = createCore(paramsWithExtensionName('Test AWS CloudFormation'));

        expect(core.commands).toEqual(createLspCommands('Test-AWS-CloudFormation'));
    });

    it('should derive the unsuffixed commands when the client sends no extension name', () => {
        const core = createCore({} as ExtendedInitializeParams);

        expect(core.commands).toEqual(createLspCommands());
    });

    it('should fail initialization when the extension name is not a string', () => {
        expect(() => createCore(paramsWithExtensionName(42))).toThrow(
            /initializationOptions\.aws\.clientInfo\.extension\.name/,
        );
    });

    it('should honor an explicit commands override', () => {
        const commands = createLspCommands('override');

        const core = createCore(paramsWithExtensionName('aws.cloudformation'), { commands });

        expect(core.commands).toBe(commands);
    });
});
