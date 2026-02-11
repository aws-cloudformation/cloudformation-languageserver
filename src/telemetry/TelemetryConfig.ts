import { isAlpha, isTest } from '../utils/Environment';

export const TelemetrySettings = Object.freeze({
    isEnabled: isAlpha,
    logLevel: isTest ? 'silent' : 'info',
});
