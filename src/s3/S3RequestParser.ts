import { z } from 'zod';
import { NonEmptyZodString } from '../utils/ZodModel';
import { UploadFileParams } from './S3RequestType';

const UploadFileParamsSchema = z.object({
    localFilePath: NonEmptyZodString,
    s3Url: NonEmptyZodString,
});

export function parseUploadFileParams(input: unknown): UploadFileParams {
    return UploadFileParamsSchema.parse(input);
}
