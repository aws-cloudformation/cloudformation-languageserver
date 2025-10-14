import { LevelWithSilent } from 'pino';
import { isAlpha, IsAppEnvironment, isBeta } from '../utils/Environment';

export type ClientInfo = {
    name: string;
    version?: string;
};

export type ExtendedClientMetadata = {
    clientId?: string;
    telemetryEnabled?: boolean;
    logLevel?: LevelWithSilent;
};

export const TelemetrySettings = Object.freeze({
    isEnabled: isAlpha || isBeta,
    logLevel: IsAppEnvironment ? 'info' : 'silent',
});
