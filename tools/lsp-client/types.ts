import { InitializeParams } from 'vscode-languageserver-protocol';

export interface LspClientConfig {
    serverPath: string;
    mode: 'stdio' | 'ipc';
    clientId?: string;
    storageDir?: string;
    env?: NodeJS.ProcessEnv;
    initTimeout?: number;
    telemetryEnabled?: boolean;
    featureFlags?: FeatureFlagType;
    suppressLogLevels?: string[];
}

export interface ReadinessFlags {
    cfnLint: boolean;
    cfnGuard: boolean;
}

export type ClientInfo = {
    name: string;
    version: string;
};

export type AwsMetadata = {
    clientInfo?: {
        extension: ClientInfo;
        clientId: string;
    };
    telemetryEnabled?: boolean;
    storageDir?: string;
    encryption?: {
        key: string;
        mode: string;
    };
    featureFlags?: FeatureFlagType;
};

export type FeatureFlagType = {
    refreshIntervalMs?: number;
    dynamicRefreshIntervalMs?: number;
};

export interface ExtendedInitializeParams extends InitializeParams {
    initializationOptions?: {
        aws?: AwsMetadata;
        [key: string]: unknown;
    };
}
