import { arch, machine, platform, release, type } from 'os';
import { createConnection, ProposedFeatures } from 'vscode-languageserver/node';
import { InitializedParams } from 'vscode-languageserver-protocol';
import { LspCapabilities } from '../protocol/LspCapabilities';
import { LspConnection } from '../protocol/LspConnection';
import { ExtendedInitializeParams } from '../server/InitParams';
import { LoggerFactory } from '../telemetry/LoggerFactory';
import { TelemetryService } from '../telemetry/TelemetryService';
import { AwsEnv, NodeEnv, ProcessPlatform } from '../utils/Environment';
import { ExtensionName } from '../utils/ExtensionConfig';

let server: unknown;

/* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-return, @typescript-eslint/no-unsafe-member-access, no-console */
async function onInitialize(params: ExtendedInitializeParams) {
    const ClientInfo = params.clientInfo;
    const AwsMetadata = params.initializationOptions?.['aws'];
    LoggerFactory.initialize(AwsMetadata?.logLevel);

    getLogger().info(
        {
            ClientInfo,
            NodeEnv,
            AwsEnv,
            aws: {
                clientInfo: AwsMetadata?.clientInfo,
                telemetryEnabled: AwsMetadata?.telemetryEnabled,
                logLevel: AwsMetadata?.logLevel,
                cloudformation: AwsMetadata?.cloudformation,
            },
        },
        `${ExtensionName} initializing...`,
    );
    getLogger().info({
        Machine: `${type()}-${platform()}-${arch()}-${machine()}-${release()}`,
        Process: `${ProcessPlatform}-${process.arch}`,
        Runtime: `node=${process.versions.node} v8=${process.versions.v8} uv=${process.versions.uv} modules=${process.versions.modules}`,
    });
    TelemetryService.initialize(ClientInfo, AwsMetadata);

    // Dynamically load these modules so that OTEL can instrument all the libraries first
    const { CfnInfraCore } = await import('../server/CfnInfraCore');
    const core = new CfnInfraCore(lsp.components, params);

    const { CfnServer } = await import('../server/CfnServer');
    server = new CfnServer(lsp.components, core);
    return LspCapabilities;
}

function onInitialized(params: InitializedParams) {
    (server as any).initialized(params);
    getLogger().info(`${ExtensionName} initialized`);
}

function onShutdown() {
    console.info(`${ExtensionName} shutting down...`);
    return (server as any).close();
}

function onExit() {
    console.info(`${ExtensionName} exiting`);
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

    try {
        getLogger().error(reason, 'Unhandled promise rejection');
    } catch {
        // do nothing
    }
});

process.on('uncaughtException', (error, origin) => {
    console.error(error, `Unhandled exception ${origin}`);
    try {
        getLogger().error(error, `Uncaught exception ${origin}`);
    } catch {
        // do nothing
    }
});

function getLogger() {
    return LoggerFactory.getLogger('Init');
}
