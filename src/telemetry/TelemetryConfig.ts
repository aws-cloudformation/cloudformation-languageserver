import { LevelWithSilent } from 'pino';
import { _InitializeParams } from 'vscode-languageserver-protocol';
import { isAlpha, IsAppEnvironment } from '../utils/Environment';

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
};

export const TelemetrySettings = Object.freeze({
    isEnabled: isAlpha,
    logLevel: IsAppEnvironment ? 'info' : 'silent',
});
