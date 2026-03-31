import { RequestType } from 'vscode-languageserver-protocol';
import { Settings } from '../settings/Settings';

export interface ReadinessStatus {
    ready: boolean;
    reason?: string;
}

export interface GetSystemStatusResponse {
    schemasReady: ReadinessStatus & {
        availableRegions: string[];
        totalRegions: number;
    };
    cfnLintReady: ReadinessStatus;
    cfnGuardReady: ReadinessStatus;
    currentSettings: Settings;
}

export const GetSystemStatusRequestType = new RequestType<void, GetSystemStatusResponse, void>('aws/cfn/systemStatus');
