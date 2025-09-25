import { StubbedInstance, stubInterface } from 'ts-sinon';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { RemoteClient, RemoteConsole, RemoteWorkspace } from 'vscode-languageserver/lib/common/server';
import { Connection, ClientCapabilities } from 'vscode-languageserver/node';
import { WorkspaceFolder } from 'vscode-languageserver-protocol';
import { LspWorkspace } from '../../../src/protocol/LspWorkspace';

describe('LspWorkspace', () => {
    let lspWorkspace: LspWorkspace;
    let connection: StubbedInstance<Connection>;

    beforeEach(() => {
        vi.clearAllMocks();
        connection = stubInterface<Connection>();
        connection.console = stubInterface<RemoteConsole>();
        connection.client = stubInterface<RemoteClient>();
        connection.workspace = stubInterface<RemoteWorkspace>();

        connection.client.register = vi.fn().mockResolvedValue(undefined);
        connection.workspace.getConfiguration = vi.fn();
    });

    describe('getAllWorkspaceFolders', () => {
        it('should return copy of initial workspace folders', () => {
            const folders: WorkspaceFolder[] = [
                { uri: 'file:///workspace1', name: 'workspace1' },
                { uri: 'file:///workspace2', name: 'workspace2' },
            ];
            lspWorkspace = new LspWorkspace(connection, folders);

            const result = lspWorkspace.getAllWorkspaceFolders();

            expect(result).toEqual(folders);
            expect(result).not.toBe(folders); // Should be a copy
        });

        it('should update workspace folders after initialization with new folders', () => {
            lspWorkspace = new LspWorkspace(connection);
            const newFolders: WorkspaceFolder[] = [{ uri: 'file:///new-workspace', name: 'new-workspace' }];

            lspWorkspace.initialize(undefined, newFolders);

            expect(lspWorkspace.getAllWorkspaceFolders()).toEqual(newFolders);
        });
    });

    describe('getWorkspaceFolder', () => {
        beforeEach(() => {
            const folders: WorkspaceFolder[] = [
                { uri: 'file:///workspace', name: 'workspace' },
                { uri: 'file:///workspace/nested', name: 'nested' },
                { uri: 'file:///other', name: 'other' },
            ];
            lspWorkspace = new LspWorkspace(connection, folders);
        });

        it('should return undefined for non-matching URI', () => {
            expect(lspWorkspace.getWorkspaceFolder('file:///unrelated/file.txt')).toBeUndefined();
        });

        it('should return workspace folder for matching URI', () => {
            const result = lspWorkspace.getWorkspaceFolder('file:///workspace/file.txt');

            expect(result).toEqual({ uri: 'file:///workspace', name: 'workspace' });
        });

        it('should return most specific workspace folder for nested paths', () => {
            const result = lspWorkspace.getWorkspaceFolder('file:///workspace/nested/file.txt');

            expect(result).toEqual({ uri: 'file:///workspace/nested', name: 'nested' });
        });
    });

    describe('getConfiguration', () => {
        beforeEach(() => {
            lspWorkspace = new LspWorkspace(connection);
        });

        it('should delegate to connection workspace getConfiguration', () => {
            const section = 'mySection';
            const expectedConfig = { setting: 'value' };
            (connection.workspace.getConfiguration as any).mockReturnValue(expectedConfig);

            const result = lspWorkspace.getConfiguration(section);

            expect(connection.workspace.getConfiguration).toHaveBeenCalledWith(section);
            expect(result).toBe(expectedConfig);
        });
    });

    describe('initialize', () => {
        beforeEach(() => {
            lspWorkspace = new LspWorkspace(connection);
        });

        it('should register for configuration changes when client supports it', () => {
            const capabilities: ClientCapabilities = {
                workspace: { configuration: true },
            };

            lspWorkspace.initialize(capabilities);

            expect(connection.client.register).toHaveBeenCalledWith(
                expect.objectContaining({ method: 'workspace/didChangeConfiguration' }),
            );
        });

        it('should register for workspace folder changes when client supports it', () => {
            const capabilities: ClientCapabilities = {
                workspace: { workspaceFolders: true },
            };

            lspWorkspace.initialize(capabilities);

            expect(connection.client.register).toHaveBeenCalledWith(
                expect.objectContaining({ method: 'workspace/didChangeWorkspaceFolders' }),
            );
        });

        it('should not register when client does not support capabilities', () => {
            const capabilities: ClientCapabilities = {
                workspace: {},
            };

            lspWorkspace.initialize(capabilities);

            expect(connection.client.register).not.toHaveBeenCalled();
        });

        it('should only initialize once', () => {
            const capabilities: ClientCapabilities = {
                workspace: { configuration: true },
            };

            lspWorkspace.initialize(capabilities);
            lspWorkspace.initialize(capabilities);

            expect(connection.client.register).toHaveBeenCalledTimes(1);
        });

        it('should update workspace folders when provided', () => {
            const newFolders: WorkspaceFolder[] = [{ uri: 'file:///updated', name: 'updated' }];

            lspWorkspace.initialize(undefined, newFolders);

            expect(lspWorkspace.getAllWorkspaceFolders()).toEqual(newFolders);
        });
    });
});
