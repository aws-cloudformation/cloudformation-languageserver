import { LevelWithSilent } from 'pino';
import { MessageType, ShowMessageRequestParams } from 'vscode-languageserver';
import { LspCommunication } from '../protocol/LspCommunication';
import { Configurable, Closeable } from '../server/ServerComponents';
import { DefaultSettings, SettingsSubscription, TelemetrySettings, ISettingsSubscriber } from '../settings/Settings';
import { isDev } from '../utils/Environment';
import { LoggerFactory, LogLevel } from './LoggerFactory';

export class ClientMessage implements Configurable, Closeable {
    private readonly logger = LoggerFactory.getLogger(ClientMessage);
    private logLevel: LevelWithSilent = DefaultSettings.telemetry.logLevel;
    private settingsSubscription?: SettingsSubscription;

    constructor(private readonly client: LspCommunication) {}

    configure(settingsManager: ISettingsSubscriber): void {
        // Clean up existing subscription if present
        if (this.settingsSubscription) {
            this.settingsSubscription.unsubscribe();
        }

        // Get initial settings
        this.logLevel = settingsManager.getCurrentSettings().telemetry.logLevel;

        // Subscribe to telemetry settings changes
        this.settingsSubscription = settingsManager.subscribe('telemetry', (newTelemetrySettings) => {
            this.onSettingsChanged(newTelemetrySettings);
        });
    }

    close(): void {
        if (this.settingsSubscription) {
            this.settingsSubscription.unsubscribe();
            this.settingsSubscription = undefined;
        }
    }

    private onSettingsChanged(settings: TelemetrySettings): void {
        this.logLevel = settings.logLevel;
    }

    private shouldLog(level: LevelWithSilent): boolean {
        const currentLogLevel = LogLevel[this.logLevel];
        const messageLogLevel = LogLevel[level];

        return messageLogLevel <= currentLogLevel;
    }

    private logMessage(level: LevelWithSilent, message: string, clientMethod: (msg: string) => void): void {
        if (this.shouldLog(level)) {
            if (isDev) {
                clientMethod(message);
            } else {
                this.logger[level](message);
                clientMethod(message);
            }
        }
    }

    error(message: string): void {
        this.logMessage('error', message, (msg) => this.client.console.error(msg));
    }

    warn(message: string): void {
        this.logMessage('warn', message, (msg) => this.client.console.warn(msg));
    }

    info(message: string): void {
        this.logMessage('info', message, (msg) => this.client.console.info(msg));
    }

    debug(message: string): void {
        this.logMessage('debug', message, (msg) => this.client.console.debug(msg));
    }

    log(message: string): void {
        this.logMessage('info', message, (msg) => this.client.console.log(msg));
    }

    showMessageNotification(type: MessageType, message: string) {
        return this.client.showMessage({
            type,
            message,
        });
    }

    showMessageRequest(params: ShowMessageRequestParams) {
        return this.client.showMessageRequest(params);
    }

    logMessageNotification(type: MessageType, message: string) {
        return this.client.logMessage({
            type,
            message,
        });
    }
}
