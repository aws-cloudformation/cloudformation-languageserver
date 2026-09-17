import { InitializeResult, TextDocumentSyncKind, CodeActionKind } from 'vscode-languageserver';
import { Commands } from '../handlers/ExecutionHandler';
import { ExtensionName, ExtensionVersion } from '../utils/ExtensionConfig';

export function buildCapabilities(commands: Commands): InitializeResult {
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
                commands: [commands.clearDiagnostic, commands.trackCodeAction, commands.updateRegion],
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
