import { isAlpha, IsAppEnvironment } from '../utils/Environment';

export const TelemetrySettings = Object.freeze({
    isEnabled: isAlpha,
    logLevel: IsAppEnvironment ? 'info' : 'silent',
});
