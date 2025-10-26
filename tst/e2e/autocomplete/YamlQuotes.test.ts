import { describe, it } from 'vitest';
import { DocumentType } from '../../../src/document/Document';
import { CompletionExpectationBuilder, TemplateBuilder, TemplateScenario } from '../../utils/TemplateBuilder';

describe('YAML Completion when using quotes', () => {
    const content = `Resources:
  Parameter:
    Type: AWS::SSM::Parameter
    Properties:
      `;

    describe('Double quotes', () => {
        const template = new TemplateBuilder(DocumentType.YAML);

        it('Object Keys', async () => {
            const scenario: TemplateScenario = {
                name: 'Get Keys with double quotes',
                steps: [
                    {
                        action: 'initialize',
                        content: `${content}""`,
                        verification: {
                            position: { line: 4, character: 7 },
                            expectation: CompletionExpectationBuilder.create()
                                .expectContainsItems(['Type'])
                                .expectItemDetails({
                                    Type: {
                                        textEdit: {
                                            newText: '"Type"',
                                        },
                                    },
                                })
                                .build(),
                        },
                    },
                ],
            };
            await template.executeScenario(scenario);
        });

        it('Enum values', async () => {
            const scenario: TemplateScenario = {
                name: 'No empty lines Value property key',
                steps: [
                    {
                        action: 'initialize',
                        content: `${content}"Type": ""`,
                        verification: {
                            position: { line: 4, character: 15 },
                            expectation: CompletionExpectationBuilder.create()
                                .expectContainsItems(['String'])
                                .expectItemDetails({
                                    String: {
                                        textEdit: {
                                            newText: '"String"',
                                        },
                                    },
                                })
                                .build(),
                        },
                    },
                ],
            };
            await template.executeScenario(scenario);
        });
    });

    describe('Single quotes', () => {
        const template = new TemplateBuilder(DocumentType.YAML);

        it('Object keys', async () => {
            const scenario: TemplateScenario = {
                name: 'Get Keys with single quotes',
                steps: [
                    {
                        action: 'initialize',
                        content: `${content}''`,
                        verification: {
                            position: { line: 4, character: 7 },
                            expectation: CompletionExpectationBuilder.create()
                                .expectContainsItems(['Type'])
                                .expectItemDetails({
                                    Type: {
                                        textEdit: {
                                            newText: "'Type'",
                                        },
                                    },
                                })
                                .build(),
                        },
                    },
                ],
            };
            await template.executeScenario(scenario);
        });

        it('Enum values', async () => {
            const scenario: TemplateScenario = {
                name: 'Get enum values with single quotes',
                steps: [
                    {
                        action: 'initialize',
                        content: `${content}'Type': ''`,
                        verification: {
                            position: { line: 4, character: 15 },
                            expectation: CompletionExpectationBuilder.create()
                                .expectContainsItems(['String'])
                                .expectItemDetails({
                                    String: {
                                        textEdit: {
                                            newText: "'String'",
                                        },
                                    },
                                })
                                .build(),
                        },
                    },
                ],
            };
            await template.executeScenario(scenario);
        });
    });
});
