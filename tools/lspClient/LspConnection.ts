import { AwsMetadata } from '../../src/server/InitParams';
import {
    _InitializeParams,
    DidChangeConfigurationParams,
    TextDocumentContentChangeEvent,
} from 'vscode-languageserver-protocol';
import { Logger } from 'pino';
import { DocumentMetadata } from '../../src/document/DocumentProtocol';
import { CompletionItem, CompletionList, Diagnostic, Hover } from 'vscode-languageserver-types';
import { IamCredentials } from '../../src/auth/AwsLspAuthTypes';
import { GetSystemStatusResponse } from '../../src/protocol/LspSystemHandlers';

export interface LspConnection {
    initialize(): Promise<void>;

    sendRequest(method: string, params: unknown): Promise<any>;
    sendNotification(method: string, params: unknown): Promise<void>;
    onNotification(method: string, handler: (params: unknown) => void): void;
    onRequest(method: string, handler: (params: unknown) => unknown): void;
    shutdown(): Promise<void>;

    openDocument(uri: string, content: string): Promise<void>;
    updateDocument(uri: string, version: number, changes: string | TextDocumentContentChangeEvent[]): Promise<void>;
    closeDocument(uri: string): Promise<void>;

    hover(uri: string, line: number, character: number): Promise<Hover | null>;
    completion(uri: string, line: number, character: number): Promise<CompletionList | CompletionItem[] | null>;

    changeConfiguration(params: DidChangeConfigurationParams): Promise<void>;
    updateCredentials(credentials: IamCredentials): Promise<void>;
    getSystemStatus(): Promise<GetSystemStatusResponse>;
    waitForSystemReady(timeoutMs?: number, pollMs?: number): Promise<void>;

    getDocumentMetadata(): ReadonlyArray<DocumentMetadata>;
    getDiagnostics(uri: string): ReadonlyArray<Diagnostic>;
    getDiagnosticsBySource(uri: string, source: string): ReadonlyArray<Diagnostic>;
    resetDiagnostics(uri: string): void;
}

export type LspClientConfig = {
    serverPath: string;
    mode: 'stdio' | 'ipc';
    clientConfig: _InitializeParams['clientInfo'];
    awsConfig: AwsMetadata;
    cwd?: string;
    env?: NodeJS.ProcessEnv;
    workspaceConfig?: Record<string, unknown>[];
    clientLogger?: Logger;
    serverLogger?: Logger;
};
