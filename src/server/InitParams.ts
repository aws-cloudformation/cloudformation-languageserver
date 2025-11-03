import { LevelWithSilent } from 'pino';
import { InitializeParams } from 'vscode-languageserver/node';
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
    cloudformation?: {
        endpoint?: string;
    };
};

export interface ExtendedInitializeParams extends InitializeParams {
    initializationOptions?: {
        aws?: AwsMetadata;
        encryption?: {
            key: string;
            mode: string;
        };
        [key: string]: unknown;
    };
}
