import { randomBytes } from 'crypto';
import { readFileSync } from 'fs';
import { join } from 'path';
import { PassThrough } from 'stream';
import { v4 } from 'uuid';
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
    CodeLensParams,
    CodeLensRequest,
} from 'vscode-languageserver';
import { createConnection } from 'vscode-languageserver/node';
import { IamCredentialsUpdateRequest, IamCredentialsDeleteNotification } from '../../src/auth/AuthProtocol';
import { UpdateCredentialsParams } from '../../src/auth/AwsLspAuthTypes';
import { MultiDataStoreFactoryProvider } from '../../src/datastore/DataStore';
import { FeatureFlagProvider } from '../../src/featureFlag/FeatureFlagProvider';
import { LspCapabilities } from '../../src/protocol/LspCapabilities';
import { LspConnection } from '../../src/protocol/LspConnection';
import { SamStoreKey } from '../../src/schema/SamSchemas';
import { SchemaRetriever } from '../../src/schema/SchemaRetriever';
import { SchemaStore } from '../../src/schema/SchemaStore';
import { CfnExternal } from '../../src/server/CfnExternal';
import { CfnInfraCore } from '../../src/server/CfnInfraCore';
import { CfnLspProviders } from '../../src/server/CfnLspProviders';
import { CfnServer } from '../../src/server/CfnServer';
import { AwsMetadata, ExtendedInitializeParams } from '../../src/server/InitParams';
import { RelationshipSchemaService } from '../../src/services/RelationshipSchemaService';
import { DefaultSettings } from '../../src/settings/Settings';
import { LoggerFactory } from '../../src/telemetry/LoggerFactory';
import { Closeable } from '../../src/utils/Closeable';
import { ExtensionName } from '../../src/utils/ExtensionConfig';
import { createMockCfnLintService } from './MockServerComponents';
import { getTestPrivateSchemas, samFileType, SamSchemaFiles, schemaFileType, Schemas } from './SchemaUtils';
import { flushAllPromises, WaitFor } from './Utils';

type TestExtensionConfig = {
    id?: string;
    initializeParams?: Partial<ExtendedInitializeParams>;
    workspaceConfig?: Record<string, unknown>[];
};

export class TestExtension implements Closeable {
    private readonly awsMetadata: AwsMetadata;
    private readonly initializeParams: ExtendedInitializeParams;

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

    constructor(config: TestExtensionConfig = {}) {
        const id = config.id ?? v4();
        const rootDir = join(process.cwd(), 'node_modules', '.cache', 'e2e-tests', id);

        this.awsMetadata = {
            clientInfo: {
                extension: {
                    name: `Test ${ExtensionName}`,
                    version: '1.0.0-test',
                },
                clientId: id,
            },
            encryption: {
                key: randomBytes(32).toString('base64'),
                mode: 'JWT',
            },
        };
        this.initializeParams = {
            processId: process.pid,
            rootUri: null,
            capabilities: {},
            clientInfo: this.awsMetadata.clientInfo?.extension,
            workspaceFolders: [],
            initializationOptions: {
                aws: this.awsMetadata,
            },
            ...config.initializeParams,
        };

        this.serverConnection = new LspConnection(
            createConnection(new StreamMessageReader(this.readStream), new StreamMessageWriter(this.writeStream)),
            {
                onInitialize: (params) => {
                    const lsp = this.serverConnection.components;
                    LoggerFactory.reconfigure('warn');

                    const dataStoreFactory = new MultiDataStoreFactoryProvider(rootDir);
                    this.core = new CfnInfraCore(lsp, params, {
                        dataStoreFactory,
                    });

                    const schemaStore = new SchemaStore(dataStoreFactory);
                    const schemaRetriever = new SchemaRetriever(
                        schemaStore,
                        (_region) => {
                            return Promise.resolve(schemaFileType(Object.values(Schemas)));
                        },
                        () => Promise.resolve(getTestPrivateSchemas()),
                        () => {
                            return Promise.resolve(samFileType(Object.values(SamSchemaFiles)));
                        },
                    );

                    const ffFile = join(__dirname, '..', '..', 'assets', 'featureFlag', 'alpha.json');
                    this.external = new CfnExternal(lsp, this.core, {
                        schemaStore,
                        schemaRetriever,
                        cfnLintService: createMockCfnLintService(),
                        featureFlags: new FeatureFlagProvider((_env) => {
                            return Promise.resolve(JSON.parse(readFileSync(ffFile, 'utf8')));
                        }, ffFile),
                    });

                    this.providers = new CfnLspProviders(this.core, this.external, {
                        relationshipSchemaService: new RelationshipSchemaService(
                            join(__dirname, '..', '..', 'assets', 'relationship_schemas.json'),
                        ),
                    });
                    this.server = new CfnServer(lsp, this.core, this.external, this.providers);
                    return LspCapabilities;
                },
                onInitialized: (params) => this.server.initialized(params),
                onShutdown: () => this.server.close(),
                onExit: () => this.server.close(),
            },
        );

        // Handle workspace/configuration requests from the server
        this.clientConnection.onRequest('workspace/configuration', () => {
            return config.workspaceConfig ?? [{}];
        });

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

            await WaitFor.waitFor(() => {
                const store = this.external.schemaStore;
                const pbSchemas = store?.publicSchemas?.get(DefaultSettings.profile.region);
                const samSchemas = store?.samSchemas?.get(SamStoreKey);

                if (pbSchemas === undefined || samSchemas === undefined) {
                    throw new Error('Schemas not loaded yet');
                }
            }, 5_000);

            await flushAllPromises();
            this.isReady = true;
        }
    }

    async reset() {
        await this.ready();
        (this.serverConnection.components.documents.documents as any)._syncedDocuments.clear();

        this.core.settingsManager.reset();
        this.core.syntaxTreeManager.deleteAllTrees();
        this.core.documentManager.clear();
        this.core.awsCredentials.handleIamCredentialsDelete();
        this.core.usageTracker.clear();
        this.core.validationManager.clear();
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

    async openDocument(params: DidOpenTextDocumentParams) {
        await this.notify(DidOpenTextDocumentNotification.method, params);
    }

    async changeDocument(params: DidChangeTextDocumentParams) {
        await this.notify(DidChangeTextDocumentNotification.method, params);
    }

    // Helper to apply text edits manually for testing
    static applyEdit(
        content: string,
        range: { start: { line: number; character: number }; end: { line: number; character: number } },
        text: string,
    ): string {
        const lines = content.split('\n');
        const startLine = lines[range.start.line];
        const endLine = lines[range.end.line];

        if (range.start.line === range.end.line) {
            // Single line edit
            const before = startLine.slice(0, Math.max(0, range.start.character));
            const after = endLine.slice(Math.max(0, range.end.character));
            lines[range.start.line] = before + text + after;
        } else {
            // Multi-line edit
            const before = startLine.slice(0, Math.max(0, range.start.character));
            const after = endLine.slice(Math.max(0, range.end.character));
            const newText = before + text + after;
            lines.splice(range.start.line, range.end.line - range.start.line + 1, newText);
        }

        return lines.join('\n');
    }

    async closeDocument(params: DidCloseTextDocumentParams) {
        await this.notify(DidCloseTextDocumentNotification.method, params);
    }

    async saveDocument(params: DidSaveTextDocumentParams) {
        await this.notify(DidSaveTextDocumentNotification.method, params);
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

    codeLens(params: CodeLensParams) {
        return this.send(CodeLensRequest.method, params);
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

    deleteIamCredentials() {
        return this.notify(IamCredentialsDeleteNotification.method, undefined);
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
}
