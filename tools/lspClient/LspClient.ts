import { spawn, ChildProcess } from 'child_process';
import {
    createMessageConnection,
    MessageConnection,
    StreamMessageReader,
    StreamMessageWriter,
    IPCMessageReader,
    IPCMessageWriter,
    TextDocumentContentChangeEvent,
    ConfigurationParams,
    DidChangeConfigurationParams,
} from 'vscode-languageserver-protocol/node';
import { Hover, CompletionList } from 'vscode-languageserver-types';
import { randomBytes } from 'crypto';
import { CompactEncrypt } from 'jose';
import { LspClientConfig, LspConnection } from './LspConnection';
import { ExtendedInitializeParams } from '../../src/server/InitParams';
import { IamCredentials } from '../../src/auth/AwsLspAuthTypes';
import { GetSystemStatusResponse } from '../../src/protocol/LspSystemHandlers';
import { WaitFor } from '../../tst/utils/Utils';

/**
 * Common LSP client for CloudFormation Language Server testing.
 * Handles server startup, LSP protocol communication, and external service initialization detection.
 */
export class LspClient implements LspConnection {
    protected serverProcess?: ChildProcess;
    protected connection?: MessageConnection;

    public readonly createdAt: number;
    private readonly encryptionKey: Buffer;
    protected isShutdown = false;
    protected workspaceConfig: Record<string, unknown>[] = [{}];

    private readonly suppressLevels: string[];

    constructor(private readonly config: LspClientConfig) {
        this.createdAt = performance.now();
        this.encryptionKey = randomBytes(32);
        this.suppressLevels = this.config.suppressLogLevels ?? ['INFO', 'DEBUG'];
    }

    async initialize(): Promise<void> {
        console.log('LspClient: Starting initialization...');

        // 1. Start server process
        const args = this.config.mode === 'ipc' ? ['--node-ipc'] : ['--stdio'];
        console.log(`LspClient: Spawning server with args: node ${this.config.serverPath} ${args.join(' ')}`);

        this.serverProcess = spawn('node', [this.config.serverPath, ...args], {
            stdio: this.config.mode === 'ipc' ? ['pipe', 'pipe', 'pipe', 'ipc'] : ['pipe', 'pipe', 'pipe'],
            env: { ...process.env, ...this.config.env },
        });

        console.log(`LspClient: Server process spawned with PID: ${this.serverProcess.pid}`);

        // 2. Setup output monitoring for external service initialization detection
        this.attachOutputListeners();

        // 3. Create LSP connection
        console.log('LspClient: Creating LSP connection...');
        const reader =
            this.config.mode === 'ipc'
                ? new IPCMessageReader(this.serverProcess)
                : new StreamMessageReader(this.serverProcess.stdout!);

        const writer =
            this.config.mode === 'ipc'
                ? new IPCMessageWriter(this.serverProcess)
                : new StreamMessageWriter(this.serverProcess.stdin!);

        this.connection = createMessageConnection(reader, writer);

        // Handle workspace/configuration requests from server

        this.connection.onRequest('workspace/configuration', (params: ConfigurationParams) => {
            if (params?.items?.length > 0) {
                const results = params.items.map((item) => {
                    if (item.section === 'aws.cloudformation') {
                        const fullConfig = this.workspaceConfig[0] ?? {};
                        return fullConfig['aws.cloudformation'] ?? {};
                    }
                    return {};
                });
                return results;
            }
            return this.workspaceConfig;
        });

        this.connection.listen();
        console.log('LspClient: LSP connection created and listening');

        // 4. Perform LSP handshake
        console.log('LspClient: Performing LSP handshake...');
        try {
            await this.performHandshake();
            console.log('LspClient: LSP handshake completed');
        } catch (error) {
            console.error('LspClient: LSP handshake failed:', error);
            throw error;
        }
    }

    private readonly onServerOutput = (data: Buffer) => {
        const output = data.toString().trim();

        const shouldSuppress = this.suppressLevels.some((level) => output.includes(`${level}:`));

        if (!shouldSuppress) {
            console.error(`[LSP Server]: ${output}`);
        }
    };

    protected attachOutputListeners(): void {
        this.serverProcess!.stdout?.on('data', this.onServerOutput);
        this.serverProcess!.stderr?.on('data', this.onServerOutput);

        this.serverProcess!.on('exit', (code, signal) => {
            if (signal) {
                console.log(`[LSP Server]: Process terminated with signal ${signal}`);
            } else {
                console.log(`[LSP Server]: Process exited with code ${code}`);
            }
        });

        this.serverProcess!.on('error', (error) => {
            console.error(`[LSP Server]: Process error:`, error);
        });
    }

