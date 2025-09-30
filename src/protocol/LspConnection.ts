import {
    InitializeParams,
    InitializeResult,
    Connection,
    createConnection,
    ProposedFeatures,
} from 'vscode-languageserver/node';
import { InitializedParams } from 'vscode-languageserver-protocol';
import { ExtensionName } from '../utils/ExtensionConfig';
import { LspAuthHandlers } from './LspAuthHandlers';
import { LspCapabilities } from './LspCapabilities';
import { LspCommunication } from './LspCommunication';
import { LspDiagnostics } from './LspDiagnostics';
import { LspDocuments } from './LspDocuments';
import { LspHandlers } from './LspHandlers';
import { LspResourceHandlers } from './LspResourceHandlers';
import { LspStackActionHandlers } from './LspStackActionHandlers';
import { LspStackQueryHandlers } from './LspStackQueryHandlers';
import { LspWorkspace } from './LspWorkspace';

type LspConnectionHandlers = {
    onInitialize?: (params: InitializeParams) => InitializeResult;
    onInitialized?: (params: InitializedParams) => unknown;
    onShutdown?: () => unknown;
    onExit?: () => unknown;
};

export type LspFeatures = {
    diagnostics: LspDiagnostics;
    workspace: LspWorkspace;
    documents: LspDocuments;
    communication: LspCommunication;
    handlers: LspHandlers;
    authHandlers: LspAuthHandlers;
    stackActionHandlers: LspStackActionHandlers;
    stackQueryHandlers: LspStackQueryHandlers;
    resourceHandlers: LspResourceHandlers;
};

export class LspConnection {
    private readonly diagnostics: LspDiagnostics;
    private readonly workspace: LspWorkspace;
    private readonly documents: LspDocuments;
    private readonly communication: LspCommunication;
    private readonly handlers: LspHandlers;
    private readonly authHandlers: LspAuthHandlers;
    private readonly stackActionHandlers: LspStackActionHandlers;
    private readonly stackHandlers: LspStackQueryHandlers;
    private readonly resourceHandlers: LspResourceHandlers;

    private initializeParams?: InitializeParams;

    constructor(
        private readonly connection: Connection = createConnection(ProposedFeatures.all),
        handlers: LspConnectionHandlers = {},
    ) {
        const {
            onInitialize = () => LspCapabilities,
            onInitialized = () => {},
            onShutdown = () => {},
            onExit = () => {},
        } = handlers;

        this.diagnostics = new LspDiagnostics(this.connection);
        this.workspace = new LspWorkspace(this.connection);
        this.documents = new LspDocuments(this.connection);
        this.communication = new LspCommunication(this.connection);
        this.handlers = new LspHandlers(this.connection);
        this.authHandlers = new LspAuthHandlers(this.connection);
        this.stackActionHandlers = new LspStackActionHandlers(this.connection);
        this.stackHandlers = new LspStackQueryHandlers(this.connection);
        this.resourceHandlers = new LspResourceHandlers(this.connection);

        this.connection.onInitialize((params: InitializeParams): InitializeResult => {
            this.communication.console.info(`Initializing ${ExtensionName}...`);
            this.initializeParams = params;
            return onInitialize(params);
        });

        this.connection.onInitialized((params: InitializedParams) => {
            this.communication.console.info(`${ExtensionName} initialized`);
            this.workspace.initialize(this.initializeParams?.capabilities, this.initializeParams?.workspaceFolders);
            onInitialized(params);
        });

        this.connection.onShutdown(() => {
            this.communication.console.info(`${ExtensionName} shutting down...`);
            onShutdown();
        });

        this.connection.onExit(() => {
            this.communication.console.info(`${ExtensionName} exiting`);
            onExit();
        });
    }

    get features(): LspFeatures {
        return {
            diagnostics: this.diagnostics,
            workspace: this.workspace,
            documents: this.documents,
            communication: this.communication,
            handlers: this.handlers,
            authHandlers: this.authHandlers,
            stackActionHandlers: this.stackActionHandlers,
            stackQueryHandlers: this.stackHandlers,
            resourceHandlers: this.resourceHandlers,
        };
    }

    public listen() {
        this.documents.listen();
        this.connection.listen();
        this.communication.console.info(`${ExtensionName} is now listening...`);
    }
}
