import { describe, it } from 'vitest';
import { DocumentType } from '../../../src/document/Document';
import { HoverExpectationBuilder, TemplateBuilder, TemplateScenario } from '../../utils/TemplateBuilder';

describe('JSON SAM Transform Hover', () => {
    describe('With SAM Transform', () => {
        const template = new TemplateBuilder(DocumentType.JSON);

        it('should show SAM documentation URL for SAM resource types', () => {
            const scenario: TemplateScenario = {
                name: 'SAM resource hover with transform',
                steps: [
                    {
                        action: 'initialize',
                        content: `{
  "Transform": "AWS::Serverless-2016-10-31",
  "Resources": {
    "MyFunction": {
      "Type": "AWS::Serverless::Function"
    }
  }
}`,
                        verification: {
                            position: { line: 4, character: 25 },
                            expectation: HoverExpectationBuilder.create()
                                .expectContainsText(['Creates a Lambda function, IAM execution role'])
                                .expectContainsText(['sam-resource-function.html'])
                                .build(),
                        },
                    },
                    {
                        action: 'replace',
                        content: `,
      "Properties": {
        "Environment": {
          "Variables": {}
        }
      }`,
                        range: { start: { line: 4, character: 42 }, end: { line: 4, character: 42 } },
                        verification: {
                            position: { line: 6, character: 11 },
                            expectation: HoverExpectationBuilder.create().expectContainsText(['Variables']).build(),
                        },
                    },
                ],
            };
            void template.executeScenario(scenario);
        });
    });

    describe('Without SAM Transform', () => {
        const template = new TemplateBuilder(DocumentType.JSON);

        it('should not show SAM resources for hover', () => {
            const scenario: TemplateScenario = {
                name: 'No SAM resources without transform',
                steps: [
                    {
                        action: 'initialize',
                        content: `{
  "Resources": {
    "MyFunction": {
      "Type": "AWS::Lambda::Function"
    }
  }
}`,
                        verification: {
                            position: { line: 3, character: 25 },
                            expectation: HoverExpectationBuilder.create()
                                .expectContainsText(['creates a Lambda function'])
                                .expectExcludesText(['sam-resource'])
                                .build(),
                        },
                    },
                ],
            };
            void template.executeScenario(scenario);
        });
    });
});
