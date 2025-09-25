import { Connection, PublishDiagnosticsParams } from 'vscode-languageserver/node';

export class LspDiagnostics {
    constructor(private readonly connection: Connection) {}

    publishDiagnostics(params: PublishDiagnosticsParams) {
        return this.connection.sendDiagnostics(params);
    }
}
