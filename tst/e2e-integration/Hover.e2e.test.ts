import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { LspClient, loadTemplate } from './LspClient';

describe('E2E-Integration: Hover', () => {
    let client: LspClient;

    beforeAll(async () => {
        client = new LspClient();
        await client.start();
    }, 30000);

    afterAll(async () => {
        await client.shutdown();
    });

    it('should provide hover documentation for resource type', async () => {
        const template = loadTemplate('simple.yaml');
        const uri = await client.openYamlTemplate(template);
        await client.waitForProcessing(2000);

        // Try hovering over the resource type value (after "Type: ")
        const hover = await client.hover({
            textDocument: { uri },
            position: { line: 3, character: 15 },
        });

        expect(hover).toBeDefined();

        expect(hover.contents).toBeDefined();

        // Extract content (can be string or MarkupContent)
        let content = '';
        if (typeof hover.contents === 'string') {
            content = hover.contents;
        } else if (Array.isArray(hover.contents)) {
            content = hover.contents.length > 0 ? JSON.stringify(hover.contents) : '';
        } else if (hover.contents && typeof hover.contents === 'object' && 'value' in hover.contents) {
            content = hover.contents.value;
        }

        if (content && content.length > 0) {
            expect(content.toLowerCase()).toMatch(/bucket|s3|storage|resource/);
        }

        await client.closeDocument({ textDocument: { uri } });
    });
});
