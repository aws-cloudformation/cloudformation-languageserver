import { createConnection, InitializeParams, ProposedFeatures } from 'vscode-languageserver/node';
import { InitializedParams } from 'vscode-languageserver-protocol';
import { LspCapabilities } from '../protocol/LspCapabilities';
import { LspConnection } from '../protocol/LspConnection';
import { CfnServer } from '../server/CfnServer';
import { LoggerFactory } from '../telemetry/LoggerFactory';
import { TelemetryService } from '../telemetry/TelemetryService';

let server: CfnServer | undefined;

function onInitialize(params: InitializeParams) {
    server = new CfnServer(lsp.features, params);
    return LspCapabilities;
}

function onInitialized(params: InitializedParams) {
    server?.initialized(params);
}

function onShutdown() {
    return server?.close();
}

function onExit() {}

// Startup telemetry and loggers before LSP creation
const _logger = LoggerFactory.instance; // eslint-disable-line @typescript-eslint/no-unused-vars
const _telemetry = TelemetryService.instance; // eslint-disable-line @typescript-eslint/no-unused-vars

const lsp = new LspConnection(createConnection(ProposedFeatures.all), {
    onInitialize,
    onInitialized,
    onShutdown,
    onExit,
});
lsp.listen();
