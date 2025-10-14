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
    DidSaveTextDocumentNotification,
    CompletionRequest,
    HoverRequest,
    DefinitionRequest,
    DocumentSymbolRequest,
    CodeActionRequest,
    ExecuteCommandRequest,
    DidChangeConfigurationNotification,
    SignatureHelpRequest,
    WorkspaceSymbolRequest,
    ReferencesRequest,
    RenameRequest,
    CompletionResolveRequest,
    DidChangeWorkspaceFoldersNotification,
    CompletionParams,
    HoverParams,
    DefinitionParams,
    DocumentSymbolParams,
    CodeActionParams,
    ExecuteCommandParams,
    DidChangeConfigurationParams,
    DidOpenTextDocumentParams,
    DidChangeTextDocumentParams,
    DidCloseTextDocumentParams,
    DidSaveTextDocumentParams,
    TextDocumentPositionParams,
    WorkspaceSymbolParams,
    ReferenceParams,
    RenameParams,
    CompletionItem,
    DidChangeWorkspaceFoldersParams,
} from 'vscode-languageserver';
import { InitializeParams, createConnection } from 'vscode-languageserver/node';
import {
    IamCredentialsUpdateRequest,
    BearerCredentialsUpdateRequest,
    IamCredentialsDeleteNotification,
    BearerCredentialsDeleteNotification,
    GetConnectionMetadataRequest,
    ListProfilesRequest,
    UpdateProfileRequest,
    GetSsoTokenRequest,
    InvalidateSsoTokenRequest,
    SsoTokenChangedNotification,
} from '../../src/auth/AuthProtocol';
import {
    UpdateCredentialsParams,
    ListProfilesParams,
    UpdateProfileParams,
    GetSsoTokenParams,
    InvalidateSsoTokenParams,
    SsoTokenChangedParams,
} from '../../src/auth/AwsLspAuthTypes';
import { MemoryDataStoreFactoryProvider } from '../../src/datastore/DataStore';
import { LspCapabilities } from '../../src/protocol/LspCapabilities';
import { LspConnection } from '../../src/protocol/LspConnection';
import { GetSchemaTaskManager } from '../../src/schema/GetSchemaTaskManager';
import { SchemaStore } from '../../src/schema/SchemaStore';
import { CfnExternal } from '../../src/server/CfnExternal';
import { CfnInfraCore } from '../../src/server/CfnInfraCore';
import { CfnLspProviders } from '../../src/server/CfnLspProviders';
import { CfnServer } from '../../src/server/CfnServer';
import { LoggerFactory } from '../../src/telemetry/LoggerFactory';
import { TelemetryService } from '../../src/telemetry/TelemetryService';
import { Closeable } from '../../src/utils/Closeable';
import { ExtensionName } from '../../src/utils/ExtensionConfig';
import { createMockCfnLintService, createMockGuardService, mockCfnAi } from './MockServerComponents';
import { schemaFileType } from './SchemaUtils';

const clientInfo = { name: `Test ${ExtensionName}`, version: '1.0.0-test' };

export class TestExtension implements Closeable {
    private readonly readStream = new PassThrough();
    private readonly writeStream = new PassThrough();
    private readonly clientConnection = createMessageConnection(
        new StreamMessageReader(this.writeStream),
        new StreamMessageWriter(this.readStream),
    );
    private readonly serverConnection: LspConnection;

    core!: CfnInfraCore;
    external!: CfnExternal;
    providers!: CfnLspProviders;
    server!: CfnServer;

    private isReady = false;

    constructor(
        private readonly initializeParams = {
            processId: process.pid,
            rootUri: null,
            capabilities: {},
            clientInfo,
            workspaceFolders: [],
            initializationOptions: {
                clientInfo: {
                    clientId: 'SomeClientId',
                    telemetryEnabled: false,
                    logLevel: 'info',
                },
            },
        } as InitializeParams,
    ) {
        this.serverConnection = new LspConnection(
            createConnection(new StreamMessageReader(this.readStream), new StreamMessageWriter(this.writeStream)),
            {
                onInitialize: (params) => {
                    const lsp = this.serverConnection.components;
                    LoggerFactory.initialize(params.initializationOptions['clientInfo']);

                    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
                    // @ts-ignore
                    if (TelemetryService._instance === undefined) {
                        TelemetryService.initialize(params.clientInfo, params.initializationOptions['clientInfo']);
                    }

                    const dataStoreFactory = new MemoryDataStoreFactoryProvider();
                    this.core = new CfnInfraCore(lsp, params, {
                        dataStoreFactory: new MemoryDataStoreFactoryProvider(),
                    });

                    const schemaStore = new SchemaStore(dataStoreFactory);
                    this.external = new CfnExternal(lsp, this.core, {
                        schemaStore,
                        schemaTaskManager: new GetSchemaTaskManager(
                            schemaStore,
                            () => Promise.resolve(schemaFileType()),
                            () => Promise.resolve([]),
                        ),
                        cfnLintService: createMockCfnLintService(),
                        guardService: createMockGuardService(),
                    });

                    this.providers = new CfnLspProviders(this.core, this.external, {
                        cfnAI: mockCfnAi(),
                    });
                    this.server = new CfnServer(lsp, this.core, this.external, this.providers);
                    return LspCapabilities;
                },
                onInitialized: (params) => this.server.initialized(params),
                onShutdown: () => this.server.close(),
            },
        );

        this.serverConnection.listen();
        this.clientConnection.listen();
    }

