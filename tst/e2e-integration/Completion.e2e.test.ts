import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { LspClient, loadTemplate } from './LspClient';

describe('E2E-Integration: Completion', () => {
    let client: LspClient;

    beforeAll(async () => {
        client = new LspClient();
        await client.start();
    }, 30000);

    afterAll(async () => {
        await client.shutdown();
    });

    it('should provide resource type completions', async () => {
        const template = loadTemplate('simple.yaml');
        const uri = await client.openYamlTemplate(template);
        await client.waitForProcessing(2000);

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
        await client.waitForProcessing(2000);

        const completions = await client.completion({
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
