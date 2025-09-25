/* eslint-disable @typescript-eslint/no-unsafe-function-type */
import pino, { LevelWithSilent, Logger } from 'pino';
import { Configurable, Closeable } from '../server/ServerComponents';
import { DefaultSettings, SettingsSubscription, TelemetrySettings, ISettingsSubscriber } from '../settings/Settings';
import { isDev } from '../utils/Environment';
import { ExtensionName } from '../utils/ExtensionConfig';

export const LogLevel: Record<LevelWithSilent, number> = {
    silent: 0,
    fatal: 1,
    error: 2,
    warn: 3,
    info: 4,
    debug: 5,
    trace: 6,
} as const;

export const StdOutLogger = pino({
    name: ExtensionName,
    level: DefaultSettings.telemetry.logLevel,
});

export class LoggerFactory implements Configurable, Closeable {
    static readonly instance = new LoggerFactory();

    private readonly loggers = new Map<string, Logger>();
    private settingsSubscription?: SettingsSubscription;

    private readonly baseLogger = pino({
        name: ExtensionName,
        level: DefaultSettings.telemetry.logLevel,
        transport: isDev ? devTransport() : betaOrProdTransport(),
    });

    private constructor() {
        // Private constructor for singleton
    }

    configure(settingsManager: ISettingsSubscriber): void {
        // Clean up existing subscription if present
        if (this.settingsSubscription) {
            this.settingsSubscription.unsubscribe();
        }

        // Get initial settings
        const currentSettings = settingsManager.getCurrentSettings().telemetry;
        this.onSettingsChanged(currentSettings);

        // Subscribe to telemetry settings changes
        this.settingsSubscription = settingsManager.subscribe(
            'telemetry',
            (newTelemetrySettings: TelemetrySettings) => {
                this.onSettingsChanged(newTelemetrySettings);
            },
        );
    }

    close(): void {
        if (this.settingsSubscription) {
            this.settingsSubscription.unsubscribe();
            this.settingsSubscription = undefined;
        }
    }

    private onSettingsChanged(settings: TelemetrySettings): void {
        if (isDev && this.baseLogger.level !== settings.logLevel) {
            this.reconfigure(settings.logLevel);
        }
    }

    private reconfigure(newLevel: LevelWithSilent) {
        this.baseLogger.level = newLevel;
        for (const logger of this.loggers.values()) {
            logger.level = newLevel;
        }
    }

    private getLogger(clazz: string | Function): Logger {
        const name = getLoggerName(clazz);
        let logger = this.loggers.get(name);
        if (!logger) {
            logger = this.baseLogger.child({ clazz: name });
            this.loggers.set(name, logger);
        }

        return logger;
    }

    static getLogger(clazz: string | Function): Logger {
        return LoggerFactory.instance.getLogger(clazz);
    }
}

function devTransport() {
    return {
        target: 'pino-pretty',
        options: {
            colorize: false,
            translateTime: 'SYS:hh:MM:ss TT',
            ignore: 'pid,hostname,name',
        },
    };
}

function betaOrProdTransport() {
    return {
        target: 'pino-opentelemetry-transport',
        options: {
            messageKey: 'msg',
        },
    };
}

function getLoggerName(clazz: string | Function): string {
    if (typeof clazz === 'string') {
        return clazz;
    }

    if (typeof clazz === 'function') {
        return clazz.name || 'Anonymous';
    }

    return 'Unknown';
}
