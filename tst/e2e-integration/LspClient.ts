import { randomBytes } from 'crypto';
import { readFileSync } from 'fs';
import { join } from 'path';
import { PassThrough } from 'stream';
import { StreamMessageReader, StreamMessageWriter, createMessageConnection } from 'vscode-jsonrpc/node';
import {
    InitializeRequest,
    InitializedNotification,
    ShutdownRequest,
    ExitNotification,
    DidOpenTextDocumentNotification,
    DidChangeTextDocumentNotification,
    DidCloseTextDocumentNotification,
    CompletionRequest,
    HoverRequest,
    DefinitionRequest,
    DocumentSymbolRequest,
    CodeActionRequest,
    CompletionParams,
    HoverParams,
    DefinitionParams,
    DocumentSymbolParams,
    CodeActionParams,
    DidOpenTextDocumentParams,
    DidChangeTextDocumentParams,
    DidCloseTextDocumentParams,
} from 'vscode-languageserver';
import { createConnection } from 'vscode-languageserver/node';
import { MemoryDataStoreFactoryProvider } from '../../src/datastore/DataStore';
import { FeatureFlagProvider } from '../../src/featureFlag/FeatureFlagProvider';
import { LspCapabilities } from '../../src/protocol/LspCapabilities';
import { LspConnection } from '../../src/protocol/LspConnection';
import { CfnExternal } from '../../src/server/CfnExternal';
import { CfnInfraCore } from '../../src/server/CfnInfraCore';
import { CfnLspProviders } from '../../src/server/CfnLspProviders';
import { CfnServer } from '../../src/server/CfnServer';
import { AwsMetadata } from '../../src/server/InitParams';
import { LoggerFactory } from '../../src/telemetry/LoggerFactory';
import { TelemetryService } from '../../src/telemetry/TelemetryService';
import { ExtensionName } from '../../src/utils/ExtensionConfig';

const awsMetadata: AwsMetadata = {
    clientInfo: {
        extension: {
            name: `E2E Test ${ExtensionName}`,
            version: '1.0.0-e2e',
        },
        clientId: '2222-2222-2222-2222',
    },
    encryption: {
        key: randomBytes(32).toString('base64'),
        mode: 'JWT',
    },
};

export class LspClient {
    private readonly readStream = new PassThrough();
    private readonly writeStream = new PassThrough();
    private readonly clientConnection = createMessageConnection(
        new StreamMessageReader(this.writeStream),
        new StreamMessageWriter(this.readStream),
    );
    private readonly serverConnection: LspConnection;
    private server!: CfnServer;
    private isReady = false;

    constructor() {
        this.serverConnection = new LspConnection(
            createConnection(new StreamMessageReader(this.readStream), new StreamMessageWriter(this.writeStream)),
            {
                onInitialize: (initParams) => {
                    const lsp = this.serverConnection.components;
                    LoggerFactory.initialize(awsMetadata);

                    try {
                        TelemetryService.initialize(awsMetadata.clientInfo?.extension, awsMetadata);
                    } catch {
                        // Already initialized TelemetryService, ignore
                    }

                    const dataStoreFactory = new MemoryDataStoreFactoryProvider();
                    const core = new CfnInfraCore(lsp, initParams, { dataStoreFactory });
                    const external = new CfnExternal(lsp, core, {
                        featureFlags: new FeatureFlagProvider(
                            join(__dirname, '..', '..', 'assets', 'featureFlag', 'alpha.json'),
                        ),
                    });
                    const providers = new CfnLspProviders(core, external);

                    this.server = new CfnServer(lsp, core, external, providers);
                    return LspCapabilities;
                },
                onInitialized: (initParams) => this.server.initialized(initParams),
                onShutdown: () => this.server.close(),
            },
        );

        this.serverConnection.listen();
        this.clientConnection.listen();
    }

    async start(): Promise<void> {
        if (!this.isReady) {
            await this.clientConnection.sendRequest(InitializeRequest.method, {
                processId: process.pid,
                rootUri: 'file:///test',
                capabilities: {},
                clientInfo: awsMetadata.clientInfo?.extension,
                workspaceFolders: [],
                initializationOptions: {
                    aws: awsMetadata,
                },
            });
            await this.clientConnection.sendNotification(InitializedNotification.method, {});
            this.isReady = true;
        }
    }

    async shutdown(): Promise<void> {
        if (this.isReady) {
            await this.clientConnection.sendRequest(ShutdownRequest.method);
            await this.clientConnection.sendNotification(ExitNotification.method);
            this.clientConnection.dispose();
            this.isReady = false;
        }
    }

    private async send(method: string, params: any) {
        await this.start();
        return await this.clientConnection.sendRequest(method, params);
    }

    private async notify(method: string, params: any) {
        await this.start();
        await this.clientConnection.sendNotification(method, params);
        await this.wait(100);
    }

    async openDocument(params: DidOpenTextDocumentParams) {
        await this.notify(DidOpenTextDocumentNotification.method, params);
    }

    async changeDocument(params: DidChangeTextDocumentParams) {
        await this.notify(DidChangeTextDocumentNotification.method, params);
    }

    async closeDocument(params: DidCloseTextDocumentParams) {
        await this.notify(DidCloseTextDocumentNotification.method, params);
    }

    completion(params: CompletionParams): Promise<any> {
        return this.send(CompletionRequest.method, params);
    }

    hover(params: HoverParams): Promise<any> {
        return this.send(HoverRequest.method, params);
    }

    definition(params: DefinitionParams): Promise<any> {
        return this.send(DefinitionRequest.method, params);
    }

    documentSymbol(params: DocumentSymbolParams): Promise<any> {
        return this.send(DocumentSymbolRequest.method, params);
    }

    codeAction(params: CodeActionParams): Promise<any> {
        return this.send(CodeActionRequest.method, params);
    }

    private wait(ms: number): Promise<void> {
        return new Promise((resolve) => setTimeout(resolve, ms));
    }

    // Helper methods for convenience
    async openYamlTemplate(content: string, filename = 'template.yaml'): Promise<string> {
        const uri = `file:///test/${filename}`;
        await this.openDocument({
            textDocument: { uri, languageId: 'yaml', version: 1, text: content },
        });
        return uri;
    }

    async openJsonTemplate(content: string, filename = 'template.json'): Promise<string> {
        const uri = `file:///test/${filename}`;
        await this.openDocument({
            textDocument: { uri, languageId: 'json', version: 1, text: content },
        });
        return uri;
    }

    async waitForProcessing(ms = 500): Promise<void> {
        await this.wait(ms);
    }
}

export function loadTemplate(filename: string): string {
    const templatePath = join(__dirname, '..', 'resources', 'templates', filename);
    return readFileSync(templatePath, 'utf8');
}
