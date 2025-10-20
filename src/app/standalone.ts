import { createConnection, InitializeParams, ProposedFeatures } from 'vscode-languageserver/node';
import { InitializedParams } from 'vscode-languageserver-protocol';
import { LspCapabilities } from '../protocol/LspCapabilities';
import { LspConnection } from '../protocol/LspConnection';
import { LoggerFactory } from '../telemetry/LoggerFactory';
import { TelemetryService } from '../telemetry/TelemetryService';

let server: unknown;

/* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-return, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-argument */
async function onInitialize(params: InitializeParams) {
    LoggerFactory.initialize(params.initializationOptions['aws']);
    TelemetryService.initialize(params.clientInfo, params.initializationOptions['aws']);

    // Dynamically load these modules so that OTEL can instrument all the libraries first
    const { CfnInfraCore } = await import('../server/CfnInfraCore');
    const { CfnServer } = await import('../server/CfnServer');

    const core = new CfnInfraCore(lsp.components, params);
    server = new CfnServer(lsp.components, core);
    return LspCapabilities;
}

function onInitialized(params: InitializedParams) {
    (server as any).initialized(params);
}

function onShutdown() {
    return (server as any).close();
}

function onExit() {}

const lsp = new LspConnection(createConnection(ProposedFeatures.all), {
    onInitialize,
    onInitialized,
    onShutdown,
    onExit,
});
lsp.listen();
