import { createConnection, InitializeParams, ProposedFeatures } from 'vscode-languageserver/node';
import { InitializedParams } from 'vscode-languageserver-protocol';
import { LspCapabilities } from '../protocol/LspCapabilities';
import { LspConnection } from '../protocol/LspConnection';
import { CfnInfraCore } from '../server/CfnInfraCore';
import { CfnServer } from '../server/CfnServer';

let server: CfnServer | undefined;

function onInitialize(params: InitializeParams) {
    server = new CfnServer(lsp.components, new CfnInfraCore(lsp.components, params));
    return LspCapabilities;
}

function onInitialized(params: InitializedParams) {
    server?.initialized(params);
}

function onShutdown() {
    return server?.close();
}

function onExit() {}

const lsp = new LspConnection(createConnection(ProposedFeatures.all), {
    onInitialize,
    onInitialized,
    onShutdown,
    onExit,
});
lsp.listen();
