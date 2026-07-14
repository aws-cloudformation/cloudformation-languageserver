import { ChildProcess, spawn } from 'child_process';
import {
    ConfigurationParams,
    createMessageConnection,
    DidChangeConfigurationParams,
    IPCMessageReader,
    IPCMessageWriter,
    MessageConnection,
    StreamMessageReader,
    StreamMessageWriter,
    TextDocumentContentChangeEvent,
} from 'vscode-languageserver-protocol/node';
import { randomBytes } from 'crypto';
import { CompactEncrypt } from 'jose';
import { LspClientConfig, LspConnection } from './LspConnection';
import { ExtendedInitializeParams } from '../../src/server/InitParams';
import { IamCredentials } from '../../src/auth/AwsLspAuthTypes';
import { GetSystemStatusResponse } from '../../src/protocol/LspSystemHandlers';
import { WaitFor } from '../../tst/utils/Utils';
import { createLspClientLogger, createLspServerLogger } from './LspLogger';
import { DocumentMetadata } from '../../src/document/DocumentProtocol';
import { Diagnostic } from 'vscode-languageserver';
import { Logger } from 'pino';

/**
 * Common LSP client for CloudFormation Language Server testing.
 * Handles server startup, LSP protocol communication, and external service initialization detection.
 */
export class LspClient implements LspConnection {
    private readonly serverProcess!: ChildProcess;
    private connection!: MessageConnection;

    private readonly encryptionKey: Buffer = randomBytes(32);
    private isShutdown = false;
    private workspaceConfig: Record<string, unknown>[];

    private documentMetadata: DocumentMetadata[] = [];
    private readonly diagnosticsMap = new Map<string, Diagnostic[]>();

    private readonly clientLogger: Logger;
    private readonly serverLogger: Logger;

    constructor(private readonly config: LspClientConfig) {
        this.workspaceConfig = config.workspaceConfig ?? [];
        this.clientLogger = config.clientLogger ?? createLspClientLogger();
        this.serverLogger = config.serverLogger ?? createLspServerLogger();

        const args = this.config.mode === 'ipc' ? ['--node-ipc'] : ['--stdio'];
        this.clientLogger.info(`Spawning server with args: node ${this.config.serverPath} ${args.join(' ')}`);

        this.serverProcess = spawn('node', [this.config.serverPath, ...args], {
            stdio: this.config.mode === 'ipc' ? ['pipe', 'pipe', 'pipe', 'ipc'] : ['pipe', 'pipe', 'pipe'],
            env: { ...process.env, ...this.config.env },
        });
        this.clientLogger.info(`Server process spawned with PID: ${this.serverProcess.pid}`);
        this.attachOutputListeners();
    }

    async initialize(): Promise<void> {
        this.clientLogger.info('Starting initialization...');

        // 1. Create LSP connection
        const reader =
            this.config.mode === 'ipc'
                ? new IPCMessageReader(this.serverProcess)
                : new StreamMessageReader(this.serverProcess.stdout!);

        const writer =
            this.config.mode === 'ipc'
                ? new IPCMessageWriter(this.serverProcess)
                : new StreamMessageWriter(this.serverProcess.stdin!);

        this.connection = createMessageConnection(reader, writer);

        // 2. Listen on the connection
        this.connection.listen();
        this.clientLogger.info('LSP connection created and listening');

        // 3. Handle server requests
        this.attachRequestListeners();

        // 4. Perform LSP handshake
        await this.performHandshake();
    }

    private async performHandshake(): Promise<void> {
        const initParams: ExtendedInitializeParams = {
            processId: process.pid,
            rootUri: 'file:///test/workspace',
            capabilities: {
                textDocument: {
                    hover: { dynamicRegistration: true },
                    completion: { dynamicRegistration: true },
                },
            },
            clientInfo: this.config.clientConfig,
            workspaceFolders: [],
            initializationOptions: {
                aws: {
                    ...this.config.awsConfig,
                    encryption: {
                        key: this.encryptionKey.toString('base64'),
                        mode: 'JWT',
                    },
                },
            },
        };

        await Promise.race([
            this.connection.sendRequest('initialize', initParams),
            new Promise((_resolve, reject) => setTimeout(() => reject(new Error('Initialize timeout')), 30_000)),
        ]);

        await this.connection.sendNotification('initialized', {});
    }

    private readonly onServerOutput = (data: Buffer) => {
        if (this.isShutdown) return;

        const output = data.toString().trim().split('\n').join(' ').replace(/\s+/g, ' ');
        const lower = data.toString().trim().toLowerCase();

        if (lower.includes('error')) {
            this.serverLogger.error(output);
        } else if (lower.includes('warn')) {
            this.serverLogger.warn(output);
        } else if (lower.includes('info') || lower.includes('initializing')) {
            this.serverLogger.info(output);
        } else {
            this.serverLogger.debug(output);
        }
    };

