import { AwsMetadata } from '../../src/server/InitParams';
import { _InitializeParams } from 'vscode-languageserver-protocol/lib/common/protocol';

export interface LspConnection {
    initialize(): Promise<void>;
    sendRequest(method: string, params: any): Promise<any>;
    sendNotification(method: string, params: any): Promise<void>;
    onNotification(method: string, handler: (params: any) => void): void;
    onRequest(method: string, handler: (params: any) => any): void;
    shutdown(): Promise<void>;
}

export type LspClientConfig = {
    serverPath: string;
    mode: 'stdio' | 'ipc';
    clientConfig: _InitializeParams['clientInfo'];
    awsConfig: AwsMetadata;
    env?: NodeJS.ProcessEnv;
    suppressLogLevels?: string[];
    workspaceConfig?: Record<string, unknown>[];
};
