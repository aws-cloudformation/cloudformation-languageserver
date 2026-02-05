import { LevelWithSilent } from 'pino';
import { DeepReadonly } from 'ts-essentials';
import { InitializeParams } from 'vscode-languageserver';
import { _InitializeParams } from 'vscode-languageserver-protocol';

export type ClientInfo = DeepReadonly<_InitializeParams['clientInfo']>;

type _AwsMetadata = {
    clientInfo?: {
        extension: {
            name: string;
            version: string;
        };
        clientId: string;
    };
    telemetryEnabled?: boolean;
    logLevel?: LevelWithSilent;
    storageDir?: string;
    cloudformation?: {
        endpoint?: string;
    };
    encryption?: {
        key: string;
        mode: string;
    };
    featureFlags?: {
        refreshIntervalMs?: number;
        dynamicRefreshIntervalMs?: number;
    };
    schema?: {
        staleDaysThreshold?: number;
    };
};
export type AwsMetadata = DeepReadonly<_AwsMetadata>;

interface _ExtendedInitializeParams extends InitializeParams {
    initializationOptions?: {
        aws?: AwsMetadata;
        [key: string]: unknown;
    };
}
export type ExtendedInitializeParams = DeepReadonly<_ExtendedInitializeParams>;
