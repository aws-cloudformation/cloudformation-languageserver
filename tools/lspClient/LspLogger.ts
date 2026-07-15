import pino from 'pino';

export function createLspClientLogger() {
    return pino({
        level: 'warn',
        transport: {
            target: 'pino-pretty',
            options: {
                colorize: true,
                translateTime: 'SYS:hh:MM:ss.l TT',
                ignore: 'pid,hostname',
                messageFormat: '[LspClient] {msg}',
            },
        },
    });
}

export function createLspServerLogger() {
    return pino({
        level: 'info',
        transport: {
            target: 'pino-pretty',
            options: {
                colorize: true,
                translateTime: 'SYS:hh:MM:ss.l TT',
                ignore: 'pid,hostname',
                messageFormat: '[LspServer] {msg}',
            },
        },
    });
}
