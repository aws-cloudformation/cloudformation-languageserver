/* eslint-disable @typescript-eslint/no-unsafe-function-type */
import pino, { LevelWithSilent, Logger } from 'pino';
import { ExtensionName } from '../utils/ExtensionConfig';
import { AwsMetadata, TelemetrySettings } from './TelemetryConfig';

export const LogLevel: Record<LevelWithSilent, number> = {
    silent: 0,
    fatal: 1,
    error: 2,
    warn: 3,
    info: 4,
    debug: 5,
    trace: 6,
} as const;

export class LoggerFactory {
    private static readonly _instance: LoggerFactory = new LoggerFactory();

    private readonly baseLogger: Logger;
    private readonly logLevel: LevelWithSilent;
    private readonly loggers = new Map<string, Logger>();

    private constructor(level?: LevelWithSilent) {
        this.logLevel = level ?? TelemetrySettings.logLevel;

        this.baseLogger = pino({
            name: ExtensionName,
            level: this.logLevel,
            transport: {
                target: 'pino-pretty',
                options: {
                    colorize: false,
                    translateTime: 'SYS:hh:MM:ss TT',
                    ignore: 'pid,hostname,name,clazz',
                    messageFormat: '[{clazz}] {msg}',
                },
            },
        });
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

    static getLogger(clazz: string | Function): Logger {
        return LoggerFactory._instance.getLogger(clazz);
    }

    static initialize(metadata?: AwsMetadata) {
        const newLevel = metadata?.logLevel ?? TelemetrySettings.logLevel;
        if (Object.keys(LogLevel).includes(newLevel) && LoggerFactory._instance.logLevel !== newLevel) {
            LoggerFactory._instance.reconfigure(newLevel);
        }
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
