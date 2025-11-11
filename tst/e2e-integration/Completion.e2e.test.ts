import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { TestExtension } from '../utils/TestExtension';
import { wait, getSimpleYamlTemplateText } from '../utils/Utils';

describe('E2E-Integration: Completion', () => {
    let client: TestExtension;

    beforeAll(async () => {
        client = new TestExtension(undefined, false);
        await client.ready();
    }, 30000);

    afterAll(async () => {
        await client.close();
    });

    it('should provide resource type completions', async () => {
        const template = getSimpleYamlTemplateText();
        const uri = await client.openYamlTemplate(template);
        await wait(2000);

        const updatedTemplate = `AWSTemplateFormatVersion: "2010-09-09"
Resources:
  MyS3Bucket:
    Type: AWS::S3::Bucket
  NewResource:
    Type: `;

        await client.changeDocument({
            textDocument: { uri, version: 2 },
            contentChanges: [{ text: updatedTemplate }],
        });
        await wait(2000);

        const completions: any = await client.completion({
            textDocument: { uri },
            position: { line: 5, character: 10 },
        });

        expect(completions).toBeDefined();
        expect(completions?.items).toBeDefined();
        expect(completions.items.length).toBeGreaterThan(0);

        const labels = completions.items.map((item: any) => item.label);

        const allAreAwsTypes = labels.every((label: string) => label.startsWith('AWS::'));
        expect(allAreAwsTypes).toBe(true);

        expect(labels.length).toBeGreaterThan(10);

        await client.closeDocument({ textDocument: { uri } });
    });
});
