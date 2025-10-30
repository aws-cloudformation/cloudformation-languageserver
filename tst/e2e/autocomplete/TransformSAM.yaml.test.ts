import { describe, it } from 'vitest';
import { DocumentType } from '../../../src/document/Document';
import { CompletionExpectationBuilder, TemplateBuilder, TemplateScenario } from '../../utils/TemplateBuilder';

describe('YAML SAM Transform Autocomplete', () => {
    describe('With SAM Transform', () => {
        const template = new TemplateBuilder(DocumentType.YAML);

        it('should provide SAM resource types', () => {
            const scenario: TemplateScenario = {
                name: 'SAM resource completion with transform',
                steps: [
                    {
                        action: 'initialize',
                        content: `Transform: AWS::Serverless-2016-10-31
Resources:
  MyFunction:
    Type: AWS::`,
                        verification: {
                            position: { line: 3, character: 15 },
                            expectation: CompletionExpectationBuilder.create()
                                .expectContainsItems(['AWS::Serverless::Function', 'AWS::Serverless::Api'])
                                .build(),
                        },
                    },
                ],
            };
            void template.executeScenario(scenario);
        });

        it('should provide SAM resource property completion', () => {
            const scenario: TemplateScenario = {
                name: 'SAM Function property completion',
                steps: [
                    {
                        action: 'initialize',
                        content: `Transform: AWS::Serverless-2016-10-31
Resources:
  MyFunction:
    Type: AWS::Serverless::Function
    Properties:
      `,
                        verification: {
                            position: { line: 5, character: 6 },
                            expectation: CompletionExpectationBuilder.create()
                                .expectContainsItems(['Runtime', 'Handler', 'CodeUri'])
                                .build(),
                        },
                    },
                    {
                        action: 'type',
                        content: `Environment:
        Variables:
          `,
                        position: { line: 5, character: 6 },
                        verification: {
                            position: { line: 7, character: 10 },
                            expectation: CompletionExpectationBuilder.create().expectContainsItems([]).build(),
                        },
                    },
                ],
            };
            void template.executeScenario(scenario);
        });
    });

    describe('Without SAM Transform', () => {
        const template = new TemplateBuilder(DocumentType.YAML);

        it('should exclude SAM resource types', () => {
            const scenario: TemplateScenario = {
                name: 'No SAM resources without transform',
                steps: [
                    {
                        action: 'initialize',
                        content: `Resources:
  MyResource:
    Type: AWS::`,
                        verification: {
                            position: { line: 2, character: 15 },
                            expectation: CompletionExpectationBuilder.create()
                                .expectExcludesItems(['AWS::Serverless::Function'])
                                .expectContainsItems(['AWS::Lambda::Function'])
                                .build(),
                        },
                    },
                ],
            };
            void template.executeScenario(scenario);
        });
    });
});
