import { ServerRequestHandler } from 'vscode-languageserver';
import {
    Connection,
    NotificationHandler,
    RequestHandler,
    CompletionItem,
    Hover,
    Definition,
    SignatureHelp,
    DocumentSymbol,
    DocumentSymbolParams,
    SymbolInformation,
    WorkspaceSymbolParams,
    ReferenceParams,
    Location,
    RenameParams,
    WorkspaceEdit,
    ExecuteCommandParams,
    CodeActionParams,
    CodeAction,
    Command,
    CodeLens,
    CodeLensParams,
} from 'vscode-languageserver/node';
import {
    CompletionList,
    CompletionParams,
    DefinitionLink,
    DefinitionParams,
    DidChangeConfigurationParams,
    HoverParams,
    InlineCompletionList,
    InlineCompletionParams,
    SignatureHelpParams,
    InlineCompletionRequest,
    InlineCompletionItem,
} from 'vscode-languageserver-protocol';

export class LspHandlers {
    constructor(private readonly connection: Connection) {}

    onCompletion(
        handler: ServerRequestHandler<
            CompletionParams,
            CompletionItem[] | CompletionList | undefined | null,
            CompletionItem[],
            void
        >,
    ) {
        this.connection.onCompletion(handler);
    }

    onCompletionResolve(handler: RequestHandler<CompletionItem, CompletionItem, void>) {
        this.connection.onCompletionResolve(handler);
    }

    onHover(handler: ServerRequestHandler<HoverParams, Hover | undefined | null, never, void>) {
        this.connection.onHover(handler);
    }

    onDefinition(
        handler: ServerRequestHandler<
            DefinitionParams,
            Definition | DefinitionLink[] | undefined | null,
            Location[] | DefinitionLink[],
            void
        >,
    ) {
        this.connection.onDefinition(handler);
    }

    onSignatureHelp(handler: ServerRequestHandler<SignatureHelpParams, SignatureHelp | undefined | null, never, void>) {
        this.connection.onSignatureHelp(handler);
    }

    onDocumentSymbol(
        handler: ServerRequestHandler<
            DocumentSymbolParams,
            DocumentSymbol[] | null | undefined,
            DocumentSymbol[],
            void
        >,
    ) {
        this.connection.onDocumentSymbol(handler);
    }

    onWorkspaceSymbol(
        handler: ServerRequestHandler<
            WorkspaceSymbolParams,
            SymbolInformation[] | null | undefined,
            SymbolInformation[],
            void
        >,
    ) {
        this.connection.onWorkspaceSymbol(handler);
    }

    onReferences(handler: ServerRequestHandler<ReferenceParams, Location[] | null | undefined, Location[], void>) {
        this.connection.onReferences(handler);
    }

    onRenameRequest(handler: ServerRequestHandler<RenameParams, WorkspaceEdit | null | undefined, never, void>) {
        this.connection.onRenameRequest(handler);
    }

    onExecuteCommand(handler: ServerRequestHandler<ExecuteCommandParams, unknown, never, void>) {
        this.connection.onExecuteCommand(handler);
    }

    onCodeAction(
        handler: ServerRequestHandler<
            CodeActionParams,
            (Command | CodeAction)[] | undefined | null,
            (Command | CodeAction)[],
            void
        >,
    ) {
        this.connection.onCodeAction(handler);
    }

    onInlineCompletion(
        handler: RequestHandler<
            InlineCompletionParams,
            InlineCompletionList | InlineCompletionItem[] | null | undefined,
            void
        >,
    ) {
        this.connection.onRequest(InlineCompletionRequest.type, handler);
    }

    onDidChangeConfiguration(handler: NotificationHandler<DidChangeConfigurationParams>) {
        this.connection.onDidChangeConfiguration(handler);
    }

    onCodeLens(handler: ServerRequestHandler<CodeLensParams, CodeLens[] | undefined | null, CodeLens[], void>) {
        this.connection.onCodeLens(handler);
    }
}
