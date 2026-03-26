import yargs from 'yargs';
import { hideBin } from 'yargs/helpers';

export interface LongRunningConfig {
    duration: string;
    maxRetries: number;
    responseTimeout: number;
}

export function parseConfig(): LongRunningConfig {
    const isVitest = process.argv.some((arg) => arg.includes('vitest'));

    if (isVitest) {
        return {
            duration: process.env.LONG_RUNNING_DURATION ?? '4h',
            maxRetries: Number.parseInt(process.env.LONG_RUNNING_MAX_RETRIES ?? '3'),
            responseTimeout: Number.parseInt(process.env.LONG_RUNNING_RESPONSE_TIMEOUT ?? '2000'),
        };
    } else {
        return yargs(hideBin(process.argv))
            .option('duration', {
                alias: 'd',
                type: 'string',
                default: '4h',
                description: 'Test duration (e.g., 4h, 300m, 18000s)',
            })
            .option('max-retries', {
                type: 'number',
                default: 3,
                description: 'Maximum retry attempts per request',
            })
            .option('response-timeout', {
                type: 'number',
                default: 2000,
                description: 'Response time threshold in milliseconds',
            })
            .help()
            .parseSync() as LongRunningConfig;
    }
}

export function parseDuration(duration: string): number {
    const match = duration.match(/^(\d+)([hms])$/);
    if (!match) throw new Error('Invalid duration format. Use format like 4h, 300m, or 18000s');

    const value = Number.parseInt(match[1]);
    const unit = match[2];

    switch (unit) {
        case 'h':
            return value * 60 * 60 * 1000;
        case 'm':
            return value * 60 * 1000;
        case 's':
            return value * 1000;
        default:
            throw new Error('Invalid duration unit');
    }
}