    private attachOutputListeners(): void {
        this.serverProcess.stdout?.on('data', this.onServerOutput);
        this.serverProcess.stderr?.on('data', this.onServerOutput);

        this.serverProcess.on('error', (error) => {
            this.serverLogger.error(error, 'Process error');
        });

        this.serverProcess.on('exit', (code, signal) => {
            if (signal) {
                this.serverLogger.info(`Process terminated with signal ${signal}`);
            } else {
                this.serverLogger.info(`Process exited with code ${code}`);
            }
        });
    }

    private attachRequestListeners() {
        this.connection.onRequest('workspace/configuration', (params: ConfigurationParams) => {
            if (params?.items?.length > 0) {
                return params.items.map((item) => {
                    if (item.section === 'aws.cloudformation') {
                        const fullConfig = this.workspaceConfig[0] ?? {};
                        return fullConfig['aws.cloudformation'] ?? {};
                    }
                    return {};
                });
            }
            return this.workspaceConfig;
        });

        this.connection.onNotification('aws/documents/metadata', (docs: DocumentMetadata) => {
            if (Array.isArray(docs)) {
                this.documentMetadata = docs;
            }
        });

        this.connection.onNotification(
            'textDocument/publishDiagnostics',
            (params: { uri: string; diagnostics?: Diagnostic[] }) => {
                this.diagnosticsMap.set(params.uri, params.diagnostics ?? []);
            },
        );
    }

    getDocumentMetadata(): ReadonlyArray<DocumentMetadata> {
        return this.documentMetadata;
    }

    getDiagnostics(uri: string): ReadonlyArray<Diagnostic> {
        return this.diagnosticsMap.get(uri) ?? [];
    }

    getDiagnosticsBySource(uri: string, source: string): ReadonlyArray<Diagnostic> {
        return this.getDiagnostics(uri).filter((d) => d.source === source);
    }

    resetDiagnostics(uri: string): void {
        this.diagnosticsMap.delete(uri);
    }

    sendRequest(method: string, params: unknown) {
        return this.connection.sendRequest(method, params);
    }

    sendNotification(method: string, params: unknown) {
        return this.connection.sendNotification(method, params);
    }

    onNotification(method: string, handler: (params: unknown) => void) {
        this.connection.onNotification(method, handler);
    }

    onRequest(method: string, handler: (params: unknown) => unknown) {
        this.connection.onRequest(method, handler);
    }

    openDocument(uri: string, content: string) {
        return this.connection.sendNotification('textDocument/didOpen', {
            textDocument: {
                uri,
                languageId: 'yaml',
                version: 1,
                text: content,
            },
        });
    }

    updateDocument(uri: string, version: number, changes: string | TextDocumentContentChangeEvent[]) {
        const contentChanges =
            typeof changes === 'string'
                ? [{ text: changes }] // Full replacement
                : changes; // Incremental changes

        return this.connection.sendNotification('textDocument/didChange', {
            textDocument: {
                uri,
                version,
            },
            contentChanges,
        });
    }

    closeDocument(uri: string) {
        return this.connection.sendNotification('textDocument/didClose', {
            textDocument: { uri },
        });
    }

    hover(uri: string, line: number, character: number) {
        return this.connection.sendRequest('textDocument/hover', {
            textDocument: { uri },
            position: { line, character },
        });
    }

    completion(uri: string, line: number, character: number) {
        return this.connection.sendRequest('textDocument/completion', {
            textDocument: { uri },
            position: { line, character },
        });
    }

    changeConfiguration(params: DidChangeConfigurationParams) {
        // Store the new configuration
        if (params.settings) {
            const currentConfig = this.workspaceConfig[0] ?? {};
            this.workspaceConfig = [{ ...currentConfig, ...params.settings }];
        }

        // Send the configuration change notification
        return this.sendNotification('workspace/didChangeConfiguration', params);
    }

    async waitForSystemReady(timeoutMs = 30_000, pollMs = 250): Promise<void> {
        await WaitFor.waitFor(
            async () => {
                const status = await this.getSystemStatus();
                this.clientLogger.info(status, 'System status');
                if (
                    !status.settingsReady.ready ||
                    !status.schemasReady.ready ||
                    !status.cfnLintReady.ready ||
                    !status.cfnGuardReady.ready
                ) {
                    throw new Error('System not ready');
                }
            },
            timeoutMs,
            pollMs,
        );
    }

    async updateCredentials(credentials: IamCredentials): Promise<void> {
        const payload = new TextEncoder().encode(JSON.stringify({ data: credentials }));
        const jwt = await new CompactEncrypt(payload)
            .setProtectedHeader({ alg: 'dir', enc: 'A256GCM' })
            .encrypt(this.encryptionKey);

        await this.connection.sendRequest('aws/credentials/iam/update', {
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
            await this.connection.sendRequest('shutdown', {});
            await this.connection.sendNotification('exit', {});
        } catch (e) {
            this.clientLogger.error(e, 'Error during LSP shutdown');
        }

        this.connection.dispose();
        this.serverProcess.kill();
    }
}