    get components() {
        return {
            ...this.core,
            ...this.external,
            ...this.providers,
        };
    }

    async ready() {
        if (!this.isReady) {
            await this.clientConnection.sendRequest(InitializeRequest.type, this.initializeParams);
            await this.clientConnection.sendNotification(InitializedNotification.type, {});
            this.isReady = true;
        }
    }

    async send(method: string, params: any) {
        await this.ready();
        return await this.clientConnection.sendRequest(method, params);
    }

    async notify(method: string, params: any) {
        await this.ready();
        return await this.clientConnection.sendNotification(method, params);
    }

    async close() {
        await this.clientConnection.sendRequest(ShutdownRequest.type);
        await this.clientConnection.sendNotification(ExitNotification.type);
        this.clientConnection.dispose();
    }

    // ====================================================================
    // HELPERS
    // ====================================================================

    openDocument(params: DidOpenTextDocumentParams) {
        return this.notify(DidOpenTextDocumentNotification.method, params);
    }

    changeDocument(params: DidChangeTextDocumentParams) {
        return this.notify(DidChangeTextDocumentNotification.method, params);
    }

    closeDocument(params: DidCloseTextDocumentParams) {
        return this.notify(DidCloseTextDocumentNotification.method, params);
    }

    saveDocument(params: DidSaveTextDocumentParams) {
        return this.notify(DidSaveTextDocumentNotification.method, params);
    }

    completion(params: CompletionParams) {
        return this.send(CompletionRequest.method, params);
    }

    hover(params: HoverParams) {
        return this.send(HoverRequest.method, params);
    }

    definition(params: DefinitionParams) {
        return this.send(DefinitionRequest.method, params);
    }

    documentSymbol(params: DocumentSymbolParams) {
        return this.send(DocumentSymbolRequest.method, params);
    }

    codeAction(params: CodeActionParams) {
        return this.send(CodeActionRequest.method, params);
    }

    executeCommand(params: ExecuteCommandParams) {
        return this.send(ExecuteCommandRequest.method, params);
    }

    signatureHelp(params: TextDocumentPositionParams) {
        return this.send(SignatureHelpRequest.method, params);
    }

    workspaceSymbol(params: WorkspaceSymbolParams) {
        return this.send(WorkspaceSymbolRequest.method, params);
    }

    references(params: ReferenceParams) {
        return this.send(ReferencesRequest.method, params);
    }

    rename(params: RenameParams) {
        return this.send(RenameRequest.method, params);
    }

    completionResolve(params: CompletionItem) {
        return this.send(CompletionResolveRequest.method, params);
    }

    changeConfiguration(params: DidChangeConfigurationParams) {
        return this.notify(DidChangeConfigurationNotification.method, params);
    }

    changeWorkspaceFolders(params: DidChangeWorkspaceFoldersParams) {
        return this.notify(DidChangeWorkspaceFoldersNotification.method, params);
    }

    updateIamCredentials(params: UpdateCredentialsParams) {
        return this.send(IamCredentialsUpdateRequest.method, params);
    }

    updateBearerCredentials(params: UpdateCredentialsParams) {
        return this.send(BearerCredentialsUpdateRequest.method, params);
    }

    deleteIamCredentials() {
        return this.notify(IamCredentialsDeleteNotification.method, undefined);
    }

    deleteBearerCredentials() {
        return this.notify(BearerCredentialsDeleteNotification.method, undefined);
    }

    getConnectionMetadata() {
        return this.send(GetConnectionMetadataRequest.method, undefined);
    }

    listProfiles(params: ListProfilesParams) {
        return this.send(ListProfilesRequest.method, params);
    }

    updateProfile(params: UpdateProfileParams) {
        return this.send(UpdateProfileRequest.method, params);
    }

    getSsoToken(params: GetSsoTokenParams) {
        return this.send(GetSsoTokenRequest.method, params);
    }

    invalidateSsoToken(params: InvalidateSsoTokenParams) {
        return this.send(InvalidateSsoTokenRequest.method, params);
    }

    ssoTokenChanged(params: SsoTokenChangedParams) {
        return this.notify(SsoTokenChangedNotification.method, params);
    }
}
