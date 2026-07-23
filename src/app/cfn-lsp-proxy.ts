#!/usr/bin/env node
/*!
 * Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 * SPDX-License-Identifier: Apache-2.0
 *
 * cfn-lsp-proxy.ts — Multiplexing proxy for CFN Language Server
 *
 * Accepts N client TCP connections (one per IDE window) and routes them to a
 * single language server instance, so one ~500MB server process is shared
 * across all IDE windows instead of spawning one per window.
 *
 * Implements the Multiplexing Correctness Review contract (see
 * docs/memory-investigation.md): bidirectional ID remapping (D1/D2),
 * server→client request routing to the primary client (D3), URI-scoped
 * notification routing (D4), document refcounting (D5), credential
 * re-encryption with a proxy-owned key (D6), disconnect cleanup (D7),
 * workspace folder merging for late joiners (D8), and lifecycle
 * interception with a proper shutdown→exit handshake (D9).
 *
 * Architecture:
 *   Client 1 (TCP) ─┐
 *   Client 2 (TCP) ─┼─► Proxy ──(stdio)──► CFN LSP Server
 *   Client 3 (TCP) ─┘
 */

/*
 * Lint posture: this file is a standalone protocol-proxy script (like
 * standalone.ts), not server-internal code:
 * - JSON-RPC requires literal `null` results (unicorn/no-null)
 * - Writer calls are deliberately fire-and-forget; per-message backpressure
 *   would serialize the multiplexer (no-floating-promises)
 * - serverWriter/ids are guaranteed non-null on these paths; assertions are
 *   cheaper than pervasive optional-chaining on a hot path (no-non-null-assertion)
 * - It IS a CLI entry point (prefer-top-level-await,
 *   no-exports-in-scripts — the exports exist solely for unit tests)
 */
/* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-floating-promises, @typescript-eslint/no-non-null-assertion, @typescript-eslint/prefer-optional-chain, @typescript-eslint/prefer-nullish-coalescing, @typescript-eslint/require-await, @typescript-eslint/restrict-template-expressions, unicorn/no-null, unicorn/no-exports-in-scripts, unicorn/prefer-top-level-await, import/no-namespace, promise/param-names */

import { spawn, ChildProcess } from 'child_process';
import { randomBytes } from 'crypto';
import { mkdirSync, writeFileSync, unlinkSync } from 'fs';
import * as net from 'net';
import { join } from 'path';
import { compactDecrypt, CompactEncrypt } from 'jose';
import { StreamMessageReader, StreamMessageWriter } from 'vscode-jsonrpc/node';

// Constants
const GRACE_PERIOD_MS = 30_000; // wait after last client disconnects before shutting down
const SHUTDOWN_HANDSHAKE_TIMEOUT_MS = 5000;

const CFN_LSP_DIR = join(process.env.HOME || process.env.USERPROFILE || '', '.cfn-lsp');
const PORT_FILE = join(CFN_LSP_DIR, 'proxy.port');
const PID_FILE = join(CFN_LSP_DIR, 'proxy.pid');

export interface ProxyOptions {
    /** Path to the language server bundle (cfn-lsp-server-standalone.js) */
    serverPath: string;
    /** Node executable used to spawn the server */
    serverNode: string;
}

// ---------- Message classification (contract #1, resolves D1) ----------
interface Msg {
    jsonrpc: '2.0';
    id?: number | string;
    method?: string;
    params?: any;
    result?: unknown;
    error?: unknown;
}
const isRequest = (m: Msg): boolean => m.id !== undefined && m.method !== undefined;
const isResponse = (m: Msg): boolean => m.id !== undefined && m.method === undefined;

// StreamMessageWriter.write() takes the base `Message` interface, which rejects
// object literals with id/method/params via excess-property checks. Msg is a
// structural subtype of Message, so StreamMessageWriter is assignable to this
// narrower view (method parameter bivariance).
interface MsgWriter {
    write(msg: Msg): Promise<void>;
}

