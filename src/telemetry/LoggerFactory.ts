/* eslint-disable @typescript-eslint/no-unsafe-function-type */
// eslint-disable-next-line no-restricted-syntax -- circular dependency
import { readdir, stat, unlink, writeFile, readFile } from 'fs/promises';
import { join } from 'path';
import { DateTime } from 'luxon';
import pino, { LevelWithSilent, Logger } from 'pino';
import { pathToArtifact } from '../utils/ArtifactsDir';
import { Closeable } from '../utils/Closeable';
import { ExtensionId, ExtensionName } from '../utils/ExtensionConfig';
import { TelemetrySettings } from './TelemetryConfig';

export class LoggerFactory implements Closeable {
    private static readonly MaxFileSize = 50 * 1024 * 1024; // 50MB
    private static _instance: LoggerFactory;

    private readonly baseLogger: Logger;
    private readonly logLevel: LevelWithSilent;
    private readonly loggers = new Map<string, Logger>();
    private readonly interval: NodeJS.Timeout;

    private constructor(
        private readonly logsDirectory: string,
        level: LevelWithSilent,
    ) {
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
                                logsDirectory,
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
            const files = await readdir(this.logsDirectory);
            const oneWeekAgo = DateTime.utc().minus({ weeks: 1 });

            for (const file of files) {
                if (!file.endsWith('.log')) continue;

                const filePath = join(this.logsDirectory, file);
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
            const files = await readdir(this.logsDirectory);

            for (const file of files) {
                if (!file.endsWith('.log')) continue;

                const filePath = join(this.logsDirectory, file);
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

    static initialize(logsDirectory: string = pathToArtifact('logs'), logLevel?: LevelWithSilent) {
        if (LoggerFactory._instance !== undefined) {
            throw new Error('LoggerFactory was already initialized');
        }

        LoggerFactory._instance = new LoggerFactory(logsDirectory, logLevel ?? TelemetrySettings.logLevel);
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
