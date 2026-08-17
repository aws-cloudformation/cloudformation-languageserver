import { spawn } from 'child_process';
import { EventEmitter } from 'events';
import { PassThrough } from 'stream';
import { describe, beforeEach, expect, it, vi } from 'vitest';
import { LspClient } from '../../../../tools/lspClient/LspClient';

vi.mock('child_process', async () => {
    const childProcess = await vi.importActual<typeof import('child_process')>('child_process');
    return { ...childProcess, spawn: vi.fn() };
});

// EventEmitter matches Node's ChildProcess event contract used by LspClient.
// eslint-disable-next-line unicorn/prefer-event-target
class TestChildProcess extends EventEmitter {
    readonly stdout = new PassThrough();
    readonly stderr = new PassThrough();
    readonly kill = vi.fn(() => true);
}

describe('LspClient', () => {
    let serverProcess: TestChildProcess;

    beforeEach(() => {
        vi.clearAllMocks();
        serverProcess = new TestChildProcess();
        vi.mocked(spawn).mockReturnValue(serverProcess as unknown as ReturnType<typeof spawn>);
    });

    it('should wait for the server process to close before resolving shutdown', async () => {
        let notifyKillCalled: () => void;
        const killCalled = new Promise<void>((resolve) => {
            notifyKillCalled = resolve;
        });
        serverProcess.kill.mockImplementation(() => {
            notifyKillCalled();
            return true;
        });

        const client = new LspClient({
            serverPath: '/test/cfn-lsp-server.js',
            mode: 'ipc',
            clientConfig: { name: 'test-client', version: '1.0.0' },
            awsConfig: {
                clientInfo: {
                    clientId: 'test-client',
                    extension: { name: 'test-extension', version: '1.0.0' },
                },
                telemetryEnabled: false,
            },
        });
        const connection = {
            sendRequest: vi.fn().mockResolvedValue(undefined),
            sendNotification: vi.fn().mockResolvedValue(undefined),
            dispose: vi.fn(),
        };
        Object.assign(client, { connection });

        let shutdownResolved = false;
        const shutdownPromise = client.shutdown().then(() => {
            shutdownResolved = true;
        });
        await killCalled;
        await new Promise<void>((resolve) => setImmediate(resolve));

        expect(shutdownResolved).toBe(false);

        serverProcess.emit('close', 0, 'SIGTERM');
        await shutdownPromise;

        expect(connection.dispose).toHaveBeenCalledOnce();
        expect(serverProcess.kill).toHaveBeenCalledOnce();
    });
});
