import { lookup } from 'node:dns/promises';
import { MessageType } from 'vscode-languageserver-protocol';
import { ClientMessage } from '../telemetry/ClientMessage';
import { Closeable } from '../utils/Closeable';

export class OnlineStatus implements Closeable {
    private _isOnline: boolean = false;
    private notifiedOnce: boolean = false;
    private readonly timeout: NodeJS.Timeout;

    constructor(private readonly clientMessage: ClientMessage) {
        void this.hasInternet();

        this.timeout = setInterval(
            () => {
                void this.hasInternet();
            },
            2 * 60 * 1000,
        );
    }

    public async checkNow(): Promise<boolean> {
        try {
            await lookup('google.com');
            return true;
        } catch {
            return false;
        }
    }

    private async hasInternet() {
        try {
            await lookup('google.com');
            this._isOnline = true;
        } catch {
            this._isOnline = false;
        } finally {
            await this.notify();
        }
    }

    private async notify() {
        if (!this.notifiedOnce && !this._isOnline) {
            try {
                await this.clientMessage.showMessageNotification(
                    MessageType.Warning,
                    'Internet connection lost. Some AWS CloudFormation features may not work properly.',
                );
                this.notifiedOnce = true;
            } catch {
                // Nothing to do here
            }
        }
    }

    close() {
        clearInterval(this.timeout);
    }
}
