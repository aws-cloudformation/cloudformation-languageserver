/* eslint-disable @typescript-eslint/no-unsafe-function-type */
import pino, { LevelWithSilent, Logger } from 'pino';
import { SettingsConfigurable, ISettingsSubscriber, SettingsSubscription } from '../settings/ISettingsSubscriber';
import { DefaultSettings, TelemetrySettings } from '../settings/Settings';
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

export class LoggerFactory implements SettingsConfigurable {
    private static _instance: LoggerFactory | undefined = undefined;

    private readonly baseLogger: Logger;
    private readonly loggers = new Map<string, Logger>();
    private settingsSubscription?: SettingsSubscription;

    private constructor(level?: LevelWithSilent) {
        this.baseLogger = pino({
            name: ExtensionName,
            level: level ?? DefaultSettings.telemetry.logLevel,
            transport: {
                target: 'pino-pretty',
                options: {
                    colorize: false,
                    translateTime: 'SYS:hh:MM:ss TT',
                    ignore: 'pid,hostname,name',
                },
            },
        });
    }

    configure(settingsManager: ISettingsSubscriber): void {
        // Subscribe to telemetry settings changes
        this.settingsSubscription = settingsManager.subscribe(
            'telemetry',
            (newTelemetrySettings: TelemetrySettings) => {
                this.onSettingsChanged(newTelemetrySettings);
            },
        );
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
        let logger: Logger | undefined = this.loggers.get(name);
        if (!logger) {
            logger = this.baseLogger.child({ clazz: name });
            this.loggers.set(name, logger);
        }

        return logger;
    }

    static create(level?: LevelWithSilent) {
        if (LoggerFactory._instance === undefined) {
            LoggerFactory._instance = new LoggerFactory(level);
            return LoggerFactory._instance;
        }

        throw new Error('LoggerFactory has already been created');
    }

    static getLogger(clazz: string | Function): Logger {
        return LoggerFactory.instance.getLogger(clazz);
    }

    static get instance(): LoggerFactory {
        return LoggerFactory._instance ?? LoggerFactory.create();
    }
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
