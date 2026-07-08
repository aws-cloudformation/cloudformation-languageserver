import { describe, it, expect } from 'vitest';
import { toHttpsPathStyleS3Url } from '../../../src/utils/S3Url';

describe('toHttpsPathStyleS3Url', () => {
    it('builds a region-scoped HTTPS path-style URL for standard partitions', () => {
        expect(toHttpsPathStyleS3Url('us-east-1', 'my-bucket', 'artifact/template.yaml')).toBe(
            'https://s3.us-east-1.amazonaws.com/my-bucket/artifact/template.yaml',
        );
        expect(toHttpsPathStyleS3Url('eu-west-1', 'other-bucket', 'nested/child-123.yaml')).toBe(
            'https://s3.eu-west-1.amazonaws.com/other-bucket/nested/child-123.yaml',
        );
    });

    it('uses the amazonaws.com.cn suffix for China regions', () => {
        expect(toHttpsPathStyleS3Url('cn-north-1', 'cn-bucket', 'key.yaml')).toBe(
            'https://s3.cn-north-1.amazonaws.com.cn/cn-bucket/key.yaml',
        );
        expect(toHttpsPathStyleS3Url('cn-northwest-1', 'cn-bucket', 'key.yaml')).toBe(
            'https://s3.cn-northwest-1.amazonaws.com.cn/cn-bucket/key.yaml',
        );
    });

    it('uses the standard suffix for GovCloud regions', () => {
        expect(toHttpsPathStyleS3Url('us-gov-west-1', 'gov-bucket', 'key.yaml')).toBe(
            'https://s3.us-gov-west-1.amazonaws.com/gov-bucket/key.yaml',
        );
    });

    it('never produces an s3:// URI', () => {
        const url = toHttpsPathStyleS3Url('us-west-2', 'bucket', 'key');
        expect(url.startsWith('https://')).toBe(true);
        expect(url.startsWith('s3://')).toBe(false);
    });
});
