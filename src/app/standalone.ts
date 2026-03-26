import './polyfills';
import { createConnection, ProposedFeatures } from 'vscode-languageserver/node'; // eslint-disable-line no-restricted-imports
import { InitializedParams } from 'vscode-languageserver-protocol';
import { LspCapabilities } from '../protocol/LspCapabilities';
import { LspConnection } from '../protocol/LspConnection';
import { ExtendedInitializeParams } from '../server/InitParams';
import { ExtensionName } from '../utils/ExtensionConfig';
import { staticInitialize } from './initialize';

let server: unknown;

/* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-return, @typescript-eslint/no-unsafe-member-access, no-console */
async function onInitialize(params: ExtendedInitializeParams) {
    staticInitialize(params.clientInfo, params.initializationOptions?.['aws']);

    // Dynamically load these modules so that OTEL can instrument all the libraries first
    const { CfnInfraCore } = await import('../server/CfnInfraCore');
    const core = new CfnInfraCore(lsp.components, params);

    const { CfnServer } = await import('../server/CfnServer');
    server = new CfnServer(lsp.components, core);
    return LspCapabilities;
}

function onInitialized(params: InitializedParams) {
    (server as any).initialized(params);
    console.error(`${ExtensionName} initialized`);
}

function onShutdown() {
    console.error(`${ExtensionName} shutting down...`);
    return (server as any).close();
}

function onExit() {
    console.error(`${ExtensionName} exiting`);
}

const lsp = new LspConnection(createConnection(ProposedFeatures.all), {
    onInitialize,
    onInitialized,
    onShutdown,
    onExit,
});
lsp.listen();

process.on('unhandledRejection', (reason, _promise) => {
    console.error(reason, 'Unhandled promise rejection');
});

process.on('uncaughtException', (error, origin) => {
    console.error(error, `Unhandled exception ${origin}`);
});
