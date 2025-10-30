import { RequestType } from 'vscode-languageserver-protocol';

export type UploadFileParams = {
    localFilePath: string;
    s3Url: string;
};

export const UploadFileRequest = new RequestType<UploadFileParams, void, void>('aws/s3/uploadFile');
