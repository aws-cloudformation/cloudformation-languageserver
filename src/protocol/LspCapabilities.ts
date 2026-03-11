import { InitializeResult, TextDocumentSyncKind, CodeActionKind } from 'vscode-languageserver';
import { CLEAR_DIAGNOSTIC, TRACK_CODE_ACTION_ACCEPTED, UPDATE_REGION } from '../handlers/ExecutionHandler';
import { ExtensionName, ExtensionVersion } from '../utils/ExtensionConfig';

export const LspCapabilities: InitializeResult = {
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
            commands: [CLEAR_DIAGNOSTIC, TRACK_CODE_ACTION_ACCEPTED, UPDATE_REGION],
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
