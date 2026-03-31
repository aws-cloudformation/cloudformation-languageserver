export interface StandaloneConfig {
    duration: string;
    maxRetries: number;
    responseTimeout: number;
    standalonePath: string;
}

function parseSimpleArgs(): Partial<StandaloneConfig> {
    const args: Partial<StandaloneConfig> = {};

    for (let i = 0; i < process.argv.length; i++) {
        const arg = process.argv[i];
        const nextArg = process.argv[i + 1];

        if ((arg === '--duration' || arg === '-d') && nextArg) {
            args.duration = nextArg;
            i++;
        } else if (arg === '--max-retries' && nextArg) {
            args.maxRetries = Number.parseInt(nextArg);
            i++;
        } else if (arg === '--response-timeout' && nextArg) {
            args.responseTimeout = Number.parseInt(nextArg);
            i++;
        } else if (arg === '--standalone-path' && nextArg) {
            args.standalonePath = nextArg;
            i++;
        }
    }

    return args;
}

export function parseStandaloneConfig(): StandaloneConfig {
    // Start with environment variables (npm script support)
    const envConfig = {
        duration: process.env.LONG_RUNNING_DURATION ?? '4h',
        maxRetries: Number.parseInt(process.env.MAX_RETRIES ?? '3'),
        responseTimeout: Number.parseInt(process.env.RESPONSE_TIMEOUT ?? '5000'),
        standalonePath: process.env.STANDALONE_PATH ?? './cfn-lsp-server-standalone.js',
    };

    // Override with command line arguments if provided
    const cliArgs = parseSimpleArgs();

    return {
        ...envConfig,
        ...cliArgs,
    };
}

export function parseDuration(duration: string): number {
    const match = duration.match(/^(\d+)([hms])$/);
    if (!match) throw new Error(`Invalid duration format: ${duration}`);

    const value = Number.parseInt(match[1]);
    const unit = match[2];

    switch (unit) {
        case 'h': {
            return value * 60 * 60 * 1000;
        }
        case 'm': {
            return value * 60 * 1000;
        }
        case 's': {
            return value * 1000;
        }
        default: {
            throw new Error(`Invalid duration unit: ${unit}`);
        }
    }
}
