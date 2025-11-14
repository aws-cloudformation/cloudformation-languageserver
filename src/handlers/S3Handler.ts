import { RequestHandler } from 'vscode-languageserver';
import { parseUploadFileParams } from '../s3/S3RequestParser';
import { UploadFileParams } from '../s3/S3RequestType';
import { ServerComponents } from '../server/ServerComponents';
import { withOnlineFeatures } from '../utils/OnlineFeatureWrapper';
import { parseWithPrettyError } from '../utils/ZodErrorWrapper';

export function uploadFileToS3Handler(components: ServerComponents): RequestHandler<UploadFileParams, void, void> {
    return async (rawParams) => {
        return await withOnlineFeatures(components.onlineFeatureGuard, async () => {
            const params = parseWithPrettyError(parseUploadFileParams, rawParams);
            await components.s3Service.putObject(params.localFilePath, params.s3Url);
        });
    };
}
