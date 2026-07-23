import './polyfills';
import { createConnection, ProposedFeatures } from 'vscode-languageserver/node'; // eslint-disable-line no-restricted-imports
import { InitializedParams } from 'vscode-languageserver-protocol';
import { LspCapabilities } from '../protocol/LspCapabilities';
import { LspConnection } from '../protocol/LspConnection';
import { ExtendedInitializeParams } from '../server/InitParams';
import { ExtensionName } from '../utils/ExtensionConfig';
import { staticInitialize } from './initialize';

let server: unknown;

/* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access, no-console */
async function onInitialize(params: ExtendedInitializeParams) {
    staticInitialize(params.clientInfo, params.initializationOptions?.['aws']);

    // Dynamically load these modules so that OTEL can instrument all the libraries first
    const { CfnInfraCore } = await import('../server/CfnInfraCore');
    const core = new CfnInfraCore(lsp.components, params);
    await core.dataStoreFactory.initialize();

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
    // Respond even if close() hangs (e.g. a stalled telemetry flush) — an
    // unanswered shutdown makes the client abandon the handshake and spawn a
    // replacement, leaking this process (see docs/memory-investigation.md,
    // "Orphaned Server Processes").
    return Promise.race([(server as any).close(), new Promise((resolve) => setTimeout(resolve, 5000))]);
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

// Exit when the client abandons the connection, regardless of handshake state.
// Exit when the client drops the connection — without this, active
// handles keep the event loop alive and the process leaks.
// This only fires when the client abandons the handshake; normal
// shutdown flushes telemetry correctly and exits via the library before stdin closes.
// eslint-disable-next-line unicorn/no-process-exit
process.stdin.on('close', () => process.exit(0));
