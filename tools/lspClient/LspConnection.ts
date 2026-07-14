import { AwsMetadata } from '../../src/server/InitParams';
import { _InitializeParams } from 'vscode-languageserver-protocol/lib/common/protocol';
import { Logger } from 'pino';
import { DocumentMetadata } from '../../src/document/DocumentProtocol';
import { Diagnostic } from 'vscode-languageserver';

export interface LspConnection {
    initialize(): Promise<void>;

    sendRequest(method: string, params: unknown): Promise<any>;
    sendNotification(method: string, params: unknown): Promise<any>;
    onNotification(method: string, handler: (params: unknown) => void): void;
    onRequest(method: string, handler: (params: unknown) => unknown): void;
    shutdown(): Promise<void>;

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
    env?: NodeJS.ProcessEnv;
    workspaceConfig?: Record<string, unknown>[];
    clientLogger?: Logger;
    serverLogger?: Logger;
};
