import { ClientInfo, AwsMetadata } from '../../src/server/InitParams';

export interface LspClientConfig {
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
}

export interface InitializationFlags {
    cfnLint: boolean;
    cfnGuard: boolean;
}
