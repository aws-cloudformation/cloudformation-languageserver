import { describe, it } from 'vitest';
import { Range } from 'vscode-languageserver-textdocument';
import { DocumentType } from '../../../src/document/Document';
import {
    METADATA_CONTEXT_KEY,
    MUTABILITY_LEVELS,
    TRUST_CONFIDENCE_LEVELS,
    TRUST_SOURCES,
} from '../../../src/schema/MetadataContextSchema';
import { CompletionExpectationBuilder, TemplateBuilder, TemplateScenario } from '../../utils/TemplateBuilder';
import { positionOfText, Templates } from '../../utils/TemplateUtils';

/**
 * Completion is exercised by editing the fixture in place: a value is blanked out (or a key truncated) and completion
 * is requested at the edited position. Each case describes the edit format-independently; `keySyntax` and
 * `blankValue` translate it for YAML and JSON.
 */
type CompletionCase = {
    name: string;
    /** Key whose value (or which itself) is edited, found by its key syntax. */
    key: string;
    occurrence?: number;
    /** The literal value currently in the fixture that gets replaced. Omit to edit the key itself. */
    value?: string;
    /** Text typed in place of the value (or key). */
    replacement?: string;
    expectContains?: string[];
    expectExcludes?: string[];
    expectExact?: string[];
};

const completionCases: CompletionCase[] = [
    {
        name: 'offers every mutability level for an empty mutable value',
        key: 'mutable',
        value: 'change-with-constraints',
        expectExact: [...MUTABILITY_LEVELS],
    },
    {
        name: 'offers every mutability level for a mutability override value',
        key: 'QueueName',
        value: 'must-never-change',
        expectExact: [...MUTABILITY_LEVELS],
    },
    {
        name: 'offers trust sources for an empty src value',
        key: 'src',
        value: 'authored',
        expectExact: [...TRUST_SOURCES],
    },
    {
        name: 'offers trust confidence levels for an empty conf value',
        key: 'conf',
        value: 'high',
        expectExact: [...TRUST_CONFIDENCE_LEVELS],
    },
    {
        name: 'narrows enum values to fuzzy matches of the typed text',
        key: 'mutable',
        value: 'change-with-constraints',
        replacement: 'free',
        expectContains: ['free-to-tune'],
        expectExcludes: ['must-never-change', 'change-with-constraints'],
    },
    {
        name: 'offers the remaining template-level fields when typing a new key',
        key: 'owner',
        replacement: 'o',
        expectContains: ['owner'],
        expectExcludes: ['arch', 'must', 'ref', 'why', 'mutable', 'trust'],
    },
    {
        name: 'offers the remaining resource-level fields when typing a new key',
        key: 'why',
        replacement: 'w',
        expectContains: ['why'],
        expectExcludes: ['must', 'mutable', 'mutability', 'trust', 'deps', 'arch', 'owner'],
    },
    {
        name: 'offers the remaining trust fields when typing a new key',
        key: 'cite',
        replacement: 'c',
        expectContains: ['cite'],
        expectExcludes: ['src', 'conf', 'why'],
    },
    {
        name: 'offers rich ref entry fields when typing a new key',
        key: 'has',
        replacement: 'h',
        expectContains: ['has'],
        expectExcludes: ['at', 'scope', 'arch'],
    },
];

/** Key syntax for the format: `key:` in YAML, `"key"` in JSON. */
function keySyntax(format: DocumentType, key: string): string {
    return format === DocumentType.JSON ? `"${key}"` : `${key}:`;
}

/** Range covering the edited text on the line where `key` is defined: the value when given, otherwise the key itself. */
function rangeOfValue(content: string, format: DocumentType, completionCase: CompletionCase): Range {
    const target = completionCase.value ?? completionCase.key;
    const keyPosition = positionOfText(content, keySyntax(format, completionCase.key), {
        occurrence: completionCase.occurrence,
    });
    const lineText = content.split('\n')[keyPosition.line];
    const character = lineText.indexOf(target, completionCase.value ? keyPosition.character : 0);
    if (character === -1) {
        throw new Error(`"${target}" not found on the line defining ${completionCase.key}`);
    }
    return {
        start: { line: keyPosition.line, character },
        end: { line: keyPosition.line, character: character + target.length },
    };
}

describe('Metadata.Context completion in the metadata-context fixture', () => {
    for (const [format, fixture] of [
        [DocumentType.YAML, Templates.metadataContext.yaml],
        [DocumentType.JSON, Templates.metadataContext.json],
    ] as const) {
        describe(`${format} template`, () => {
            for (const completionCase of completionCases) {
                it(`${completionCase.name}`, async () => {
                    const template = new TemplateBuilder(format, fixture.contents);
                    const range = rangeOfValue(fixture.contents, format, completionCase);
                    const replacement = completionCase.replacement ?? '';

                    const expectation = CompletionExpectationBuilder.create();
                    if (completionCase.expectExact) {
                        expectation.expectItems(completionCase.expectExact);
                    }
                    if (completionCase.expectContains) {
                        expectation.expectContainsItems(completionCase.expectContains);
                    }
                    if (completionCase.expectExcludes) {
                        expectation.expectExcludesItems(completionCase.expectExcludes);
                    }

                    const scenario: TemplateScenario = {
                        name: completionCase.name,
                        steps: [
                            {
                                action: 'replace',
                                range,
                                content: replacement,
                                description: `replace ${completionCase.value ?? completionCase.key}`,
                                verification: {
                                    position: {
                                        line: range.start.line,
                                        character: range.start.character + replacement.length,
                                    },
                                    expectation: expectation.build(),
                                },
                            },
                        ],
                    };

                    await template.executeScenario(scenario);
                });
            }

            it('does not offer Context fields inside a sibling Metadata key', async () => {
                const template = new TemplateBuilder(format, fixture.contents);
                const range = rangeOfValue(fixture.contents, format, {
                    name: '',
                    key: 'default',
                    value: 'Worker Settings',
                });

                const scenario: TemplateScenario = {
                    name: 'sibling Metadata key value',
                    steps: [
                        {
                            action: 'replace',
                            range,
                            content: '',
                            verification: {
                                position: range.start,
                                expectation: CompletionExpectationBuilder.create()
                                    .expectExcludesItems([METADATA_CONTEXT_KEY, 'arch', 'must', 'ref', 'owner'])
                                    .build(),
                            },
                        },
                    ],
                };

                await template.executeScenario(scenario);
            });
        });
    }
});
