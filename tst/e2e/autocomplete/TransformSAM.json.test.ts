import { describe, it } from 'vitest';
import { DocumentType } from '../../../src/document/Document';
import { CompletionExpectationBuilder, TemplateBuilder, TemplateScenario } from '../../utils/TemplateBuilder';

describe('JSON SAM Transform Autocomplete', () => {
    describe('With SAM Transform', () => {
        const template = new TemplateBuilder(DocumentType.JSON);

        it('should provide SAM resource types', () => {
            const scenario: TemplateScenario = {
                name: 'SAM resource completion with transform',
                steps: [
                    {
                        action: 'initialize',
                        content: `{
  "Transform": "AWS::Serverless-2016-10-31",
  "Resources": {
    "MyFunction": {
      "Type": "AWS::"
    }
  }
}`,
                        verification: {
                            position: { line: 4, character: 20 },
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
                        content: `{
  "Transform": "AWS::Serverless-2016-10-31",
  "Resources": {
    "MyFunction": {
      "Type": "AWS::Serverless::Function",
      "Properties": {
        ""
      }
    }
  }
}`,
                        verification: {
                            position: { line: 6, character: 9 },
                            expectation: CompletionExpectationBuilder.create()
                                .expectContainsItems(['Runtime', 'Handler', 'CodeUri'])
                                .build(),
                        },
                    },
                    {
                        action: 'replace',
                        content: `"Environment": {
          ""
        }`,
                        range: { start: { line: 6, character: 8 }, end: { line: 6, character: 10 } },
                        verification: {
                            position: { line: 7, character: 11 },
                            expectation: CompletionExpectationBuilder.create()
                                .expectContainsItems(['Variables'])
                                .build(),
                        },
                    },
                ],
            };
            void template.executeScenario(scenario);
        });
    });

    describe('Without SAM Transform', () => {
        const template = new TemplateBuilder(DocumentType.JSON);

        it('should exclude SAM resource types', () => {
            const scenario: TemplateScenario = {
                name: 'No SAM resources without transform',
                steps: [
                    {
                        action: 'initialize',
                        content: `{
  "Resources": {
    "MyResource": {
      "Type": "AWS::"
    }
  }
}`,
                        verification: {
                            position: { line: 3, character: 20 },
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