    protected async performHandshake(): Promise<void> {
        const initParams: ExtendedInitializeParams = {
            processId: process.pid,
            rootUri: 'file:///test/workspace',
            capabilities: {
                textDocument: {
                    hover: { dynamicRegistration: true },
                    completion: { dynamicRegistration: true },
                },
            },
            clientInfo: this.config.clientInfo,
            initializationOptions: {
                aws: {
                    clientInfo: {
                        extension: this.config.extensionInfo,
                        clientId: this.config.clientId,
                    },
                    telemetryEnabled: this.config.telemetryEnabled,
                    storageDir: this.config.storageDir,
                    encryption: {
                        key: this.encryptionKey.toString('base64'),
                        mode: 'JWT',
                    },
                    featureFlags: this.config.featureFlags,
                },
            },
        };

        console.log('LspClient: Sending initialize request...');
        try {
            await Promise.race([
                this.connection!.sendRequest('initialize', initParams),
                new Promise((_resolve, reject) => setTimeout(() => reject(new Error('Initialize timeout')), 30_000)),
            ]);
            console.log('LspClient: Initialize request completed');

            console.log('LspClient: Sending initialized notification');
            await this.connection!.sendNotification('initialized', {});
            console.log('LspClient: Initialized notification sent');
        } catch (error) {
            console.error('LspClient: Handshake error:', error);
            throw error;
        }
    }

    async openDocument(uri: string, content: string): Promise<void> {
        await this.connection!.sendNotification('textDocument/didOpen', {
            textDocument: {
                uri,
                languageId: 'yaml',
                version: 1,
                text: content,
            },
        });
    }

    async updateDocument(
        uri: string,
        version: number,
        changes: string | TextDocumentContentChangeEvent[],
    ): Promise<void> {
        const contentChanges =
            typeof changes === 'string'
                ? [{ text: changes }] // Full replacement
                : changes; // Incremental changes

        await this.connection!.sendNotification('textDocument/didChange', {
            textDocument: {
                uri,
                version,
            },
            contentChanges,
        });
    }

    async closeDocument(uri: string): Promise<void> {
        await this.connection!.sendNotification('textDocument/didClose', {
            textDocument: { uri },
        });
    }

    async hover(uri: string, line: number, character: number): Promise<Hover | null> {
        return await this.connection!.sendRequest('textDocument/hover', {
            textDocument: { uri },
            position: { line, character },
        });
    }

    async completion(uri: string, line: number, character: number): Promise<CompletionList | null> {
        return await this.connection!.sendRequest('textDocument/completion', {
            textDocument: { uri },
            position: { line, character },
        });
    }

    async changeConfiguration(params: DidChangeConfigurationParams): Promise<void> {
        // Store the new configuration
        if (params.settings) {
            const currentConfig = this.workspaceConfig[0] ?? {};
            this.workspaceConfig = [{ ...currentConfig, ...params.settings }];
        }

        // Send the configuration change notification
        await this.sendNotification('workspace/didChangeConfiguration', params);
    }

    async sendRequest(method: string, params: any): Promise<any> {
        return await this.connection!.sendRequest(method, params);
    }

    async sendNotification(method: string, params: any): Promise<void> {
        return await this.connection!.sendNotification(method, params);
    }

    onNotification(method: string, handler: (params: any) => void): void {
        this.connection!.onNotification(method, handler);
    }

    onRequest(method: string, handler: (params: any) => any): void {
        this.connection!.onRequest(method, handler);
    }

    async waitForExternalServiceInitialization(): Promise<void> {
        console.log('Waiting for lint and guard initialization via SystemHandler...');

        await WaitFor.waitFor(
            async () => {
                const status = await this.getSystemStatus();
                console.log(
                    `Service status: cfnLint=${status.cfnLintReady.ready}, cfnGuard=${status.cfnGuardReady.ready}`,
                );
                if (!status.cfnLintReady.ready || !status.cfnGuardReady.ready) {
                    throw new Error('Lint and Guard services not initialized');
                }
                console.log('Lint and Guard services are initialized');
            },
            30_000,
            500, // Check every 500ms
        );
    }

    async updateCredentials(credentials: IamCredentials): Promise<void> {
        const payload = new TextEncoder().encode(JSON.stringify({ data: credentials }));
        const jwt = await new CompactEncrypt(payload)
            .setProtectedHeader({ alg: 'dir', enc: 'A256GCM' })
            .encrypt(this.encryptionKey);

        await this.connection!.sendRequest('aws/credentials/iam/update', {
            data: jwt,
            encrypted: true,
        });
    }

    async getSystemStatus(): Promise<GetSystemStatusResponse> {
        return (await this.sendRequest('aws/system/status', {})) as GetSystemStatusResponse;
    }

    async shutdown(): Promise<void> {
        if (this.isShutdown) return;
        this.isShutdown = true;

        try {
            if (this.connection) {
                await this.connection.sendRequest('shutdown', {});
                await this.connection.sendNotification('exit', {});
            }
        } catch (e) {
            console.warn('Error during LSP shutdown:', e);
        }

        if (this.serverProcess) {
            this.serverProcess.kill();
        }
    }
}
