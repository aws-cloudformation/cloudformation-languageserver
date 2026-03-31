/* eslint-disable @typescript-eslint/no-unsafe-return */
import { spawn, ChildProcess } from 'child_process';
import {
    createMessageConnection,
    MessageConnection,
    StreamMessageReader,
    StreamMessageWriter,
    IPCMessageReader,
    IPCMessageWriter,
    TextDocumentContentChangeEvent,
} from 'vscode-languageserver-protocol/node';
import { randomBytes, randomUUID } from 'crypto';
import { LspClientConfig, ReadinessFlags, ExtendedInitializeParams } from './types';
import { LspConnection } from './LspConnectionInterface';
import { WaitFor } from '../../tst/utils/Utils';

/**
 * Common LSP client for CloudFormation Language Server testing.
 * Handles server startup, LSP protocol communication, and readiness detection.
 */
export class LspClient implements LspConnection {
    protected serverProcess?: ChildProcess;
    protected connection?: MessageConnection;
    protected readinessFlags: ReadinessFlags = {
        cfnLint: false,
        cfnGuard: false,
    };

    public readonly clientId: string;
    public readonly createdAt: number;
    protected readonly encryptionKey: Buffer;
    protected isShutdown = false;
    protected currentWorkspaceConfig: Record<string, unknown>[] = [{}];
    public readyRegions = new Set<string>();

    constructor(protected config: LspClientConfig) {
        this.clientId = config.clientId ?? `lsp-client-${randomUUID()}`;
        this.createdAt = performance.now();
        this.encryptionKey = randomBytes(32);
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

        // 2. Setup output monitoring for readiness detection
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

        this.connection.onRequest('workspace/configuration', (params: any) => {
            // Extract the specific configuration section requested
            if (params?.items?.length > 0) {
                const results = params.items.map((item: any) => {
                    if (item.section === 'aws.cloudformation') {
                        // Return just the CloudFormation config part
                        const fullConfig = this.currentWorkspaceConfig[0] ?? {};
                        return (fullConfig as any)['aws.cloudformation'] ?? {};
                    }
                    return {};
                });
                return results;
            }
            return this.currentWorkspaceConfig;
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

        // Readiness detection
        if (output.includes('cfn-lint version')) {
            this.readinessFlags.cfnLint = true;
        }
        if (output.includes('Loading rules from')) {
            this.readinessFlags.cfnGuard = true;
        }

        // Region-specific schema loading
        const regionSchemaMatch = output.match(/public schemas downloaded for ([a-z0-9-]+)/);
        if (regionSchemaMatch) {
            this.readyRegions.add(regionSchemaMatch[1]);
        }

        // Log filtering
        const suppressLevels = this.config.suppressLogLevels ?? ['INFO', 'DEBUG'];
        const shouldSuppress = suppressLevels.some((level) => output.includes(`${level}:`));

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
            clientInfo: {
                name: 'CFN LSP Test Client',
                version: '1.0.0',
            },
            initializationOptions: {
                aws: {
                    clientInfo: {
                        extension: {
                            name: 'aws.cloudformation.lsp.test',
                            version: '1.0.0',
                        },
                        clientId: this.clientId,
                    },
                    telemetryEnabled: this.config.telemetryEnabled ?? true,
                    storageDir: this.config.storageDir,
                    encryption: {
                        key: this.encryptionKey.toString('base64'),
                        mode: 'JWT',
                    },
                    ...(this.config.featureFlags && {
                        featureFlags: this.config.featureFlags,
                    }),
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

    async hover(uri: string, line: number, character: number): Promise<any> {
        return await this.connection!.sendRequest('textDocument/hover', {
            textDocument: { uri },
            position: { line, character },
        });
    }

    async completion(uri: string, line: number, character: number): Promise<any> {
        return await this.connection!.sendRequest('textDocument/completion', {
            textDocument: { uri },
            position: { line, character },
        });
    }

    async changeConfiguration(params: { settings: any }): Promise<void> {
        // Store the new configuration
        if (params.settings) {
            const currentConfig = this.currentWorkspaceConfig[0] ?? {};
            this.currentWorkspaceConfig = [{ ...currentConfig, ...params.settings }];
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

    async waitForReadiness(timeoutMs: number = 30_000): Promise<void> {
        await WaitFor.waitFor(
            () => {
                if (!this.readinessFlags.cfnLint || !this.readinessFlags.cfnGuard) {
                    throw new Error('Lint and Guard services not ready yet');
                }
                console.log('Lint and Guard services are ready');
            },
            timeoutMs,
            500, // Check every 500ms
        );
    }

    get readiness(): ReadinessFlags {
        return { ...this.readinessFlags };
    }

    /** Shutdown the LSP server */
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
