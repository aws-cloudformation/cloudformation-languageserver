import { describe, it } from 'vitest';
import { DocumentType } from '../../../src/document/Document';
import { METADATA_CONTEXT_KEY } from '../../../src/schema/MetadataContextSchema';
import { HoverExpectationBuilder, TemplateBuilder, TemplateScenario } from '../../utils/TemplateBuilder';

describe('Metadata.Context hover in malformed templates', () => {
    it('documents a template field in a YAML valid island after an unrelated syntax error', async () => {
        const template = new TemplateBuilder(DocumentType.YAML);
        const scenario: TemplateScenario = {
            name: 'Malformed YAML template Context hover',
            steps: [
                {
                    action: 'type',
                    position: { line: 0, character: 0 },
                    content: `AWSTemplateFormatVersion: '2010-09-09'
BrokenTopLevel
Metadata:
  ${METADATA_CONTEXT_KEY}:
    arch: queue -> worker
Resources: {}
`,
                    verification: {
                        position: { line: 4, character: 6 },
                        expectation: HoverExpectationBuilder.create()
                            .expectContainsText(['High-level shape or pattern of the system.', '**Type:** `string`'])
                            .build(),
                    },
                },
            ],
        };

        await template.executeScenario(scenario);
    });

    it('documents a resource trust field in malformed YAML', async () => {
        const template = new TemplateBuilder(DocumentType.YAML);
        const scenario: TemplateScenario = {
            name: 'Malformed YAML resource Context hover',
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
          src: authored
BrokenTopLevel
`,
                    verification: {
                        position: { line: 6, character: 12 },
                        expectation: HoverExpectationBuilder.create()
                            .expectContainsText([
                                'How this context was produced.',
                                '**Allowed values:** `authored`, `comment`, `commit`, `infer`',
                            ])
                            .build(),
                    },
                },
            ],
        };

        await template.executeScenario(scenario);
    });

    it('documents a template field when JSON closing braces are missing', async () => {
        const template = new TemplateBuilder(DocumentType.JSON);
        const scenario: TemplateScenario = {
            name: 'Malformed JSON template Context hover',
            steps: [
                {
                    action: 'type',
                    position: { line: 0, character: 0 },
                    content: `{
  "AWSTemplateFormatVersion": "2010-09-09",
  "Metadata": {
    "${METADATA_CONTEXT_KEY}": {
      "arch": "queue -> worker"`,
                    verification: {
                        position: { line: 4, character: 9 },
                        expectation: HoverExpectationBuilder.create()
                            .expectContainsText(['High-level shape or pattern of the system.', '**Type:** `string`'])
                            .build(),
                    },
                },
            ],
        };

        await template.executeScenario(scenario);
    });

    it('documents a resource enum field when JSON closing braces are missing', async () => {
        const template = new TemplateBuilder(DocumentType.JSON);
        const scenario: TemplateScenario = {
            name: 'Malformed JSON resource Context hover',
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
          "mutable": "review-required"`,
                    verification: {
                        position: { line: 6, character: 13 },
                        expectation: HoverExpectationBuilder.create()
                            .expectContainsText(['Default resource-level change-safety level.', '`review-required`'])
                            .build(),
                    },
                },
            ],
        };

        await template.executeScenario(scenario);
    });

    it('does not provide Context hover at a wholly invalid JSON position', async () => {
        const template = new TemplateBuilder(DocumentType.JSON);
        const scenario: TemplateScenario = {
            name: 'Wholly invalid JSON hover boundary',
            steps: [
                {
                    action: 'type',
                    position: { line: 0, character: 0 },
                    content: `not valid json`,
                    verification: {
                        position: { line: 0, character: 7 },
                        expectation: HoverExpectationBuilder.create().expectUndefined().build(),
                    },
                },
            ],
        };

        await template.executeScenario(scenario);
    });
});
