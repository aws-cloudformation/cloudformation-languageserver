import { LevelWithSilent } from 'pino';
import { DeepReadonly } from 'ts-essentials';
import { InitializeParams } from 'vscode-languageserver';
import { _InitializeParams } from 'vscode-languageserver-protocol';
import { Settings } from '../settings/Settings';

export type ClientInfo = DeepReadonly<_InitializeParams['clientInfo']>;

type _AwsMetadata = {
    clientInfo?: {
        extension: ClientInfo;
        clientId: string;
    };
    encryption?: {
        key: string;
        mode: string;
    };

    telemetryEnabled?: boolean;
    logLevel?: LevelWithSilent;
    storageDir?: string;

    // Overrides for all LSP settings
    settings?: Partial<Settings>;

    // Custom settings for debugging
    cloudformation?: {
        endpoint?: string;
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
