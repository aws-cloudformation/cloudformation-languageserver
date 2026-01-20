import { EventEmitter } from 'node:events';
import { tmpdir } from 'os';
import { join } from 'path';
import pino from 'pino';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Mock Storage
vi.mock('../../../src/utils/Storage', () => ({
    Storage: {
        initialize: vi.fn(),
        pathToStorage: vi.fn(() => join(tmpdir(), 'test-logger')),
    },
    pathToStorage: vi.fn(() => join(tmpdir(), 'test-logger')),
}));

// Mock pino to control the stream
vi.mock('pino', () => {
    const streamSym = Symbol('pino.stream');

    const pinoMock: any = vi.fn(() => {
        // eslint-disable-next-line unicorn/prefer-event-target
        const mockStream = new EventEmitter();
        (mockStream as any).write = vi.fn();

        const mockLogger: any = {
            info: vi.fn(),
            error: vi.fn(),
            child: vi.fn(() => mockLogger),
            level: 'info',
        };

        mockLogger[streamSym] = mockStream;

        return mockLogger;
    });

    pinoMock.symbols = {
        streamSym,
    };

    return { default: pinoMock };
});

describe('LoggerFactory', () => {
    let LoggerFactory: any;

    beforeEach(async () => {
        vi.resetModules();
        const module = await import('../../../src/telemetry/LoggerFactory');
        LoggerFactory = module.LoggerFactory;

        // Reset the singleton instance
        LoggerFactory._instance = undefined;
    });

    afterEach(() => {
        vi.clearAllMocks();
    });

    describe('pino stream error handling', () => {
        it('should suppress "worker has exited" errors during shutdown', () => {
            // Initialize fresh LoggerFactory
            LoggerFactory.initialize('info');
            const logger = LoggerFactory.getLogger('test');

            // Get the stream
            const stream = logger[pino.symbols.streamSym];
            expect(stream).toBeDefined();

            // Spy on console.error
            const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

            // Close to set shuttingDown flag
            LoggerFactory._instance.close();

            // Emit worker exit error during shutdown
            stream.emit('error', new Error('the worker has exited'));

            // Should NOT log to console during shutdown
            expect(consoleErrorSpy).not.toHaveBeenCalled();

            consoleErrorSpy.mockRestore();
        });

        it('should log "worker has exited" errors during normal operation', () => {
            // Initialize fresh LoggerFactory
            LoggerFactory.initialize('info');
            const logger = LoggerFactory.getLogger('test');

            // Get the stream
            const stream = logger[pino.symbols.streamSym];

            // Spy on console.error
            const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

            // Emit worker exit error during normal operation (NOT shutdown)
            stream.emit('error', new Error('the worker has exited'));

            // Should log to console as unexpected crash
            expect(consoleErrorSpy).toHaveBeenCalledWith(
                'Pino worker thread crashed unexpectedly:',
                'the worker has exited',
            );

            consoleErrorSpy.mockRestore();
        });

        it('should log unexpected stream errors to console', () => {
            // Initialize fresh LoggerFactory
            LoggerFactory.initialize('info');
            const logger = LoggerFactory.getLogger('test');

            // Get the stream
            const stream = logger[pino.symbols.streamSym];

            // Spy on console.error
            const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

            // Emit unexpected error
            const unexpectedError = new Error('Some other error');
            stream.emit('error', unexpectedError);

            // Should log unexpected errors
            expect(consoleErrorSpy).toHaveBeenCalledWith('Unexpected pino stream error:', unexpectedError);

            consoleErrorSpy.mockRestore();
        });

        it('should handle "worker thread exited" error variant during shutdown', () => {
            // Initialize fresh LoggerFactory
            LoggerFactory.initialize('info');
            const logger = LoggerFactory.getLogger('test');

            // Get the stream
            const stream = logger[pino.symbols.streamSym];

            // Spy on console.error
            const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

            // Close to set shuttingDown flag
            LoggerFactory._instance.close();

            // Emit the other variant of worker exit error
            stream.emit('error', new Error('the worker thread exited'));

            // Should NOT log to console during shutdown
            expect(consoleErrorSpy).not.toHaveBeenCalled();

            consoleErrorSpy.mockRestore();
        });
    });
});
