import { lookup } from 'node:dns/promises';
import { LoggerFactory } from '../telemetry/LoggerFactory';
import { Closeable } from '../utils/Closeable';

const logger = LoggerFactory.getLogger('OnlineStatus');

export class OnlineStatus implements Closeable {
    private _isOnline: boolean = false;
    private notifiedOnce: boolean = false;
    private readonly timeout: NodeJS.Timeout;

    constructor() {
        void this.hasInternet();

        this.timeout = setInterval(
            () => {
                void this.hasInternet();
            },
            2 * 60 * 1000,
        );
    }

    private async hasInternet() {
        try {
            await lookup('google.com');
            this._isOnline = true;
        } catch {
            this._isOnline = false;
        } finally {
            this.notify();
        }
    }

    private notify() {
        if (!this.notifiedOnce && !this._isOnline) {
            logger.warn('Internet connection lost. Some AWS CloudFormation features may not work properly.');
            this.notifiedOnce = true;
        }
    }

    close() {
        clearInterval(this.timeout);
    }
}
