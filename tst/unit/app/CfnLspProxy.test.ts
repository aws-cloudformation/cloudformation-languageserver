import { beforeEach, describe, expect, test, vi } from 'vitest';
import { CfnLspProxy } from '../../../src/app/cfn-lsp-proxy';

/**
 * Unit tests for the multiplexing proxy's routing tables (Multiplexing
 * Correctness Review contract): c2s/s2c ID remapping, cancellation
 * translation, URI open-sets, document refcounting, folder claims,
 * lifecycle interception, and disconnect cleanup.
 *
 * The proxy is exercised without sockets or a real server by injecting a
 * fake server writer and fabricated client sessions.
 */

interface FakeSession {
    id: string;
    socket: unknown;
    writer: { write: ReturnType<typeof vi.fn> };
    encryptionKey?: Buffer;
    openDocs: Set<string>;
    folders: Set<string>;
    c2s: Map<number, number | string>;
}

function makeProxy(): any {
    const proxy: any = new CfnLspProxy({ serverPath: '/dev/null', serverNode: 'node' });
    proxy.serverWriter = { write: vi.fn() };
    return proxy;
}

function addClient(proxy: any, id: string): FakeSession {
    const session: FakeSession = {
        id,
        socket: {},
        writer: { write: vi.fn() },
        openDocs: new Set(),
        folders: new Set(),
        c2s: new Map(),
    };
    proxy.clients.set(id, session);
    proxy.clientOrder.push(id);
    return session;
}

function serverWrites(proxy: any): any[] {
    return proxy.serverWriter.write.mock.calls.map((c: any[]) => c[0]);
}

function clientWrites(session: FakeSession): any[] {
    return session.writer.write.mock.calls.map((c: any[]) => c[0]);
}

