import { describe, it } from 'vitest';
import { DocumentType } from '../../../src/document/Document';
import { METADATA_CONTEXT_DOCUMENTATION_URL, METADATA_CONTEXT_KEY } from '../../../src/schema/MetadataContextSchema';
import { HoverExpectationBuilder, TemplateBuilder, TemplateScenario } from '../../utils/TemplateBuilder';

describe('Metadata.Context hover', () => {
    it('documents the template Context key in YAML', async () => {
        const template = new TemplateBuilder(DocumentType.YAML);
        const scenario: TemplateScenario = {
            name: 'Template Metadata.Context key hover',
            steps: [
                {
                    action: 'initialize',
                    content: `AWSTemplateFormatVersion: '2010-09-09'\nMetadata:\n  ${METADATA_CONTEXT_KEY}:\n    arch: producer -> queue -> worker\n`,
                    verification: {
                        position: { line: 2, character: 5 },
                        expectation: HoverExpectationBuilder.create()
                            .expectContainsText([
                                `### \`${METADATA_CONTEXT_KEY}\``,
                                'template-level',
                                `[Source Documentation](${METADATA_CONTEXT_DOCUMENTATION_URL})`,
                            ])
                            .build(),
                    },
                },
            ],
        };

        await template.executeScenario(scenario);
    });

    it('documents nested resource trust fields in YAML', async () => {
        const template = new TemplateBuilder(DocumentType.YAML);
        const scenario: TemplateScenario = {
            name: 'Resource Metadata.Context trust hover',
            steps: [
                {
                    action: 'initialize',
                    content: `Resources:\n  OrderQueue:\n    Type: AWS::SQS::Queue\n    Metadata:\n      ${METADATA_CONTEXT_KEY}:\n        trust:\n          src: authored\n          conf: high\n`,
                    verification: {
                        position: { line: 6, character: 12 },
                        expectation: HoverExpectationBuilder.create()
                            .expectContainsText([
                                'How this context was produced.',
                                '**Required:** Yes',
                                '**Allowed values:** `authored`, `comment`, `commit`, `infer`',
                            ])
                            .build(),
                    },
                },
            ],
        };

        await template.executeScenario(scenario);
    });

    it('documents resource mutability enum values in JSON', async () => {
        const template = new TemplateBuilder(DocumentType.JSON);
        const scenario: TemplateScenario = {
            name: 'Resource Metadata.Context mutable hover',
            steps: [
                {
                    action: 'initialize',
                    content: `{\n  "Resources": {\n    "OrderQueue": {\n      "Type": "AWS::SQS::Queue",\n      "Metadata": {\n        "${METADATA_CONTEXT_KEY}": {\n          "mutable": "review-required"\n        }\n      }\n    }\n  }\n}`,
                    verification: {
                        position: { line: 6, character: 13 },
                        expectation: HoverExpectationBuilder.create()
                            .expectContainsText([
                                'Default resource-level change-safety level.',
                                '`must-never-change`',
                                '`change-with-constraints`',
                                '`review-required`',
                                '`free-to-tune`',
                            ])
                            .build(),
                    },
                },
            ],
        };

        await template.executeScenario(scenario);
    });
});
