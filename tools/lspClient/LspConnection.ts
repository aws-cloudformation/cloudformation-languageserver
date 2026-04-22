import { ClientInfo, AwsMetadata } from '../../src/server/InitParams';

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
    clientId: string;
    clientInfo: ClientInfo;
    extensionInfo: ClientInfo;
    telemetryEnabled: boolean;
    featureFlags: NonNullable<AwsMetadata['featureFlags']>;
    storageDir?: string;
    env?: NodeJS.ProcessEnv;
    suppressLogLevels?: string[];
};
