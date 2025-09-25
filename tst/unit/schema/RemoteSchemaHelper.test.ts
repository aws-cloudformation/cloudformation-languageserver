import { promises } from 'fs';
import { join, resolve } from 'path';
import { describe, it, expect } from 'vitest';
import { cfnResourceSchemaLink, unZipFile } from '../../../src/schema/RemoteSchemaHelper';
import { AwsRegion } from '../../../src/utils/Region';

describe('RemoteSchemaHelper', () => {
    describe('cfnResourceSchemaLink', () => {
        it('should generate correct schema URL for a given region', () => {
            expect(cfnResourceSchemaLink(AwsRegion.US_EAST_1)).toBe(
                'https://schema.cloudformation.us-east-1.amazonaws.com/CloudformationSchema.zip',
            );
        });
    });

    describe('unZipFile', () => {
        it('should extract files from zip buffer', async () => {
            const testFile = join(resolve('.'), 'tst', 'resources', 'test.zip');
            const files = await unZipFile(promises.readFile(testFile));

            const file1Exists = files.some((file) => file.name.endsWith('file1.txt') && file.content.includes('file1'));
            const file2Exists = files.some((file) => file.name.endsWith('file2.txt') && file.content.includes('file2'));

            expect(file1Exists).toBe(true);
            expect(file2Exists).toBe(true);
        });
    });
});
