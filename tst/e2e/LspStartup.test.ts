import { execSync } from 'child_process';
import { existsSync } from 'fs';
import { join, resolve } from 'path';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { LspClient } from '../../tools/lspClient/LspClient';
import { randomUUID as v4 } from 'node:crypto';

describe('LSP standalone bundle startup', () => {
    const repoRoot = resolve(__dirname, '..', '..');
    const standalonePath = join(repoRoot, 'bundle', 'production', 'cfn-lsp-server-standalone.js');

    const BUILD_TIMEOUT_MS = 10 * 60 * 1000;
    const TEST_TIMEOUT_MS = 4 * 60 * 1000;
    const SHUTDOWN_TIMEOUT_MS = 30 * 1000;

    let client: LspClient | undefined;

    beforeAll(() => {
        execSync('npm run bundle:alpha -- --env skipWheels=true --env quiet=true', {
            cwd: repoRoot,
            stdio: 'inherit',
        });

        if (!existsSync(standalonePath)) {
            throw new Error(`Bundle build did not produce a standalone server at: ${standalonePath}`);
        }
    }, BUILD_TIMEOUT_MS);

    afterAll(async () => {
        await client?.shutdown();
    }, SHUTDOWN_TIMEOUT_MS);

    it(
        'starts a real LSP server and completes initialize with all components ready',
        async () => {
            client = new LspClient({
                serverPath: standalonePath,
                mode: 'ipc',
                clientConfig: {
                    name: 'CFN LSP Startup Test',
                    version: '1.0.0',
                },
                awsConfig: {
                    clientInfo: {
                        clientId: 'startup-test',
                        extension: {
                            name: 'aws.cloudformation.startup-test',
                            version: '1.0.0',
                        },
                    },
                    telemetryEnabled: false,
                    storageDir: join(process.cwd(), 'node_modules', '.cache', 'lsp-startup', v4()),
                    logLevel: 'info',
                },
            });

            await expect(client.initialize()).resolves.not.toThrow();

            await expect(client.waitForSystemReady()).resolves.not.toThrow();

            const status = await client.getSystemStatus();
            expect(status.settingsReady.ready).toBe(true);
            expect(status.schemasReady.ready).toBe(true);
            expect(status.cfnLintReady.ready).toBe(true);
            expect(status.cfnGuardReady.ready).toBe(true);
        },
        TEST_TIMEOUT_MS,
    );
});
