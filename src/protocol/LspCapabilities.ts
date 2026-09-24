import { InitializeResult, TextDocumentSyncKind, CodeActionKind } from 'vscode-languageserver';
import { ExtensionName, ExtensionVersion } from '../utils/ExtensionConfig';
import { LspCommands } from './LspCommands';

export function createLspCapabilities(commands: LspCommands): InitializeResult {
    return {
        capabilities: {
            textDocumentSync: {
                openClose: true,
                change: TextDocumentSyncKind.Incremental,
                willSave: false,
                willSaveWaitUntil: false,
                save: {
                    includeText: true,
                },
            },
            hoverProvider: true,
            codeActionProvider: {
                resolveProvider: false,
                codeActionKinds: [CodeActionKind.RefactorExtract],
            },
            completionProvider: {
                triggerCharacters: ['.', '!', ':', '\n', '\t', '"'],
                completionItem: {
                    labelDetailsSupport: true,
                },
            },
            definitionProvider: true,
            documentSymbolProvider: true,
            executeCommandProvider: {
                commands: [commands.clearDiagnostic, commands.trackCodeActionAccepted, commands.updateRegion],
            },
            workspace: {
                workspaceFolders: {
                    supported: true,
                    changeNotifications: true,
                },
            },
        },
        serverInfo: {
            name: ExtensionName,
            version: ExtensionVersion,
        },
    };
}
