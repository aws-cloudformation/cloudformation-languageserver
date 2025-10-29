import { describe, it } from 'vitest';
import { DocumentType } from '../../../src/document/Document';
import { CompletionExpectationBuilder, TemplateBuilder, TemplateScenario } from '../../utils/TemplateBuilder';

describe('YAML Completion when using quotes', () => {
    const content = `Resources:
  Parameter:
    Type: AWS::SSM::Parameter
    Properties: {
      ""
    }`;

    it('Should autocomplete keys in nested json', async () => {
        const template = new TemplateBuilder(DocumentType.YAML);
        const scenario: TemplateScenario = {
            name: 'Get Keys with double quotes',
            steps: [
                {
                    action: 'type',
                    content: content,
                    position: { line: 4, character: 6 },
                    description: 'Empty key',
                    verification: {
                        position: { line: 4, character: 7 },
                        expectation: CompletionExpectationBuilder.create()
                            .expectContainsItems(['Value'])
                            .expectItemDetails({
                                Value: {
                                    textEdit: {
                                        newText: '"Value"',
                                    },
                                },
                            })
                            .build(),
                    },
                },
                {
                    action: 'type',
                    content: 'V',
                    position: { line: 4, character: 7 },
                    description: 'One letter provided',
                    verification: {
                        position: { line: 4, character: 8 },
                        expectation: CompletionExpectationBuilder.create()
                            .expectContainsItems(['Value'])
                            .expectItemDetails({
                                Value: {
                                    textEdit: {
                                        newText: '"Value"',
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

    it('Should autocomplete enums in nested json', async () => {
        const template = new TemplateBuilder(DocumentType.YAML);
        const scenario: TemplateScenario = {
            name: 'Get enum values with double quotes',
            steps: [
                {
                    action: 'type',
                    content: content,
                    position: { line: 0, character: 0 },
                    description: 'Build template',
                },
                {
                    action: 'type',
                    content: 'Type',
                    position: { line: 4, character: 7 },
                    description: 'Build key',
                },
                {
                    action: 'type',
                    content: ': ""',
                    position: { line: 4, character: 12 },
                    description: 'Empty quotes',
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
                {
                    action: 'type',
                    content: 'S',
                    position: { line: 4, character: 15 },
                    description: 'One character exists',
                    verification: {
                        position: { line: 4, character: 16 },
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
