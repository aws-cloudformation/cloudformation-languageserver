import { InitializeResult, TextDocumentSyncKind, CodeActionKind } from 'vscode-languageserver';
import {
    ANALYZE_DIAGNOSTIC,
    CLEAR_DIAGNOSTIC,
    DESCRIBE_TEMPLATE,
    GENERATE_TEMPLATE,
    OPTIMIZE_TEMPLATE,
} from '../handlers/ExecutionHandler';
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
        inlineCompletionProvider: true,
        definitionProvider: true,
        documentSymbolProvider: true,
        executeCommandProvider: {
            commands: [CLEAR_DIAGNOSTIC, OPTIMIZE_TEMPLATE, DESCRIBE_TEMPLATE, GENERATE_TEMPLATE, ANALYZE_DIAGNOSTIC],
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
