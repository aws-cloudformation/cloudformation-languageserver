import { RequestType } from 'vscode-languageserver-protocol';
import { Settings } from '../settings/Settings';

export type ReadinessStatus = {
    ready: boolean;
    reason?: string;
};

export type GetSystemStatusResponse = {
    settingsReady: ReadinessStatus;
    schemasReady: ReadinessStatus & {
        availableRegions: string[];
    };
    cfnLintReady: ReadinessStatus;
    cfnGuardReady: ReadinessStatus;
    currentSettings: Settings;
};

export const GetSystemStatusRequestType = new RequestType<void, GetSystemStatusResponse, void>('aws/system/status');
