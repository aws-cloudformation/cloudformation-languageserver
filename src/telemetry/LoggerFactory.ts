/* eslint-disable @typescript-eslint/no-unsafe-function-type */
import { existsSync } from 'fs';
import { readdir, stat, unlink, writeFile, readFile } from 'fs/promises'; // eslint-disable-line no-restricted-syntax -- circular dependency
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

    private readonly logsDirectory: string;
    private readonly baseLogger: Logger;
    private readonly loggers = new Map<string, Logger>();
    private readonly interval: NodeJS.Timeout;
    private readonly timeout: NodeJS.Timeout;

    private constructor(
        rootDir: string,
        private readonly logLevel: LevelWithSilent,
    ) {
        this.logsDirectory = join(rootDir, 'logs');

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
                                this.logsDirectory,
                                `${ExtensionId}-${DateTime.utc().toFormat('yyyy-MM-dd')}.log`,
                            ),
                            mkdir: true,
                        },
                    },
                ],
            },
        });

        this.timeout = setTimeout(() => {
            void this.cleanOldLogs();
        }, 60 * 1000);
        this.interval = setInterval(
            () => {
                void this.trimLogs();
            },
            10 * 60 * 1000,
        );
    }

    private async cleanOldLogs() {
        try {
            if (!existsSync(this.logsDirectory)) {
                return;
            }
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
        clearTimeout(this.timeout);
        clearInterval(this.interval);
    }

    static getLogger(clazz: string | Function): Logger {
        if (LoggerFactory._instance === undefined) {
            LoggerFactory.initialize();
        }
        return LoggerFactory._instance.getLogger(clazz);
    }

    static initialize(logLevel?: LevelWithSilent, rootDir: string = pathToArtifact()) {
        if (LoggerFactory._instance !== undefined) {
            throw new Error('Logger was already configured');
        }
        LoggerFactory._instance = new LoggerFactory(rootDir, logLevel ?? TelemetrySettings.logLevel);
    }

    static reconfigure(newLevel: LevelWithSilent) {
        LoggerFactory._instance.reconfigure(newLevel);
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