// Server→client notifications that are scoped to a document URI (routed, not broadcast)
const URI_SCOPED_NOTIFICATIONS = new Set(['textDocument/publishDiagnostics']);

interface ClientSession {
    id: string;
    socket: net.Socket;
    writer: MsgWriter;
    encryptionKey?: Buffer; // this client's key, captured from its initialize params
    openDocs: Set<string>; // URIs this client has open
    folders: Set<string>; // workspace folder URIs this client claims
    c2s: Map<number, number | string>; // proxyId → client's original request id
}

function log(msg: string): void {
    process.stderr.write(`[cfn-lsp-proxy] ${msg}\n`);
}

export class CfnLspProxy {
    constructor(private readonly opts: ProxyOptions) {}

    private tcp!: net.Server;
    private lsp: ChildProcess | null = null;
    private serverWriter: MsgWriter | null = null;
    private readonly clients = new Map<string, ClientSession>();
    private clientOrder: string[] = []; // for primary-client election (contract #3)
    private nextId = 1;
    private readonly c2sPending = new Map<number, string>(); // proxyId → clientId
    private readonly s2cPending = new Map<number, { clientId: string; serverId: number | string }>(); // (D2 fix)
    private readonly docRefs = new Map<string, Set<string>>(); // uri → clientIds (contract #4/#5, D4/D5)
    private initialized = false;
    private initializing: Promise<void> | null = null; // mutex for racing initializes
    private initializeResult: unknown = null;
    private readonly serverFolders = new Set<string>();
    private shutdownTimer: NodeJS.Timeout | null = null;
    private readonly proxyKey = randomBytes(32); // proxy-owned key (contract #9, D6)

    // ---------- lifecycle ----------
    async start(): Promise<void> {
        this.lsp = spawn(this.opts.serverNode, [this.opts.serverPath, '--stdio'], {
            stdio: ['pipe', 'pipe', 'pipe'],
            env: { ...process.env, NODE_OPTIONS: '--max-old-space-size=384' },
        });
        this.lsp.stderr?.on('data', (d) => process.stderr.write(`[server] ${d}`));
        this.lsp.on('exit', (code) => {
            log(`Language server exited (${code}); proxy exiting — clients fall back to per-window spawn`);
            this.cleanupFiles();
            process.exit(code ?? 1);
        });

        new StreamMessageReader(this.lsp.stdout!).listen((m) => this.onServerMessage(m as Msg));
        this.serverWriter = new StreamMessageWriter(this.lsp.stdin!);

        this.tcp = net.createServer((s) => this.onClientConnect(s));
        await new Promise<void>((resolve) => {
            this.tcp.listen(0, '127.0.0.1', () => {
                const port = (this.tcp.address() as net.AddressInfo).port;
                mkdirSync(CFN_LSP_DIR, { recursive: true });
                writeFileSync(PORT_FILE, String(port));
                writeFileSync(PID_FILE, String(process.pid));
                log(`listening on ${port}`);
                resolve();
            });
        });
    }

    private onClientConnect(socket: net.Socket): void {
        const id = `c${this.nextId++}`;
        const session: ClientSession = {
            id,
            socket,
            writer: new StreamMessageWriter(socket),
            openDocs: new Set(),
            folders: new Set(),
            c2s: new Map(),
        };
        this.clients.set(id, session);
        this.clientOrder.push(id);
        this.cancelShutdownTimer();
        log(`${id} connected (${this.clients.size} total)`);

        new StreamMessageReader(socket).listen((m) => void this.onClientMessage(session, m as Msg));
        socket.on('close', () => this.onClientDisconnect(session));
        socket.on('error', (e) => log(`${id} error: ${e.message}`));
    }

    private get primary(): ClientSession | undefined {
        return this.clients.get(this.clientOrder[0]);
    }

