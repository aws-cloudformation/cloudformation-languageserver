import { describe, it } from 'vitest';
import { DocumentType } from '../../../src/document/Document';
import { CompletionExpectationBuilder, TemplateBuilder, TemplateScenario } from '../../utils/TemplateBuilder';

describe('Empty File Autocompletion', () => {
    describe('YAML Empty File', () => {
        const template = new TemplateBuilder(DocumentType.YAML);

        it('should provide CloudFormation keys on empty file', async () => {
            const scenario: TemplateScenario = {
                name: 'Empty YAML file completion',
                steps: [
                    {
                        action: 'initialize',
                        content: '',
                        verification: {
                            position: { line: 0, character: 0 },
                            expectation: CompletionExpectationBuilder.create()
                                .expectContainsItems(['Resources'])
                                .expectMinItems(1)
                                .build(),
                        },
                    },
                ],
            };
            await template.executeScenario(scenario);
        });

        it('should NOT provide completions for non-CloudFormation files', async () => {
            const scenario: TemplateScenario = {
                name: 'Non-CloudFormation YAML file',
                steps: [
                    {
                        action: 'initialize',
                        content: 'name: my-app\nversion: 1.0.0\nscripts:\n  build: npm run build',
                        verification: {
                            position: { line: 4, character: 0 },
                            expectation: CompletionExpectationBuilder.create().expectMaxItems(0).build(),
                        },
                    },
                ],
            };
            await template.executeScenario(scenario);
        });
    });
});
