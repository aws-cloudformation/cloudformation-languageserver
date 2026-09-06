import { describe, it } from 'vitest';
import { DocumentType } from '../../../src/document/Document';
import { METADATA_CONTEXT_KEY } from '../../../src/schema/MetadataContextSchema';
import { CompletionExpectationBuilder, TemplateBuilder, TemplateScenario } from '../../utils/TemplateBuilder';

describe('Metadata.Context autocomplete in malformed templates', () => {
    it('completes template fields in a YAML valid island after an unrelated syntax error', async () => {
        const template = new TemplateBuilder(DocumentType.YAML);
        const scenario: TemplateScenario = {
            name: 'Malformed YAML template Context field',
            steps: [
                {
                    action: 'type',
                    position: { line: 0, character: 0 },
                    content: `AWSTemplateFormatVersion: '2010-09-09'
BrokenTopLevel
Metadata:
  ${METADATA_CONTEXT_KEY}:
    ar
Resources: {}
`,
                    verification: {
                        position: { line: 4, character: 6 },
                        expectation: CompletionExpectationBuilder.create().expectContainsItems(['arch']).build(),
                    },
                },
            ],
        };

        await template.executeScenario(scenario);
    });

    it('completes nested reference object fields in incomplete YAML', async () => {
        const template = new TemplateBuilder(DocumentType.YAML);
        const scenario: TemplateScenario = {
            name: 'Incomplete YAML Context ref object',
            steps: [
                {
                    action: 'type',
                    position: { line: 0, character: 0 },
                    content: `AWSTemplateFormatVersion: '2010-09-09'
Metadata:
  ${METADATA_CONTEXT_KEY}:
    ref:
      -
        a
Resources: {}
`,
                    verification: {
                        position: { line: 5, character: 9 },
                        expectation: CompletionExpectationBuilder.create().expectContainsItems(['at']).build(),
                    },
                },
            ],
        };

        await template.executeScenario(scenario);
    });

    it('completes resource trust fields in malformed YAML', async () => {
        const template = new TemplateBuilder(DocumentType.YAML);
        const scenario: TemplateScenario = {
            name: 'Malformed YAML resource Context trust',
            steps: [
                {
                    action: 'type',
                    position: { line: 0, character: 0 },
                    content: `Resources:
  OrderQueue:
    Type: AWS::SQS::Queue
    Metadata:
      ${METADATA_CONTEXT_KEY}:
        trust:
          s
BrokenTopLevel
`,
                    verification: {
                        position: { line: 6, character: 11 },
                        expectation: CompletionExpectationBuilder.create().expectContainsItems(['src']).build(),
                    },
                },
            ],
        };

        await template.executeScenario(scenario);
    });

    it('completes the full Context key from a quoted partial JSON key', async () => {
        const template = new TemplateBuilder(DocumentType.JSON);
        const scenario: TemplateScenario = {
            name: 'Malformed JSON partial Context key',
            steps: [
                {
                    action: 'type',
                    position: { line: 0, character: 0 },
                    content: `{
  "AWSTemplateFormatVersion": "2010-09-09",
  "Metadata": {
    "com"
  },
  "Resources": {}
}`,
                    verification: {
                        position: { line: 3, character: 8 },
                        expectation: CompletionExpectationBuilder.create()
                            .expectContainsItems([METADATA_CONTEXT_KEY])
                            .build(),
                    },
                },
            ],
        };

        await template.executeScenario(scenario);
    });

    it('completes template fields when JSON closing braces are missing', async () => {
        const template = new TemplateBuilder(DocumentType.JSON);
        const scenario: TemplateScenario = {
            name: 'Malformed JSON template Context field',
            steps: [
                {
                    action: 'type',
                    position: { line: 0, character: 0 },
                    content: `{
  "AWSTemplateFormatVersion": "2010-09-09",
  "Metadata": {
    "${METADATA_CONTEXT_KEY}": {
      "ar"`,
                    verification: {
                        position: { line: 4, character: 9 },
                        expectation: CompletionExpectationBuilder.create().expectContainsItems(['arch']).build(),
                    },
                },
            ],
        };

        await template.executeScenario(scenario);
    });

    it('completes nested trust fields when resource JSON closing braces are missing', async () => {
        const template = new TemplateBuilder(DocumentType.JSON);
        const scenario: TemplateScenario = {
            name: 'Malformed JSON resource Context trust field',
            steps: [
                {
                    action: 'type',
                    position: { line: 0, character: 0 },
                    content: `{
  "Resources": {
    "OrderQueue": {
      "Type": "AWS::SQS::Queue",
      "Metadata": {
        "${METADATA_CONTEXT_KEY}": {
          "trust": {
            "s"`,
                    verification: {
                        position: { line: 7, character: 14 },
                        expectation: CompletionExpectationBuilder.create().expectContainsItems(['src']).build(),
                    },
                },
            ],
        };

        await template.executeScenario(scenario);
    });

    it('completes enum values inside an otherwise incomplete JSON resource', async () => {
        const template = new TemplateBuilder(DocumentType.JSON);
        const scenario: TemplateScenario = {
            name: 'Malformed JSON resource Context enum',
            steps: [
                {
                    action: 'type',
                    position: { line: 0, character: 0 },
                    content: `{
  "Resources": {
    "OrderQueue": {
      "Type": "AWS::SQS::Queue",
      "Metadata": {
        "${METADATA_CONTEXT_KEY}": {
          "mutable": "rev"`,
                    verification: {
                        position: { line: 6, character: 26 },
                        expectation: CompletionExpectationBuilder.create()
                            .expectContainsItems(['review-required'])
                            .build(),
                    },
                },
            ],
        };

        await template.executeScenario(scenario);
    });

    it('does not provide Context completions at a wholly invalid JSON position', async () => {
        const template = new TemplateBuilder(DocumentType.JSON);
        const scenario: TemplateScenario = {
            name: 'Wholly invalid JSON completion boundary',
            steps: [
                {
                    action: 'type',
                    position: { line: 0, character: 0 },
                    content: `not valid json`,
                    verification: {
                        position: { line: 0, character: 7 },
                        expectation: CompletionExpectationBuilder.create().expectItems([]).build(),
                    },
                },
            ],
        };

        await template.executeScenario(scenario);
    });
});