    // ---------- client → server ----------
    private async onClientMessage(c: ClientSession, m: Msg): Promise<void> {
        // Responses from clients answer server→client requests (contract #2, resolves D1)
        if (isResponse(m)) {
            const pending = this.s2cPending.get(m.id as number);
            if (pending && pending.clientId === c.id) {
                this.s2cPending.delete(m.id as number);
                this.serverWriter!.write({ ...m, id: pending.serverId });
            } // else: stale/unknown response — drop
            return;
        }

        // Cancellation: translate through the c2s map (contract #2, resolves D2)
        if (m.method === '$/cancelRequest') {
            for (const [proxyId, origId] of c.c2s) {
                if (origId === m.params?.id) {
                    this.serverWriter!.write({ ...m, params: { id: proxyId } });
                    return;
                }
            }
            return; // unknown id — drop rather than cancel someone else's request
        }

        switch (m.method) {
            case 'initialize': {
                return await this.onClientInitialize(c, m);
            }
            case 'initialized': {
                return;
            } // proxy sends its own after real init completes
            case 'shutdown': {
                // lifecycle interception (contract #8, resolves D9)
                c.writer.write({ jsonrpc: '2.0', id: m.id, result: null });
                return;
            }
            case 'exit': {
                return;
            } // swallowed — only proxy shuts the server down
            case 'textDocument/didOpen': {
                const uri = m.params?.textDocument?.uri as string | undefined;
                if (uri) {
                    const refs = this.docRefs.get(uri) ?? new Set<string>();
                    const firstOpen = refs.size === 0;
                    refs.add(c.id);
                    this.docRefs.set(uri, refs);
                    c.openDocs.add(uri);
                    if (!firstOpen) return; // refcount >0→n: suppress (contract #5, resolves D5)
                }
                break; // 0→1: forward
            }
            case 'textDocument/didClose': {
                const uri = m.params?.textDocument?.uri as string | undefined;
                if (uri) {
                    c.openDocs.delete(uri);
                    const refs = this.docRefs.get(uri);
                    refs?.delete(c.id);
                    if (refs && refs.size > 0) return; // others still hold it: suppress
                    this.docRefs.delete(uri);
                }
                break; // 1→0: forward
            }
            case 'aws/credentials/iam/update': {
                return await this.reencryptAndForward(c, m);
            } // contract #9, resolves D6
        }

        if (isRequest(m)) {
            const proxyId = this.nextId++;
            this.c2sPending.set(proxyId, c.id);
            c.c2s.set(proxyId, m.id!);
            this.serverWriter!.write({ ...m, id: proxyId });
        } else {
            this.serverWriter!.write(m); // plain notification (didChange, didSave, iam/delete, …)
        }
    }

    private async onClientInitialize(c: ClientSession, m: Msg): Promise<void> {
        // Capture this client's encryption key + workspace folders
        const keyB64 = m.params?.initializationOptions?.aws?.encryption?.key as string | undefined;
        if (keyB64) {
            c.encryptionKey = Buffer.from(keyB64, 'base64');
        }
        const folders: Array<{ uri: string; name?: string }> = m.params?.workspaceFolders ?? [];
        for (const f of folders) {
            c.folders.add(f.uri);
        }

        if (!this.initialized && !this.initializing) {
            // First client: forward with the PROXY's key substituted (contract #9)
            this.initializing = (async () => {
                const params = structuredClone(m.params ?? {});
                params.processId = process.pid; // watchdog must watch the proxy, not a window
                if (params.initializationOptions?.aws?.encryption) {
                    params.initializationOptions.aws.encryption.key = this.proxyKey.toString('base64');
                }
                const proxyId = this.nextId++;
                this.c2sPending.set(proxyId, c.id);
                c.c2s.set(proxyId, m.id!);
                this.serverWriter!.write({ ...m, id: proxyId, params });
                for (const f of folders) {
                    this.serverFolders.add(f.uri);
                }
            })();
            await this.initializing;
        } else {
            await this.initializing; // racing initializes wait for the first
            c.writer.write({ jsonrpc: '2.0', id: m.id, result: this.initializeResult });
            // Late joiner: merge its folders into the live server (contract #6, resolves D8)
            const added = folders.filter((f) => !this.serverFolders.has(f.uri));
            if (added.length > 0) {
                for (const f of added) {
                    this.serverFolders.add(f.uri);
                }
                this.serverWriter!.write({
                    jsonrpc: '2.0',
                    method: 'workspace/didChangeWorkspaceFolders',
                    params: { event: { added, removed: [] } },
                });
            }
        }
    }

