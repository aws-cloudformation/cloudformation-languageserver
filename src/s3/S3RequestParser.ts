import { z } from 'zod';
import { UploadFileParams } from './S3RequestType';

const UploadFileParamsSchema = z.object({
    localFilePath: z.string().min(1),
    s3Url: z.string().min(1),
});

export function parseUploadFileParams(input: unknown): UploadFileParams {
    return UploadFileParamsSchema.parse(input);
}
