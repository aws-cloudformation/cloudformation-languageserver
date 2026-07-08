import { AwsRegion } from './Region';

const CHINA_REGIONS: ReadonlySet<string> = new Set([AwsRegion.CN_NORTH_1, AwsRegion.CN_NORTHWEST_1]);

/**
 * Builds an HTTPS path-style S3 URL for an uploaded object.
 *
 * CloudFormation requires HTTPS URLs (not `s3://` URIs) for template locations such as
 * `AWS::CloudFormation::Stack` `TemplateURL` and `AWS::Serverless::Application` `Location`.
 * An `s3://` URI is rejected with "Domain name specified in <bucket> is not a valid S3 domain".
 * Mirrors the AWS CLI `aws cloudformation package` behavior (`to_path_style_s3_url`).
 */
export function toHttpsPathStyleS3Url(region: string, bucketName: string, key: string): string {
    const dnsSuffix = CHINA_REGIONS.has(region) ? 'amazonaws.com.cn' : 'amazonaws.com';
    return `https://s3.${region}.${dnsSuffix}/${bucketName}/${key}`;
}
