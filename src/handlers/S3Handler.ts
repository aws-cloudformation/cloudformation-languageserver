import { ErrorCodes, RequestHandler, ResponseError } from 'vscode-languageserver';
import { parseUploadFileParams } from '../s3/S3RequestParser';
import { UploadFileParams } from '../s3/S3RequestType';
import { ServerComponents } from '../server/ServerComponents';
import { extractErrorMessage } from '../utils/Errors';
import { parseWithPrettyError } from '../utils/ZodErrorWrapper';

export function uploadFileToS3Handler(components: ServerComponents): RequestHandler<UploadFileParams, void, void> {
    return async (rawParams) => {
        try {
            const params = parseWithPrettyError(parseUploadFileParams, rawParams);
            await components.s3Service.putObject(params.localFilePath, params.s3Url);
        } catch (error) {
            handleS3Error(error, 'Failed to upload file to S3');
        }
    };
}

function handleS3Error(error: unknown, contextMessage: string): never {
    if (error instanceof ResponseError) {
        throw error;
    }
    if (error instanceof TypeError) {
        throw new ResponseError(ErrorCodes.InvalidParams, error.message);
    }
    throw new ResponseError(ErrorCodes.InternalError, `${contextMessage}: ${extractErrorMessage(error)}`);
}
