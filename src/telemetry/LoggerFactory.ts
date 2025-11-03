/* eslint-disable @typescript-eslint/no-unsafe-function-type */
import { readdir, stat, unlink, readFile, writeFile } from 'fs/promises';
import { join } from 'path';
import { DateTime } from 'luxon';
import pino, { LevelWithSilent, Logger } from 'pino';
import { AwsMetadata } from '../server/InitParams';
import { pathToArtifact } from '../utils/ArtifactsDir';
import { Closeable } from '../utils/Closeable';
import { ExtensionId, ExtensionName } from '../utils/ExtensionConfig';
import { TelemetrySettings } from './TelemetryConfig';

export const LogLevel: Record<LevelWithSilent, number> = {
    silent: 0,
    fatal: 1,
    error: 2,
    warn: 3,
    info: 4,
    debug: 5,
    trace: 6,
} as const;

export class LoggerFactory implements Closeable {
    private static readonly LogsDirectory = pathToArtifact('logs');
    private static readonly MaxFileSize = 50 * 1024 * 1024; // 50MB

    private static readonly _instance: LoggerFactory = new LoggerFactory();

    private readonly baseLogger: Logger;
    private readonly logLevel: LevelWithSilent;
    private readonly loggers = new Map<string, Logger>();
    private readonly interval: NodeJS.Timeout;

    private constructor(level?: LevelWithSilent) {
        this.logLevel = level ?? TelemetrySettings.logLevel;

        this.baseLogger = pino({
            name: ExtensionName,
            level: this.logLevel,
            transport: {
                targets: [
                    {
                        target: 'pino-pretty',
                        options: {
                            colorize: false,
                            translateTime: 'SYS:hh:MM:ss TT',
                            ignore: 'pid,hostname,name,clazz',
                            messageFormat: '[{clazz}] {msg}',
                        },
                    },
                    {
                        target: 'pino/file',
                        options: {
                            destination: join(
                                LoggerFactory.LogsDirectory,
                                `${ExtensionId}-${DateTime.utc().toFormat('yyyy-MM-dd')}.log`,
                            ),
                            mkdir: true,
                        },
                    },
                ],
            },
        });

        void this.cleanOldLogs();
        this.interval = setInterval(
            () => {
                void this.trimLogs();
            },
            10 * 60 * 1000,
        );
    }

    private async cleanOldLogs() {
        try {
            const files = await readdir(LoggerFactory.LogsDirectory);
            const oneWeekAgo = DateTime.utc().minus({ weeks: 1 });

            for (const file of files) {
                if (!file.endsWith('.log')) continue;

                const filePath = join(LoggerFactory.LogsDirectory, file);
                const stats = await stat(filePath);

                if (DateTime.fromJSDate(stats.mtime) < oneWeekAgo) {
                    await unlink(filePath);
                }
            }

            await this.trimLogs();
        } catch (err) {
            this.baseLogger.error(err, 'Error cleaning up old logs');
        }
    }

    private async trimLogs() {
        try {
            const files = await readdir(LoggerFactory.LogsDirectory);

            for (const file of files) {
                if (!file.endsWith('.log')) continue;

                const filePath = join(LoggerFactory.LogsDirectory, file);
                const stats = await stat(filePath);

                if (stats.size > LoggerFactory.MaxFileSize) {
                    const content = await readFile(filePath, 'utf8');
                    const lines = content.split('\n');
                    const trimmed = lines.slice(-Math.floor(lines.length / 2)).join('\n');
                    await writeFile(filePath, trimmed);
                }
            }
        } catch (err) {
            this.baseLogger.error(err, 'Error trimming old logs');
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

    close() {
        clearInterval(this.interval);
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
