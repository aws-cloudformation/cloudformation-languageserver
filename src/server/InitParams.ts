import { LevelWithSilent } from 'pino';
import { InitializeParams } from 'vscode-languageserver';
import { _InitializeParams } from 'vscode-languageserver-protocol';

export type ClientInfo = _InitializeParams['clientInfo'];

export type AwsMetadata = {
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
};

export interface ExtendedInitializeParams extends InitializeParams {
    initializationOptions?: {
        aws?: AwsMetadata;
        [key: string]: unknown;
    };
}