describe('CfnLspProxy routing', () => {
    let proxy: any;

    beforeEach(() => {
        proxy = makeProxy();
    });

    describe('client→server request remapping (c2s)', () => {
        test('remaps request IDs and routes the response back with the original ID', async () => {
            const c = addClient(proxy, 'a');

            await proxy.onClientMessage(c, { jsonrpc: '2.0', id: 7, method: 'textDocument/hover', params: {} });

            const sent = serverWrites(proxy)[0];
            expect(sent.method).toBe('textDocument/hover');
            expect(sent.id).not.toBe(7); // remapped
            expect(proxy.c2sPending.get(sent.id)).toBe('a');

            proxy.onServerMessage({ jsonrpc: '2.0', id: sent.id, result: { ok: true } });

            const back = clientWrites(c)[0];
            expect(back.id).toBe(7); // original ID restored
            expect(back.result).toEqual({ ok: true });
            expect(proxy.c2sPending.size).toBe(0);
            expect(c.c2s.size).toBe(0);
        });

        test('two clients using the same request ID do not collide', async () => {
            const a = addClient(proxy, 'a');
            const b = addClient(proxy, 'b');

            await proxy.onClientMessage(a, { jsonrpc: '2.0', id: 1, method: 'textDocument/hover', params: {} });
            await proxy.onClientMessage(b, { jsonrpc: '2.0', id: 1, method: 'textDocument/completion', params: {} });

            const [reqA, reqB] = serverWrites(proxy);
            expect(reqA.id).not.toBe(reqB.id);

            // Respond in reverse order — each lands at the right client
            proxy.onServerMessage({ jsonrpc: '2.0', id: reqB.id, result: 'forB' });
            proxy.onServerMessage({ jsonrpc: '2.0', id: reqA.id, result: 'forA' });

            expect(clientWrites(a)[0]).toMatchObject({ id: 1, result: 'forA' });
            expect(clientWrites(b)[0]).toMatchObject({ id: 1, result: 'forB' });
        });

        test('translates $/cancelRequest through the c2s map (D2)', async () => {
            const c = addClient(proxy, 'a');
            await proxy.onClientMessage(c, { jsonrpc: '2.0', id: 7, method: 'textDocument/hover', params: {} });
            const proxyId = serverWrites(proxy)[0].id;

            await proxy.onClientMessage(c, { jsonrpc: '2.0', method: '$/cancelRequest', params: { id: 7 } });

            const cancel = serverWrites(proxy)[1];
            expect(cancel.method).toBe('$/cancelRequest');
            expect(cancel.params.id).toBe(proxyId);
        });

        test('drops $/cancelRequest for unknown IDs instead of cancelling someone else', async () => {
            const c = addClient(proxy, 'a');
            await proxy.onClientMessage(c, { jsonrpc: '2.0', method: '$/cancelRequest', params: { id: 999 } });
            expect(serverWrites(proxy)).toHaveLength(0);
        });
    });

    describe('server→client request routing (s2c, D1/D3)', () => {
        test('routes workspace/configuration to the primary client and remaps the response', async () => {
            const primary = addClient(proxy, 'a');
            const other = addClient(proxy, 'b');

            proxy.onServerMessage({ jsonrpc: '2.0', id: 42, method: 'workspace/configuration', params: {} });

            expect(clientWrites(other)).toHaveLength(0); // not broadcast
            const req = clientWrites(primary)[0];
            expect(req.method).toBe('workspace/configuration');
            expect(req.id).not.toBe(42); // remapped

            await proxy.onClientMessage(primary, { jsonrpc: '2.0', id: req.id, result: [{ setting: 1 }] });

            const resp = serverWrites(proxy)[0];
            expect(resp.id).toBe(42); // server's original ID restored
            expect(resp.result).toEqual([{ setting: 1 }]);
            expect(proxy.s2cPending.size).toBe(0);
        });

        test('answers with an error when no client is connected', () => {
            proxy.onServerMessage({ jsonrpc: '2.0', id: 42, method: 'workspace/configuration', params: {} });
            const resp = serverWrites(proxy)[0];
            expect(resp.id).toBe(42);
            expect(resp.error.code).toBe(-32800);
        });

        test('drops a stale response from a non-owning client', async () => {
            const primary = addClient(proxy, 'a');
            const other = addClient(proxy, 'b');

            proxy.onServerMessage({ jsonrpc: '2.0', id: 42, method: 'window/showMessageRequest', params: {} });
            const req = clientWrites(primary)[0];

            await proxy.onClientMessage(other, { jsonrpc: '2.0', id: req.id, result: 'stolen' });
            expect(serverWrites(proxy)).toHaveLength(0);
        });
    });

    describe('document refcounting (D5)', () => {
        const uri = 'file:///proj/template.yaml';
        const didOpen = (v: number) => ({
            jsonrpc: '2.0',
            method: 'textDocument/didOpen',
            params: { textDocument: { uri, version: v, text: 'x' } },
        });
        const didClose = { jsonrpc: '2.0', method: 'textDocument/didClose', params: { textDocument: { uri } } };

        test('forwards didOpen only on 0→1 and didClose only on 1→0', async () => {
            const a = addClient(proxy, 'a');
            const b = addClient(proxy, 'b');

            await proxy.onClientMessage(a, didOpen(1));
            expect(serverWrites(proxy)).toHaveLength(1); // 0→1 forwarded

            await proxy.onClientMessage(b, didOpen(1));
            expect(serverWrites(proxy)).toHaveLength(1); // 1→2 suppressed

            await proxy.onClientMessage(a, didClose);
            expect(serverWrites(proxy)).toHaveLength(1); // 2→1 suppressed

            await proxy.onClientMessage(b, didClose);
            expect(serverWrites(proxy)).toHaveLength(2); // 1→0 forwarded
            expect(serverWrites(proxy)[1].method).toBe('textDocument/didClose');
            expect(proxy.docRefs.size).toBe(0);
        });
    });

    describe('URI-scoped notification routing (D4)', () => {
        const uri = 'file:///proj/template.yaml';

        test('routes publishDiagnostics only to clients holding the URI open', async () => {
            const a = addClient(proxy, 'a');
            const b = addClient(proxy, 'b');
            await proxy.onClientMessage(a, {
                jsonrpc: '2.0',
                method: 'textDocument/didOpen',
                params: { textDocument: { uri, version: 1, text: 'x' } },
            });

            proxy.onServerMessage({
                jsonrpc: '2.0',
                method: 'textDocument/publishDiagnostics',
                params: { uri, diagnostics: [] },
            });

            expect(clientWrites(a)).toHaveLength(1);
            expect(clientWrites(b)).toHaveLength(0);
        });

        test('broadcasts truly global notifications to all clients', () => {
            const a = addClient(proxy, 'a');
            const b = addClient(proxy, 'b');

            proxy.onServerMessage({ jsonrpc: '2.0', method: 'window/logMessage', params: { message: 'hi' } });

            expect(clientWrites(a)).toHaveLength(1);
            expect(clientWrites(b)).toHaveLength(1);
        });
    });

    describe('lifecycle interception (D9)', () => {
        test('ACKs shutdown per-client without forwarding, and swallows exit', async () => {
            const c = addClient(proxy, 'a');

            await proxy.onClientMessage(c, { jsonrpc: '2.0', id: 3, method: 'shutdown' });
            expect(clientWrites(c)[0]).toMatchObject({ id: 3, result: null });
            expect(serverWrites(proxy)).toHaveLength(0);

            await proxy.onClientMessage(c, { jsonrpc: '2.0', method: 'exit' });
            expect(serverWrites(proxy)).toHaveLength(0);
        });
    });

    describe('workspace folder merging (D8)', () => {
        test('late joiner gets the cached initialize result and its folders are merged', async () => {
            proxy.initialized = true;
            proxy.initializeResult = { capabilities: { hoverProvider: true } };
            proxy.serverFolders = new Set(['file:///projA']);

            const b = addClient(proxy, 'b');
            await proxy.onClientMessage(b, {
                jsonrpc: '2.0',
                id: 1,
                method: 'initialize',
                params: { processId: 123, workspaceFolders: [{ uri: 'file:///projB', name: 'projB' }] },
            });

            expect(clientWrites(b)[0]).toMatchObject({
                id: 1,
                result: { capabilities: { hoverProvider: true } },
            });
            const merge = serverWrites(proxy)[0];
            expect(merge.method).toBe('workspace/didChangeWorkspaceFolders');
            expect(merge.params.event.added).toEqual([{ uri: 'file:///projB', name: 'projB' }]);
            expect(proxy.serverFolders.has('file:///projB')).toBe(true);
        });
    });

    describe('disconnect cleanup (D7)', () => {
        test('synthesizes didClose, fails pending s2c requests, and releases folder claims', async () => {
            const a = addClient(proxy, 'a');
            addClient(proxy, 'b'); // survivor — prevents shutdown timer

            // a opens a doc and claims a folder nobody else holds
            const uri = 'file:///proj/template.yaml';
            await proxy.onClientMessage(a, {
                jsonrpc: '2.0',
                method: 'textDocument/didOpen',
                params: { textDocument: { uri, version: 1, text: 'x' } },
            });
            a.folders.add('file:///projA');
            proxy.serverFolders.add('file:///projA');

            // a owns a pending server→client request
            proxy.onServerMessage({ jsonrpc: '2.0', id: 42, method: 'workspace/configuration', params: {} });

            proxy.serverWriter.write.mockClear();
            proxy.onClientDisconnect(a);

            const writes = serverWrites(proxy);
            expect(writes.find((m: any) => m.method === 'textDocument/didClose')?.params.textDocument.uri).toBe(uri);
            expect(writes.find((m: any) => m.error)?.id).toBe(42);
            const folderChange = writes.find((m: any) => m.method === 'workspace/didChangeWorkspaceFolders');
            expect(folderChange.params.event.removed).toEqual([{ uri: 'file:///projA', name: 'file:///projA' }]);
            expect(proxy.serverFolders.has('file:///projA')).toBe(false);
            expect(proxy.docRefs.size).toBe(0);
            expect(proxy.s2cPending.size).toBe(0);
        });

        test('does not release a folder another client still claims', () => {
            const a = addClient(proxy, 'a');
            const b = addClient(proxy, 'b');
            a.folders.add('file:///shared');
            b.folders.add('file:///shared');
            proxy.serverFolders.add('file:///shared');

            proxy.onClientDisconnect(a);

            expect(
                serverWrites(proxy).find((m: any) => m.method === 'workspace/didChangeWorkspaceFolders'),
            ).toBeUndefined();
            expect(proxy.serverFolders.has('file:///shared')).toBe(true);
        });
    });
});