    private async reencryptAndForward(c: ClientSession, m: Msg): Promise<void> {
        try {
            if (!c.encryptionKey) {
                throw new Error('client key unknown');
            }
            const { plaintext } = await compactDecrypt(m.params.data as string, c.encryptionKey);
            const jwt = await new CompactEncrypt(plaintext)
                .setProtectedHeader({ alg: 'dir', enc: 'A256GCM' })
                .encrypt(this.proxyKey);
            const proxyId = this.nextId++;
            this.c2sPending.set(proxyId, c.id);
            c.c2s.set(proxyId, m.id!);
            this.serverWriter!.write({ ...m, id: proxyId, params: { ...m.params, data: jwt, encrypted: true } });
            // Tell other windows so their explorers refresh (last-writer-wins, documented)
            for (const [, other] of this.clients) {
                if (other.id !== c.id) {
                    other.writer.write({ jsonrpc: '2.0', method: 'aws/proxy/credentialsChanged', params: {} });
                }
            }
        } catch (e) {
            log(`credential re-encryption failed for ${c.id}: ${e}`);
            c.writer.write({ jsonrpc: '2.0', id: m.id, result: { success: false } });
        }
    }

    // ---------- server → clients ----------
    private onServerMessage(m: Msg): void {
        if (isResponse(m)) {
            const clientId = this.c2sPending.get(m.id as number);
            if (!clientId) return;
            this.c2sPending.delete(m.id as number);
            const c = this.clients.get(clientId);
            if (!c) return; // client gone — drop (its state was cleaned on disconnect)
            const originalId = c.c2s.get(m.id as number);
            c.c2s.delete(m.id as number);
            if (!this.initialized && (m.result as any)?.capabilities) {
                this.initialized = true;
                this.initializeResult = m.result;
                this.serverWriter!.write({ jsonrpc: '2.0', method: 'initialized', params: {} });
            }
            c.writer.write({ ...m, id: originalId! });
            return;
        }

        if (isRequest(m)) {
            // Server→client request (workspace/configuration, window/showMessageRequest):
            // route to primary client with a remapped id (contract #2/#3, resolves D1)
            const target = this.primary;
            if (!target) {
                this.serverWriter!.write({
                    jsonrpc: '2.0',
                    id: m.id,
                    error: { code: -32_800, message: 'no client connected' },
                });
                return;
            }
            const proxyId = this.nextId++;
            this.s2cPending.set(proxyId, { clientId: target.id, serverId: m.id! });
            target.writer.write({ ...m, id: proxyId });
            return;
        }

        // Notification from server
        if (m.method && URI_SCOPED_NOTIFICATIONS.has(m.method)) {
            // Route only to clients holding the URI open (contract #4, resolves D4)
            const uri = m.params?.uri as string | undefined;
            const holders = uri ? this.docRefs.get(uri) : undefined;
            for (const id of holders ?? []) {
                this.clients.get(id)?.writer.write(m);
            }
        } else {
            for (const [, c] of this.clients) {
                c.writer.write(m); // truly global: broadcast
            }
        }
    }

