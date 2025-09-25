import { DidChangeWorkspaceFoldersNotification } from 'vscode-languageserver';
import {
    Connection,
    WorkspaceFolder,
    ClientCapabilities,
    DidChangeConfigurationNotification,
} from 'vscode-languageserver/node';
import { NotificationHandler } from 'vscode-languageserver-protocol';
import { extractErrorMessage } from '../utils/Errors';

export class LspWorkspace {
    private isInitialized = false;
    private workspaceFolderChangeHandler: NotificationHandler<WorkspaceFolder[]> = (_folders) => {};

    constructor(
        private readonly connection: Connection,
        private workspaceFolders: WorkspaceFolder[] = [],
    ) {}

    public initialize(capabilities?: ClientCapabilities, workspaceFolders?: WorkspaceFolder[] | null): void {
        if (!this.isInitialized) {
            if (workspaceFolders) {
                this.workspaceFolders = [...workspaceFolders];
            }

            this.workspaceFolderChangeHandler(this.getAllWorkspaceFolders());
            this.registerConfigurationChanges(capabilities);
            this.registerWorkspaceChanges(capabilities);
        }

        this.isInitialized = true;
    }

    private registerWorkspaceChanges(capabilities?: ClientCapabilities) {
        if (capabilities?.workspace?.workspaceFolders === true) {
            this.connection.client
                .register(DidChangeWorkspaceFoldersNotification.type)
                .then(() => {
                    this.connection.console.info(`Registered for workspace changes`);

                    this.connection.workspace.onDidChangeWorkspaceFolders((event) => {
                        for (const folder of event.added) {
                            if (!this.workspaceFolders.some((f) => f.uri === folder.uri)) {
                                this.workspaceFolders.push(folder);
                            }
                        }

                        for (const folder of event.removed) {
                            this.workspaceFolders = this.workspaceFolders.filter((f) => f.uri !== folder.uri);
                        }

                        this.workspaceFolderChangeHandler(this.getAllWorkspaceFolders());
                    });
                })
                .catch((err) =>
                    this.connection.console.error(
                        `Failed to register for workspace changes: ${extractErrorMessage(err)}`,
                    ),
                );
        }
    }

    private registerConfigurationChanges(capabilities?: ClientCapabilities) {
        if (capabilities?.workspace?.configuration === true) {
            this.connection.client
                .register(DidChangeConfigurationNotification.type)
                .then(() => {
                    this.connection.console.info(`Registered for configuration changes`);
                })
                .catch((err) =>
                    this.connection.console.error(
                        `Failed to register for configuration changes: ${extractErrorMessage(err)}`,
                    ),
                );
        }
    }

    getWorkspaceFolder(uri: string) {
        const matchingFolders = this.workspaceFolders.filter((folder) => uri.startsWith(folder.uri));
        return matchingFolders.length > 0 ? matchingFolders.sort((a, b) => b.uri.length - a.uri.length)[0] : undefined;
    }

    getAllWorkspaceFolders() {
        return [...this.workspaceFolders];
    }

    getConfiguration(section: string) {
        return this.connection.workspace.getConfiguration(section);
    }

    onWorkspaceFolderChanges(handler: NotificationHandler<WorkspaceFolder[]>) {
        this.workspaceFolderChangeHandler = handler;
    }
}
