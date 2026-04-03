import { Connection, RequestHandler, RequestType } from 'vscode-languageserver';
import { Settings } from '../settings/Settings';
import { ReadinessStatus } from '../utils/ReadinessContributor';

export type GetSystemStatusResponse = {
    settingsReady: ReadinessStatus;
    schemasReady: ReadinessStatus;
    cfnLintReady: ReadinessStatus;
    cfnGuardReady: ReadinessStatus;
    currentSettings: Settings;
};

export const GetSystemStatusRequestType = new RequestType<void, GetSystemStatusResponse, void>('aws/system/status');

export class LspSystemHandlers {
    constructor(private readonly connection: Connection) {}

    onGetSystemStatus(handler: RequestHandler<void, GetSystemStatusResponse, void>) {
        this.connection.onRequest(GetSystemStatusRequestType.method, handler);
    }
}