    // ---------- disconnect & shutdown ----------
    private onClientDisconnect(c: ClientSession): void {
        if (!this.clients.has(c.id)) return; // already cleaned up
        this.clients.delete(c.id);
        this.clientOrder = this.clientOrder.filter((id) => id !== c.id);
        log(`${c.id} disconnected (${this.clients.size} remaining)`);

        // Contract #7 (resolves D7): release documents…
        for (const uri of c.openDocs) {
            const refs = this.docRefs.get(uri);
            refs?.delete(c.id);
            if (refs && refs.size === 0) {
                this.docRefs.delete(uri);
                this.serverWriter!.write({
                    jsonrpc: '2.0',
                    method: 'textDocument/didClose',
                    params: { textDocument: { uri } },
                });
            }
        }
        // …fail its pending server→client requests back to the server…
        for (const [proxyId, p] of this.s2cPending) {
            if (p.clientId === c.id) {
                this.s2cPending.delete(proxyId);
                this.serverWriter!.write({
                    jsonrpc: '2.0',
                    id: p.serverId,
                    error: { code: -32_800, message: 'client disconnected' },
                });
            }
        }
        // …and release folder claims nobody else holds (contract #6)
        const removed = [...c.folders].filter((uri) => ![...this.clients.values()].some((o) => o.folders.has(uri)));
        if (removed.length > 0) {
            for (const uri of removed) {
                this.serverFolders.delete(uri);
            }
            this.serverWriter!.write({
                jsonrpc: '2.0',
                method: 'workspace/didChangeWorkspaceFolders',
                params: { event: { added: [], removed: removed.map((uri) => ({ uri, name: uri })) } },
            });
        }

        if (this.clients.size === 0) {
            this.shutdownTimer = setTimeout(() => void this.gracefulShutdown(), GRACE_PERIOD_MS);
        }
    }

    private cancelShutdownTimer(): void {
        if (this.shutdownTimer) {
            clearTimeout(this.shutdownTimer);
            this.shutdownTimer = null;
        }
    }

    // Contract #8: proper shutdown→exit handshake, NOT kill() (avoids the orphan pattern)
    async gracefulShutdown(): Promise<void> {
        log('no clients — shutting down server via handshake');
        const shutdownId = this.nextId++;
        this.serverWriter?.write({ jsonrpc: '2.0', id: shutdownId, method: 'shutdown' });
        await new Promise((r) => setTimeout(r, SHUTDOWN_HANDSHAKE_TIMEOUT_MS)); // response or timeout
        this.serverWriter?.write({ jsonrpc: '2.0', method: 'exit' });
        setTimeout(() => this.lsp?.kill('SIGKILL'), SHUTDOWN_HANDSHAKE_TIMEOUT_MS).unref(); // last resort
        this.cleanupFiles();
    }

    private cleanupFiles(): void {
        try {
            unlinkSync(PORT_FILE);
        } catch {
            /* ignore */
        }
        try {
            unlinkSync(PID_FILE);
        } catch {
            /* ignore */
        }
    }
}

// Bootstrap only when run as a script — importing this module (e.g. in tests)
// must have no side effects.
if (require.main === module) {
    const args = process.argv.slice(2);
    const serverPathIndex = args.indexOf('--server-path');
    const serverNodeIndex = args.indexOf('--server-node');
    const serverPath = serverPathIndex === -1 ? '' : args[serverPathIndex + 1];
    const serverNode = serverNodeIndex === -1 ? 'node' : args[serverNodeIndex + 1];

    if (!serverPath) {
        process.stderr.write('Usage: cfn-lsp-proxy --server-path <path-to-server.js> [--server-node <path-to-node>]\n');
        process.exit(1);
    }

    const proxy = new CfnLspProxy({ serverPath, serverNode });
    proxy.start().catch((err) => {
        log(`failed to start: ${err}`);
        process.exit(1);
    });
    process.on('SIGTERM', () => void proxy.gracefulShutdown());
    process.on('SIGINT', () => void proxy.gracefulShutdown());
}
