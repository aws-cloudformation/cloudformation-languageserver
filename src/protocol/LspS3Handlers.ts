import { Connection, RequestHandler } from 'vscode-languageserver';
import { UploadFileRequest, UploadFileParams } from '../s3/S3RequestType';

export class LspS3Handlers {
    constructor(private readonly connection: Connection) {}

    onUploadFile(handler: RequestHandler<UploadFileParams, void, void>) {
        this.connection.onRequest(UploadFileRequest.method, handler);
    }
}
