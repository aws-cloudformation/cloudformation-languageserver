import { execSync } from 'child_process';
import { cpSync, existsSync, mkdirSync, rmSync } from 'fs';
import { join, resolve } from 'path';
import { tmpdir } from 'os';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { LspClient } from '../../tools/lspClient/LspClient';
import { randomUUID as v4 } from 'node:crypto';

describe('LSP standalone bundle startup', () => {
    const repoRoot = resolve(__dirname, '..', '..');
    const bundleSrc = join(repoRoot, 'bundle', 'production');

    // Run the bundle from an isolated temp directory outside the project tree.
    // This prevents Node's module resolution from walking up to the project
    // root's node_modules/, which would mask missing dependencies issues
    const isolatedDir = join(tmpdir(), `cfn-lsp-startup-test-${v4()}`);
    const standalonePath = join(isolatedDir, 'cfn-lsp-server-standalone.js');

    const BUILD_TIMEOUT_MS = 10 * 60 * 1000;
    const TEST_TIMEOUT_MS = 4 * 60 * 1000;
    const SHUTDOWN_TIMEOUT_MS = 30 * 1000;

    let client: LspClient | undefined;

    beforeAll(() => {
        execSync('npm run bundle:alpha -- --env skipWheels=true', {
            cwd: repoRoot,
            stdio: 'ignore',
        });

        if (!existsSync(bundleSrc)) {
            throw new Error(`Bundle build did not produce output at: ${bundleSrc}`);
        }

        mkdirSync(isolatedDir, { recursive: true });
        cpSync(bundleSrc, isolatedDir, { recursive: true });

        if (!existsSync(standalonePath)) {
            throw new Error(`Standalone server not found at: ${standalonePath}`);
        }
    }, BUILD_TIMEOUT_MS);

    afterAll(async () => {
        await client?.shutdown();
        rmSync(isolatedDir, { recursive: true, force: true });
    }, SHUTDOWN_TIMEOUT_MS);

    it(
        'starts a real LSP server and completes initialize with all components ready',
        async () => {
            client = new LspClient({
                serverPath: standalonePath,
                mode: 'ipc',
                cwd: isolatedDir,
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
                    storageDir: join(isolatedDir, '.storage', v4()),
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

            await client.shutdown();
        },
        TEST_TIMEOUT_MS,
    );
});
