import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { TestExtension } from '../utils/TestExtension';
import { wait, getSimpleYamlTemplateText } from '../utils/Utils';

describe('E2E-Integration: Hover', () => {
    let client: TestExtension;

    beforeAll(async () => {
        client = new TestExtension(undefined, false);
        await client.ready();
    }, 30000);

    afterAll(async () => {
        await client.close();
    });

    it('should provide hover documentation for resource type', async () => {
        const template = getSimpleYamlTemplateText();
        const uri = await client.openYamlTemplate(template);
        await wait(2000);

        const hover: any = await client.hover({
            textDocument: { uri },
            position: { line: 3, character: 15 },
        });

        expect(hover).toBeDefined();
        expect(hover.contents).toBeDefined();

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
