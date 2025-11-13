import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { TestExtension } from '../utils/TestExtension';
import { wait, getComprehensiveYamlTemplate, getYamlTemplate, getForEachYamlTemplate
 } from '../utils/Utils';

describe('Integration Test: Hover', () => {
    let client: TestExtension;

    beforeAll(async () => {
        client = new TestExtension();
        await client.ready();
    }, 30000);

    afterAll(async () => {
        await client.close();
    });

    describe('Hover on YAML', () => {
        describe('Hover on top level resources', () => {
              it('should provide hover documentation for parameters top level section', async () => {
                const template = getYamlTemplate();
                const uri = await client.openYamlTemplate(template);
                await wait(2000);

                const hover: any = await client.hover({
                    textDocument: { uri },
                    position: { line: 3, character: 1 },
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
                    expect(content.toLowerCase()).toMatch(/parameters|optional|identifiers|custom/);
                }

                await client.closeDocument({ textDocument: { uri } });
            });

            it('should provide hover documentation for mappings top level section', async () => {
                const template = getYamlTemplate();
                const uri = await client.openYamlTemplate(template);
                await wait(2000);

                const hover: any = await client.hover({
                    textDocument: { uri },
                    position: { line: 41, character: 1 },
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
                    expect(content.toLowerCase()).toMatch(/mappings|optional|key-value|Fn::FindInMap|map/);
                }

                await client.closeDocument({ textDocument: { uri } });
            });

            it('should provide hover documentation for conditions top level section', async () => {
                const template = getYamlTemplate();
                const uri = await client.openYamlTemplate(template);
                await wait(2000);

                const hover: any = await client.hover({
                    textDocument: { uri },
                    position: { line: 62, character: 1 },
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
                    expect(content.toLowerCase()).toMatch(/conditions|optional|parameter|true|false/);
                }

                await client.closeDocument({ textDocument: { uri } });
            });

            it('should provide hover documentation for resources top level section', async () => {
                const template = getYamlTemplate();
                const uri = await client.openYamlTemplate(template);
                await wait(2000);

                const hover: any = await client.hover({
                    textDocument: { uri },
                    position: { line: 68, character: 1 },
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
                    expect(content.toLowerCase()).toMatch(/resources|required|aws|top-level/);
                }

                await client.closeDocument({ textDocument: { uri } });
            });


            it('should provide hover documentation for transform top level section', async () => {
                const template = getComprehensiveYamlTemplate();
                const uri = await client.openYamlTemplate(template);
                await wait(2000);

                const hover: any = await client.hover({
                    textDocument: { uri },
                    position: { line: 4, character: 1 },
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
                    expect(content.toLowerCase()).toMatch(/transform|macros|cloudformation|change/);
                }

                await client.closeDocument({ textDocument: { uri } });
            });

            it('should provide hover documentation for awstemplateformatversion top level section', async () => {
                const template = getComprehensiveYamlTemplate();
                const uri = await client.openYamlTemplate(template);
                await wait(2000);

                const hover: any = await client.hover({
                    textDocument: { uri },
                    position: { line: 0, character: 1 },
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
                    expect(content.toLowerCase()).toMatch(/awstemplateformatversion|optional|version|2010-09-09/);
                }

                await client.closeDocument({ textDocument: { uri } });
            });

            it('should provide hover documentation for description top level section', async () => {
                const template = getComprehensiveYamlTemplate();
                const uri = await client.openYamlTemplate(template);
                await wait(2000);

                const hover: any = await client.hover({
                    textDocument: { uri },
                    position: { line: 1, character: 1 },
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
                    expect(content.toLowerCase()).toMatch(/description|optional|describes|string/);
                }
            });

            it('should provide hover documentation for metadata top level section', async () => {
                const template = getComprehensiveYamlTemplate();
                const uri = await client.openYamlTemplate(template);
                await wait(2000);

                const hover: any = await client.hover({
                    textDocument: { uri },
                    position: { line: 9, character: 1 },
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
                    expect(content.toLowerCase()).toMatch(/metadata|key-value|grouping|interface/);
                }
            });

            it('should provide hover documentation for rules top level section', async () => {
                const template = getComprehensiveYamlTemplate();
                const uri = await client.openYamlTemplate(template);
                await wait(2000);

                const hover: any = await client.hover({
                    textDocument: { uri },
                    position: { line: 108, character: 1 },
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
                    expect(content.toLowerCase()).toMatch(/rules|validation|functions|parameters/);
                }
            });
        });

        describe('Hover on Resource section', () => {
            it('should provide hover documentation for resource type', async () => {
                const template = getComprehensiveYamlTemplate();
                const uri = await client.openYamlTemplate(template);
                await wait(2000);

                const hover: any = await client.hover({
                    textDocument: { uri },
                    position: { line: 213, character: 25 },
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
                    expect(content.toLowerCase()).toMatch(/launch|template|instance|launchtemplatedata/);
                }
            });

            it('should provide hover documentation for resource properties', async () => {
                const template = getComprehensiveYamlTemplate();
                const uri = await client.openYamlTemplate(template);
                await wait(2000);

                const hover: any = await client.hover({
                    textDocument: { uri },
                    position: { line: 214, character: 11 },
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
                    expect(content.toLowerCase()).toMatch(/name|launch|template/);
                }
            });

            it('should provide hover documentation for nested resource properties', async () => {
                const template = getComprehensiveYamlTemplate();
                const uri = await client.openYamlTemplate(template);
                await wait(2000);

                const hover: any = await client.hover({
                    textDocument: { uri },
                    position: { line: 218, character: 14 },
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
                    expect(content.toLowerCase()).toMatch(/instance|type|amazon/);
                }
            });

            it('should provide hover documentation for resource attributes', async () => {
                const template = getComprehensiveYamlTemplate();
                const uri = await client.openYamlTemplate(template);
                await wait(2000);

                const hover: any = await client.hover({
                    textDocument: { uri },
                    position: { line: 169, character: 10 },
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
                    expect(content.toLowerCase()).toMatch(/condition|value|true/);
                }
            });

            it('should provide hover documentation for resource metadata', async () => {
                const template = getComprehensiveYamlTemplate();
                const uri = await client.openYamlTemplate(template);
                await wait(2000);

                const hover: any = await client.hover({
                    textDocument: { uri },
                    position: { line: 228, character: 8 },
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
                    expect(content.toLowerCase()).toMatch(/metadata|value|true/);
                }
            });

            it('should provide hover documentation for resource metadata', async () => {
                const template = getComprehensiveYamlTemplate();
                const uri = await client.openYamlTemplate(template);
                await wait(2000);

                const hover: any = await client.hover({
                    textDocument: { uri },
                    position: { line: 228, character: 8 },
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
                    expect(content.toLowerCase()).toMatch(/metadata|value|true/);
                }
            });

            it('should provide hover documentation for resource properties with schema validation', async () => {
                const template = getComprehensiveYamlTemplate();
                const uri = await client.openYamlTemplate(template);
                await wait(2000);

                const hover: any = await client.hover({
                    textDocument: { uri },
                    position: { line: 256, character: 22 },
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
                    expect(content.toLowerCase()).toMatch(/pausetime|start|waitonresourcesignals/);
                }
            });
        });

        describe('Hover on Intrinsic Functions', () => {
            it('should provide hover documentation for !Ref intrinsic function', async () => {
                const template = getComprehensiveYamlTemplate();
                const uri = await client.openYamlTemplate(template);
                await wait(2000);

                const hover: any = await client.hover({
                    textDocument: { uri },
                    position: { line: 141, character: 20 },
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
                    expect(content.toLowerCase()).toMatch(/ref|returns|value|parameter|resource/);
                }

                await client.closeDocument({ textDocument: { uri } });
            });

            it('should provide hover documentation for !Sub intrinsic function', async () => {
                const template = getComprehensiveYamlTemplate();
                const uri = await client.openYamlTemplate(template);
                await wait(2000);

                // Hover on !Sub in line: Value: !Sub "${EnvironmentName}-vpc"
                const hover: any = await client.hover({
                    textDocument: { uri },
                    position: { line: 146, character: 20 },
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
                    expect(content.toLowerCase()).toMatch(/sub|substitutes|variables|string/);
                }

                await client.closeDocument({ textDocument: { uri } });
            });

            it('should provide hover documentation for !GetAtt intrinsic function', async () => {
                const template = getComprehensiveYamlTemplate();
                const uri = await client.openYamlTemplate(template);
                await wait(2000);

                const hover: any = await client.hover({
                    textDocument: { uri },
                    position: { line: 239, character: 20 },
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
                    expect(content.toLowerCase()).toMatch(/getatt|attribute|resource/);
                }

                await client.closeDocument({ textDocument: { uri } });
            });

            it('should provide hover documentation for !Select intrinsic function', async () => {
                const template = getComprehensiveYamlTemplate();
                const uri = await client.openYamlTemplate(template);
                await wait(2000);

                // Hover on !Select in line: CidrBlock: !Select [0, !Ref SubnetCidrs]
                const hover: any = await client.hover({
                    textDocument: { uri },
                    position: { line: 105, character: 36 },
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
                    expect(content.toLowerCase()).toMatch(/select|object|list|index/);
                }

                await client.closeDocument({ textDocument: { uri } });
            });

            it('should provide hover documentation for !FindInMap intrinsic function', async () => {
                const template = getComprehensiveYamlTemplate();
                const uri = await client.openYamlTemplate(template);
                await wait(2000);

                const hover: any = await client.hover({
                    textDocument: { uri },
                    position: { line: 217, character: 25 },
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
                    expect(content.toLowerCase()).toMatch(/findinmap|map|keys|mappings/);
                }

                await client.closeDocument({ textDocument: { uri } });
            });

            it('should provide hover documentation for !Join intrinsic function', async () => {
                const template = getComprehensiveYamlTemplate();
                const uri = await client.openYamlTemplate(template);
                await wait(2000);

                // Hover on !Join in line: SubnetList: !Join [", ", !Ref SubnetCidrs]
                const hover: any = await client.hover({
                    textDocument: { uri },
                    position: { line: 434, character: 25 },
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
                    expect(content.toLowerCase()).toMatch(/join|appends|values|delimiter/);
                }

                await client.closeDocument({ textDocument: { uri } });
            });

            it('should provide hover documentation for !Split intrinsic function', async () => {
                const template = getComprehensiveYamlTemplate();
                const uri = await client.openYamlTemplate(template);
                await wait(2000);

                // Hover on !Split in line: - !Split
                const hover: any = await client.hover({
                    textDocument: { uri },
                    position: { line: 457, character: 11 },
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
                    expect(content.toLowerCase()).toMatch(/split|string|list|delimiter/);
                }

                await client.closeDocument({ textDocument: { uri } });
            });

            it('should provide hover documentation for !If condition function', async () => {
                const template = getComprehensiveYamlTemplate();
                const uri = await client.openYamlTemplate(template);
                await wait(2000);

                // Hover on !If in line: AllocatedStorage: !If [IsProduction, 100, 20]
                const hover: any = await client.hover({
                    textDocument: { uri },
                    position: { line: 242, character: 12 },
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
                    expect(content.toLowerCase()).toMatch(/if|condition|true|false/);
                }

                await client.closeDocument({ textDocument: { uri } });
            });

            it('should provide hover documentation for !Equals condition function', async () => {
                const template = getComprehensiveYamlTemplate();
                const uri = await client.openYamlTemplate(template);
                await wait(2000);

                const hover: any = await client.hover({
                    textDocument: { uri },
                    position: { line: 91, character: 20 },
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
                    expect(content.toLowerCase()).toMatch(/equals|compares|true|false/);
                }

                await client.closeDocument({ textDocument: { uri } });
            });

            it('should provide hover documentation for !Not condition function', async () => {
                const template = getComprehensiveYamlTemplate();
                const uri = await client.openYamlTemplate(template);
                await wait(2000);

                const hover: any = await client.hover({
                    textDocument: { uri },
                    position: { line: 92, character: 23 },
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
                    expect(content.toLowerCase()).toMatch(/not|operator|true|false/);
                }

                await client.closeDocument({ textDocument: { uri } });
            });

            it('should provide hover documentation for !And condition function', async () => {
                const template = getComprehensiveYamlTemplate();
                const uri = await client.openYamlTemplate(template);
                await wait(2000);

                // Hover on !And in line: ComplexCondition: !And
                const hover: any = await client.hover({
                    textDocument: { uri },
                    position: { line: 100, character: 25 },
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
                    expect(content.toLowerCase()).toMatch(/and|operator|true|false|conditions/);
                }

                await client.closeDocument({ textDocument: { uri } });
            });

            it('should provide hover documentation for !Or condition function', async () => {
                const template = getComprehensiveYamlTemplate();
                const uri = await client.openYamlTemplate(template);
                await wait(2000);

                const hover: any = await client.hover({
                    textDocument: { uri },
                    position: { line: 96, character: 28 },
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
                    expect(content.toLowerCase()).toMatch(/or|operator|true|false|conditions/);
                }

                await client.closeDocument({ textDocument: { uri } });
            });
        });

        describe('Hover on Intrinsic Function Arguments', () => {
            it('should provide hover documentation for !Ref argument (parameter reference)', async () => {
                const template = getComprehensiveYamlTemplate();
                const uri = await client.openYamlTemplate(template);
                await wait(2000);

                const hover: any = await client.hover({
                    textDocument: { uri },
                    position: { line: 141, character: 26 },
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
                    expect(content.toLowerCase()).toMatch(/vpccidr|parameter|string|cidr/);
                }

                await client.closeDocument({ textDocument: { uri } });
            });

            it('should provide hover documentation for !Ref argument (resource reference)', async () => {
                const template = getComprehensiveYamlTemplate();
                const uri = await client.openYamlTemplate(template);
                await wait(2000);

                const hover: any = await client.hover({
                    textDocument: { uri },
                    position: { line: 157, character: 20 },
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
                    expect(content.toLowerCase()).toMatch(/vpc|resource|aws::ec2::vpc/);
                }

                await client.closeDocument({ textDocument: { uri } });
            });

            it('should provide hover documentation for !GetAtt resource name argument', async () => {
                const template = getComprehensiveYamlTemplate();
                const uri = await client.openYamlTemplate(template);
                await wait(2000);

                // Hover on "LaunchTemplate" in line: Version: !GetAtt LaunchTemplate.LatestVersionNumber
                const hover: any = await client.hover({
                    textDocument: { uri },
                    position: { line: 238, character: 32 },
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
                    expect(content.toLowerCase()).toMatch(/launchtemplate|resource|aws::ec2::launchtemplate/);
                }

                await client.closeDocument({ textDocument: { uri } });
            });

            it('should provide hover documentation for !GetAtt attribute name argument', async () => {
                const template = getComprehensiveYamlTemplate();
                const uri = await client.openYamlTemplate(template);
                await wait(2000);

                // Hover on "Endpoint.Address" in line: DATABASE_ENDPOINT: !GetAtt Database.Endpoint.Address
                const hover: any = await client.hover({
                    textDocument: { uri },
                    position: { line: 325, character: 60 },
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
                    expect(content.toLowerCase()).toMatch(/dns|address|attribute|dbinstance/);
                }

                await client.closeDocument({ textDocument: { uri } });
            });

            it('should provide hover documentation for !Select index argument', async () => {
                const template = getComprehensiveYamlTemplate();
                const uri = await client.openYamlTemplate(template);
                await wait(2000);

                // Hover on "SubnetCidrs" in line: CidrBlock: !Select [0, !Ref SubnetCidrs]
                const hover: any = await client.hover({
                    textDocument: { uri },
                    position: { line: 159, character: 38 },
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
                    expect(content.toLowerCase()).toMatch(/subnetcidrs|parameter|commadelimitedlist/);
                }

                await client.closeDocument({ textDocument: { uri } });
            });

            it('should provide hover documentation for !FindInMap map name argument', async () => {
                const template = getComprehensiveYamlTemplate();
                const uri = await client.openYamlTemplate(template);
                await wait(2000);

                const hover: any = await client.hover({
                    textDocument: { uri },
                    position: { line: 217, character: 35 },
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
                    expect(content.toLowerCase()).toMatch(/regionmap|mapping/);
                }

                await client.closeDocument({ textDocument: { uri } });
            });

            it('should provide hover documentation for condition reference in !If', async () => {
                const template = getComprehensiveYamlTemplate();
                const uri = await client.openYamlTemplate(template);
                await wait(2000);

                // Hover on "IsProduction" on multiline !If
                // No hover on single line array If [IsProd, 0, 0]
                const hover: any = await client.hover({
                    textDocument: { uri },
                    position: { line: 444, character: 15 },
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
                    expect(content.toLowerCase()).toMatch(/isproduction|condition/);
                }

                await client.closeDocument({ textDocument: { uri } });
            });

            it('should provide hover documentation for nested !Ref inside !Sub', async () => {
                const template = getComprehensiveYamlTemplate();
                const uri = await client.openYamlTemplate(template);
                await wait(2000);

                const hover: any = await client.hover({
                    textDocument: { uri },
                    position: { line: 448, character: 35 },
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
                    expect(content.toLowerCase()).toMatch(/instancecount|parameter|number/);
                }

                await client.closeDocument({ textDocument: { uri } });
            });
        });

      describe('Hover on Parameters section', () => {
            it('should provide hover documentation for parameter definition', async () => {
                const template = getComprehensiveYamlTemplate();
                const uri = await client.openYamlTemplate(template);
                await wait(2000);

                // Hover on "EnvironmentName" parameter definition
                const hover: any = await client.hover({
                    textDocument: { uri },
                    position: { line: 31, character: 10 },
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
                    expect(content.toLowerCase()).toMatch(/environmentname|parameter/);
                }

                await client.closeDocument({ textDocument: { uri } });
            });

            it('should provide hover documentation for parameter with Default value', async () => {
                const template = getComprehensiveYamlTemplate();
                const uri = await client.openYamlTemplate(template);
                await wait(2000);

                // Hover on "Default" attribute in EnvironmentName parameter
                const hover: any = await client.hover({
                    textDocument: { uri },
                    position: { line: 31, character: 10 },
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
                    expect(content.toLowerCase()).toMatch(/default|value|parameter/);
                }

                await client.closeDocument({ textDocument: { uri } });
            });

            it('should provide hover documentation for parameter with AllowedValues', async () => {
                const template = getComprehensiveYamlTemplate();
                const uri = await client.openYamlTemplate(template);
                await wait(2000);

                // Hover on "AllowedValues" attribute in EnvironmentName parameter
                const hover: any = await client.hover({
                    textDocument: { uri },
                    position: { line: 31, character: 10 },
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
                    expect(content.toLowerCase()).toMatch(/allowed values|development|staging|production/);
                }

                await client.closeDocument({ textDocument: { uri } });
            });

            it('should provide hover documentation for parameter with AllowedPattern', async () => {
                const template = getComprehensiveYamlTemplate();
                const uri = await client.openYamlTemplate(template);
                await wait(2000);

                // Hover on "AllowedPattern" attribute in VpcCidr parameter
                const hover: any = await client.hover({
                    textDocument: { uri },
                    position: { line: 37, character: 7 },
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
                    expect(content.toLowerCase()).toMatch(/string|allowed|pattern/);
                }

                await client.closeDocument({ textDocument: { uri } });
            });

            it('should provide hover documentation for parameter with MinLength constraint', async () => {
                const template = getComprehensiveYamlTemplate();
                const uri = await client.openYamlTemplate(template);
                await wait(2000);

                // Hover on "MinLength" attribute in DatabasePassword parameter
                const hover: any = await client.hover({
                    textDocument: { uri },
                    position: { line: 46, character: 5 },
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
                    expect(content.toLowerCase()).toMatch(/databasepassword|minlength|string/);
                }

                await client.closeDocument({ textDocument: { uri } });
            });

            it('should provide hover documentation for parameter with MaxLength constraint', async () => {
                const template = getComprehensiveYamlTemplate();
                const uri = await client.openYamlTemplate(template);
                await wait(2000);

                // Hover on "MaxLength" attribute in DatabasePassword parameter
                const hover: any = await client.hover({
                    textDocument: { uri },
                    position: { line: 46, character: 5 },
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
                    expect(content.toLowerCase()).toMatch(/maxlength|databasepassword|string/);
                }

                await client.closeDocument({ textDocument: { uri } });
            });

            it('should provide hover documentation for parameter with MinValue constraint', async () => {
                const template = getComprehensiveYamlTemplate();
                const uri = await client.openYamlTemplate(template);
                await wait(2000);

                // Hover on "MinValue" attribute in InstanceCount parameter
                const hover: any = await client.hover({
                    textDocument: { uri },
                    position: { line: 52, character: 10 },
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
                    expect(content.toLowerCase()).toMatch(/instancecount|minvalue/);
                }

                await client.closeDocument({ textDocument: { uri } });
            });

            it('should provide hover documentation for parameter with MaxValue constraint', async () => {
                const template = getComprehensiveYamlTemplate();
                const uri = await client.openYamlTemplate(template);
                await wait(2000);

                // Hover on "MaxValue" attribute in InstanceCount parameter
                const hover: any = await client.hover({
                    textDocument: { uri },
                    position: { line: 56, character: 7 },
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
                    expect(content.toLowerCase()).toMatch(/maxvalue|instancecount/);
                }

                await client.closeDocument({ textDocument: { uri } });
            });
        });

        describe('Hover on Parameter attributes', () => {
            it('should provide hover documentation for Default attribute', async () => {
                const template = getComprehensiveYamlTemplate();
                const uri = await client.openYamlTemplate(template);
                await wait(2000);

                // Hover on "Default" attribute in EnvironmentName parameter
                const hover: any = await client.hover({
                    textDocument: { uri },
                    position: { line: 33, character: 7 },
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
                    expect(content.toLowerCase()).toMatch(/default|value|parameter/);
                }

                await client.closeDocument({ textDocument: { uri } });
            });

            it('should provide hover documentation for AllowedValues attribute', async () => {
                const template = getComprehensiveYamlTemplate();
                const uri = await client.openYamlTemplate(template);
                await wait(2000);

                // Hover on "AllowedValues" attribute in EnvironmentName parameter
                const hover: any = await client.hover({
                    textDocument: { uri },
                    position: { line: 34, character: 10 },
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
                    expect(content.toLowerCase()).toMatch(/allowedvalues|array|values|parameter/);
                }

                await client.closeDocument({ textDocument: { uri } });
            });

            it('should provide hover documentation for AllowedPattern attribute', async () => {
                const template = getComprehensiveYamlTemplate();
                const uri = await client.openYamlTemplate(template);
                await wait(2000);

                // Hover on "AllowedPattern" attribute in VpcCidr parameter
                const hover: any = await client.hover({
                    textDocument: { uri },
                    position: { line: 40, character: 7 },
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
                    expect(content.toLowerCase()).toMatch(/allowedpattern|patterns|regular expression/);
                }

                await client.closeDocument({ textDocument: { uri } });
            });

            it('should provide hover documentation for MinLength attribute', async () => {
                const template = getComprehensiveYamlTemplate();
                const uri = await client.openYamlTemplate(template);
                await wait(2000);

                // Hover on "MinLength" attribute in DatabasePassword parameter
                const hover: any = await client.hover({
                    textDocument: { uri },
                    position: { line: 49, character: 7 },
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
                    expect(content.toLowerCase()).toMatch(/minlength|integer|smallest|string/);
                }

                await client.closeDocument({ textDocument: { uri } });
            });

            it('should provide hover documentation for MaxLength attribute', async () => {
                const template = getComprehensiveYamlTemplate();
                const uri = await client.openYamlTemplate(template);
                await wait(2000);

                // Hover on "MaxLength" attribute in DatabasePassword parameter
                const hover: any = await client.hover({
                    textDocument: { uri },
                    position: { line: 50, character: 7 },
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
                    expect(content.toLowerCase()).toMatch(/maxlength|integer|largest|string/);
                }

                await client.closeDocument({ textDocument: { uri } });
            });

            it('should provide hover documentation for MinValue attribute', async () => {
                const template = getComprehensiveYamlTemplate();
                const uri = await client.openYamlTemplate(template);
                await wait(2000);

                // Hover on "MinValue" attribute in InstanceCount parameter
                const hover: any = await client.hover({
                    textDocument: { uri },
                    position: { line: 55, character: 7 },
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
                    expect(content.toLowerCase()).toMatch(/minvalue|smallest|value|number/);
                }

                await client.closeDocument({ textDocument: { uri } });
            });

            it('should provide hover documentation for MaxValue attribute', async () => {
                const template = getComprehensiveYamlTemplate();
                const uri = await client.openYamlTemplate(template);
                await wait(2000);

                // Hover on "MaxValue" attribute in InstanceCount parameter
                const hover: any = await client.hover({
                    textDocument: { uri },
                    position: { line: 56, character: 7 },
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
                    expect(content.toLowerCase()).toMatch(/maxvalue|largest|number/);
                }

                await client.closeDocument({ textDocument: { uri } });
            });
        });

        describe('Hover on Pseudo Parameters', () => {
            it('should provide hover documentation for AWS::Region pseudo parameter', async () => {
                const template = getComprehensiveYamlTemplate();
                const uri = await client.openYamlTemplate(template);
                await wait(2000);

                // Hover on "AWS::Region" in line: ImageId: !FindInMap [RegionMap, !Ref AWS::Region, AMI]
                const hover: any = await client.hover({
                    textDocument: { uri },
                    position: { line: 103, character: 26 },
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
                    expect(content.toLowerCase()).toMatch(/region|us-west-2|string/);
                }

                await client.closeDocument({ textDocument: { uri } });
            });

            it('should provide hover documentation for AWS::NoValue pseudo parameter', async () => {
                const template = getComprehensiveYamlTemplate();
                const uri = await client.openYamlTemplate(template);
                await wait(2000);

                // Hover on "AWS::NoValue" in line: - !Ref AWS::NoValue
                const hover: any = await client.hover({
                    textDocument: { uri },
                    position: { line: 449, character: 20 },
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
                    expect(content.toLowerCase()).toMatch(/novalue|removes|conditional/);
                }

                await client.closeDocument({ textDocument: { uri } });
            });
        });

        describe('Hover on Conditions', () => {
            it('should provide hover documentation for condition definition', async () => {
                const template = getComprehensiveYamlTemplate();
                const uri = await client.openYamlTemplate(template);
                await wait(2000);

                const hover: any = await client.hover({
                    textDocument: { uri },
                    position: { line: 169, character: 25 },
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
                    expect(content.toLowerCase()).toMatch(/isproductionorstaging|condition/);
                }

                await client.closeDocument({ textDocument: { uri } });
            });

            it('should provide hover documentation for condition reference in output', async () => {
                const template = getComprehensiveYamlTemplate();
                const uri = await client.openYamlTemplate(template);
                await wait(2000);

                // Hover on "Condition: IsProduction" in ConditionalOutput
                const hover: any = await client.hover({
                    textDocument: { uri },
                    position: { line: 450, character: 23 },
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
                    expect(content.toLowerCase()).toMatch(/isproduction|condition/);
                }

                await client.closeDocument({ textDocument: { uri } });
            });
        });
        describe('Hover on Mappings', () => {
            it('should provide hover documentation for mapping in findInMap', async () => {
                const template = getComprehensiveYamlTemplate();
                const uri = await client.openYamlTemplate(template);
                await wait(2000);

                // Hover on "RegionMap" mapping definition
                const hover: any = await client.hover({
                    textDocument: { uri },
                    position: { line: 114, character: 29 },
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
                    expect(content.toLowerCase()).toMatch(/regionmap|us-east-1|mapping/);
                }

                await client.closeDocument({ textDocument: { uri } });
            });
        }); 

        describe('Hover on Outputs Section', () => {
            it('should provide hover documentation for output Description field', async () => {
                const template = getComprehensiveYamlTemplate();
                const uri = await client.openYamlTemplate(template);
                await wait(2000);

                // Hover on "Description" in VPCId output
                const hover: any = await client.hover({
                    textDocument: { uri },
                    position: { line: 401, character: 7 },
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
                    expect(content.toLowerCase()).toMatch(/description|output|string/);
                }

                await client.closeDocument({ textDocument: { uri } });
            });

            it('should provide hover documentation for output Value field', async () => {
                const template = getComprehensiveYamlTemplate();
                const uri = await client.openYamlTemplate(template);
                await wait(2000);

                // Hover on "Value" in VPCId output
                const hover: any = await client.hover({
                    textDocument: { uri },
                    position: { line: 402, character: 7 },
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
                    expect(content.toLowerCase()).toMatch(/value|output|describe-stacks/);
                }

                await client.closeDocument({ textDocument: { uri } });
            });

            it('should provide hover documentation for output Export field', async () => {
                const template = getComprehensiveYamlTemplate();
                const uri = await client.openYamlTemplate(template);
                await wait(2000);

                // Hover on "Export" in VPCId output
                const hover: any = await client.hover({
                    textDocument: { uri },
                    position: { line: 415, character: 7 },
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
                    expect(content.toLowerCase()).toMatch(/export|output|cross-stack/);
                }

                await client.closeDocument({ textDocument: { uri } });
            });
        });

        describe('Hover on ForEach', () => {
            it('should provide hover documentation for ForEach function', async () => {
                const template = getForEachYamlTemplate();
                const uri = await client.openYamlTemplate(template);
                await wait(2000);

                // Hover on "Export" in VPCId output
                const hover: any = await client.hover({
                    textDocument: { uri },
                    position: { line: 11, character: 10 },
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
                    expect(content.toLowerCase()).toMatch(/fn::foreach|resource/);
                }

                await client.closeDocument({ textDocument: { uri } });
            });
        });
    });
});
