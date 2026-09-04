import { describe, it } from 'vitest';
import { METADATA_CONTEXT_KEY } from '../../../src/schema/MetadataContextSchema';
import { DocumentType } from '../../../src/document/Document';
import { CompletionExpectationBuilder, TemplateBuilder, TemplateScenario } from '../../utils/TemplateBuilder';

describe('Metadata.Context autocomplete', () => {
    it('completes the full Context key and template fields in YAML', async () => {
        const template = new TemplateBuilder(DocumentType.YAML);
        const scenario: TemplateScenario = {
            name: 'Template Metadata.Context YAML completions',
            steps: [
                {
                    action: 'initialize',
                    content: `Metadata:\n  c`,
                    verification: {
                        position: { line: 1, character: 3 },
                        expectation: CompletionExpectationBuilder.create()
                            .expectContainsItems([METADATA_CONTEXT_KEY])
                            .build(),
                    },
                },
                {
                    action: 'replace',
                    content: `Metadata:\n  ${METADATA_CONTEXT_KEY}:\n    `,
                    range: { start: { line: 0, character: 0 }, end: { line: 1, character: 3 } },
                    verification: {
                        position: { line: 2, character: 4 },
                        expectation: CompletionExpectationBuilder.create()
                            .expectContainsItems(['arch', 'must', 'ref', 'owner'])
                            .build(),
                    },
                },
            ],
        };

        await template.executeScenario(scenario);
    });

    it('completes resource fields, nested trust fields, and enums in YAML', async () => {
        const template = new TemplateBuilder(DocumentType.YAML);
        const scenario: TemplateScenario = {
            name: 'Resource Metadata.Context YAML completions',
            steps: [
                {
                    action: 'initialize',
                    content: `Resources:\n  OrderQueue:\n    Type: AWS::SQS::Queue\n    Metadata:\n      ${METADATA_CONTEXT_KEY}:\n        `,
                    verification: {
                        position: { line: 5, character: 8 },
                        expectation: CompletionExpectationBuilder.create()
                            .expectContainsItems(['why', 'must', 'mutable', 'mutability', 'trust', 'deps'])
                            .build(),
                    },
                },
                {
                    action: 'replace',
                    content: `        mutable: `,
                    range: { start: { line: 5, character: 0 }, end: { line: 5, character: 8 } },
                    verification: {
                        position: { line: 5, character: 17 },
                        expectation: CompletionExpectationBuilder.create()
                            .expectContainsItems([
                                'must-never-change',
                                'change-with-constraints',
                                'review-required',
                                'free-to-tune',
                            ])
                            .build(),
                    },
                },
                {
                    action: 'replace',
                    content: `        trust:\n          `,
                    range: { start: { line: 5, character: 0 }, end: { line: 5, character: 17 } },
                    verification: {
                        position: { line: 6, character: 10 },
                        expectation: CompletionExpectationBuilder.create()
                            .expectContainsItems(['src', 'conf', 'cite', 'note'])
                            .build(),
                    },
                },
                {
                    action: 'replace',
                    content: `          src: `,
                    range: { start: { line: 6, character: 0 }, end: { line: 6, character: 10 } },
                    verification: {
                        position: { line: 6, character: 15 },
                        expectation: CompletionExpectationBuilder.create()
                            .expectContainsItems(['authored', 'comment', 'commit', 'infer'])
                            .build(),
                    },
                },
            ],
        };

        await template.executeScenario(scenario);
    });

    it('completes template fields and resource enum values in JSON', async () => {
        const template = new TemplateBuilder(DocumentType.JSON);
        const scenario: TemplateScenario = {
            name: 'Metadata.Context JSON completions',
            steps: [
                {
                    action: 'initialize',
                    content: `{\n  "Metadata": {\n    "${METADATA_CONTEXT_KEY}": {\n      ""\n    }\n  }\n}`,
                    verification: {
                        position: { line: 3, character: 7 },
                        expectation: CompletionExpectationBuilder.create()
                            .expectContainsItems(['arch', 'must', 'ref', 'owner'])
                            .build(),
                    },
                },
                {
                    action: 'replace',
                    content: `{\n  "Resources": {\n    "OrderQueue": {\n      "Type": "AWS::SQS::Queue",\n      "Metadata": {\n        "${METADATA_CONTEXT_KEY}": {\n          "mutable": ""\n        }\n      }\n    }\n  }\n}`,
                    range: { start: { line: 0, character: 0 }, end: { line: 6, character: 1 } },
                    verification: {
                        position: { line: 6, character: 22 },
                        expectation: CompletionExpectationBuilder.create()
                            .expectContainsItems([
                                'must-never-change',
                                'change-with-constraints',
                                'review-required',
                                'free-to-tune',
                            ])
                            .build(),
                    },
                },
            ],
        };

        await template.executeScenario(scenario);
    });

    it('filters the existing Context key and authored fields in YAML', async () => {
        const template = new TemplateBuilder(DocumentType.YAML);
        const scenario: TemplateScenario = {
            name: 'Metadata.Context duplicate filtering',
            steps: [
                {
                    action: 'initialize',
                    content: `AWSTemplateFormatVersion: '2010-09-09'\nMetadata:\n  ${METADATA_CONTEXT_KEY}:\n    arch: queue -> worker\n    \nResources: {}\n`,
                    verification: {
                        position: { line: 4, character: 4 },
                        expectation: CompletionExpectationBuilder.create()
                            .expectContainsItems(['must', 'ref', 'owner'])
                            .expectExcludesItems(['arch'])
                            .build(),
                    },
                },
                {
                    action: 'replace',
                    content: `  c`,
                    range: { start: { line: 4, character: 0 }, end: { line: 4, character: 4 } },
                    verification: {
                        position: { line: 4, character: 3 },
                        expectation: CompletionExpectationBuilder.create()
                            .expectExcludesItems([METADATA_CONTEXT_KEY])
                            .build(),
                    },
                },
            ],
        };

        await template.executeScenario(scenario);
    });
});
