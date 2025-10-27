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
import { LspComponents } from './LspComponents';
import { LspDiagnostics } from './LspDiagnostics';
import { LspDocuments } from './LspDocuments';
import { LspHandlers } from './LspHandlers';
import { LspRelatedResourcesHandlers } from './LspRelatedResourcesHandlers';
import { LspResourceHandlers } from './LspResourceHandlers';
import { LspStackHandlers } from './LspStackHandlers';
import { LspWorkspace } from './LspWorkspace';

type LspConnectionHandlers = {
    onInitialize?: (params: InitializeParams) => Promise<InitializeResult> | InitializeResult;
    onInitialized?: (params: InitializedParams) => unknown;
    onShutdown?: () => unknown;
    onExit?: () => unknown;
};

export class LspConnection {
    private readonly diagnostics: LspDiagnostics;
    private readonly workspace: LspWorkspace;
    private readonly documents: LspDocuments;
    private readonly communication: LspCommunication;
    private readonly handlers: LspHandlers;
    private readonly authHandlers: LspAuthHandlers;
    private readonly stackHandlers: LspStackHandlers;
    private readonly resourceHandlers: LspResourceHandlers;
    private readonly relatedResourcesHandlers: LspRelatedResourcesHandlers;

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
        this.stackHandlers = new LspStackHandlers(this.connection);
        this.resourceHandlers = new LspResourceHandlers(this.connection);
        this.relatedResourcesHandlers = new LspRelatedResourcesHandlers(this.connection);

        this.communication.console.info(`${ExtensionName} launched from ${__dirname}`);

        this.connection.onInitialize((params: InitializeParams): InitializeResult | Promise<InitializeResult> => {
            this.initializeParams = params;
            return onInitialize(params);
        });

        this.connection.onInitialized((params: InitializedParams) => {
            this.workspace.initialize(this.initializeParams?.capabilities, this.initializeParams?.workspaceFolders);
            onInitialized(params);
        });

        this.connection.onShutdown(() => {
            onShutdown();
        });

        this.connection.onExit(() => {
            onExit();
        });
    }

    get components(): LspComponents {
        return new LspComponents(
            this.diagnostics,
            this.workspace,
            this.documents,
            this.communication,
            this.handlers,
            this.authHandlers,
            this.stackHandlers,
            this.resourceHandlers,
            this.relatedResourcesHandlers,
        );
    }

    public listen() {
        this.documents.listen();
        this.connection.listen();
        this.communication.console.info(`${ExtensionName} is now listening...`);
    }
}
