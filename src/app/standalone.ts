import { createConnection, InitializeParams, ProposedFeatures } from 'vscode-languageserver/node';
import { InitializedParams } from 'vscode-languageserver-protocol';
import { LspCapabilities } from '../protocol/LspCapabilities';
import { LspConnection } from '../protocol/LspConnection';
import { LoggerFactory } from '../telemetry/LoggerFactory';
import { TelemetryService } from '../telemetry/TelemetryService';
import { AwsEnv, NodeEnv } from '../utils/Environment';
import { ExtensionName } from '../utils/ExtensionConfig';

let server: unknown;

function getLogger() {
    return LoggerFactory.getLogger('Init');
}

/* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-return, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-argument, @typescript-eslint/no-unsafe-assignment */
async function onInitialize(params: InitializeParams) {
    const ClientInfo = params.clientInfo;
    const AwsMetadata = params.initializationOptions['aws'];

    getLogger().info(
        {
            ClientInfo,
            AwsMetadata,
            NodeEnv,
            AwsEnv,
        },
        `${ExtensionName} initializing...`,
    );
    LoggerFactory.initialize(AwsMetadata);
    TelemetryService.initialize(ClientInfo, AwsMetadata);

    // Dynamically load these modules so that OTEL can instrument all the libraries first
    const { CfnInfraCore } = await import('../server/CfnInfraCore');
    const { CfnServer } = await import('../server/CfnServer');

    const core = new CfnInfraCore(lsp.components, params);
    server = new CfnServer(lsp.components, core);
    return LspCapabilities;
}

function onInitialized(params: InitializedParams) {
    getLogger().info(`${ExtensionName} initialized`);
    (server as any).initialized(params);
}

function onShutdown() {
    getLogger().info(`${ExtensionName} shutting down...`);
    return (server as any).close();
}

function onExit() {
    getLogger().info(`${ExtensionName} exiting`);
}

const lsp = new LspConnection(createConnection(ProposedFeatures.all), {
    onInitialize,
    onInitialized,
    onShutdown,
    onExit,
});
lsp.listen();
