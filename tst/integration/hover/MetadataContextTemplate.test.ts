import { describe, it } from 'vitest';
import { DocumentType } from '../../../src/document/Document';
import {
    METADATA_CONTEXT_DOCUMENTATION_URL,
    METADATA_CONTEXT_KEY,
    MUTABILITY_LEVELS,
    RESOURCE_METADATA_CONTEXT_SCHEMA,
    TEMPLATE_METADATA_CONTEXT_SCHEMA,
    TRUST_CONFIDENCE_LEVELS,
    TRUST_SOURCES,
} from '../../../src/schema/MetadataContextSchema';
import { HoverExpectationBuilder, TemplateBuilder } from '../../utils/TemplateBuilder';
import { positionOfText, Templates } from '../../utils/TemplateUtils';

const SOURCE_LINK = `[Source Documentation](${METADATA_CONTEXT_DOCUMENTATION_URL})`;
const templateFields = TEMPLATE_METADATA_CONTEXT_SCHEMA.properties!;
const resourceFields = RESOURCE_METADATA_CONTEXT_SCHEMA.properties!;
const trustFields = resourceFields.trust.properties!;
const richReferenceFields = templateFields.ref.items!.oneOf![1].properties!;

const allowedValues = (values: readonly string[]) =>
    `**Allowed values:** ${values.map((value) => `\`${value}\``).join(', ')}`;

/**
 * Each case names a Context field in the metadata-context fixture and the documentation its hover must contain.
 * `key` is located by its key syntax (`key:` in YAML, `"key"` in JSON) so prose containing the same word is skipped.
 */
const hoverCases: Array<{
    name: string;
    key: string;
    occurrence?: number;
    expectContains: string[];
    expectExcludes?: string[];
}> = [
    {
        name: 'template-level Context key',
        key: METADATA_CONTEXT_KEY,
        expectContains: [
            `### \`${METADATA_CONTEXT_KEY}\``,
            TEMPLATE_METADATA_CONTEXT_SCHEMA.description!,
            'template-level',
            'The schema is advisory. CloudFormation does not validate or enforce Metadata Context.',
            SOURCE_LINK,
        ],
        expectExcludes: ['resource-level'],
    },
    {
        name: 'arch',
        key: 'arch',
        expectContains: ['### `arch`', templateFields.arch.description!, '**Type:** `string`'],
    },
    {
        name: 'template-level must',
        key: 'must',
        expectContains: ['### `must`', templateFields.must.description!, '**Type:** `array`'],
    },
    {
        name: 'ref',
        key: 'ref',
        expectContains: ['### `ref`', templateFields.ref.description!, '**Type:** `array`'],
    },
    {
        name: 'rich ref entry at (required)',
        key: 'at',
        expectContains: ['### `at`', richReferenceFields.at.description!, '**Type:** `string`', '**Required:** Yes'],
    },
    {
        name: 'rich ref entry has',
        key: 'has',
        expectContains: ['### `has`', richReferenceFields.has.description!],
        expectExcludes: ['**Required:** Yes'],
    },
    {
        name: 'rich ref entry scope',
        key: 'scope',
        expectContains: ['### `scope`', richReferenceFields.scope.description!],
    },
    {
        name: 'owner',
        key: 'owner',
        expectContains: ['### `owner`', templateFields.owner.description!, '**Type:** `string`'],
    },
    {
        name: 'resource-level Context key',
        key: METADATA_CONTEXT_KEY,
        occurrence: 2,
        expectContains: [
            `### \`${METADATA_CONTEXT_KEY}\``,
            RESOURCE_METADATA_CONTEXT_SCHEMA.description!,
            'resource-level',
            SOURCE_LINK,
        ],
        expectExcludes: ['template-level'],
    },
    {
        name: 'why',
        key: 'why',
        expectContains: ['### `why`', resourceFields.why.description!, '**Type:** `string`'],
    },
    {
        name: 'resource-level must',
        key: 'must',
        occurrence: 2,
        expectContains: ['### `must`', resourceFields.must.description!, '**Type:** `array`'],
    },
    {
        name: 'mutable',
        key: 'mutable',
        expectContains: ['### `mutable`', resourceFields.mutable.description!, allowedValues(MUTABILITY_LEVELS)],
    },
    {
        name: 'mutability',
        key: 'mutability',
        expectContains: ['### `mutability`', resourceFields.mutability.description!, '**Type:** `object`'],
    },
    {
        name: 'mutability override keyed by a CloudFormation property name',
        key: 'QueueName',
        expectContains: ['### `QueueName`', allowedValues(MUTABILITY_LEVELS)],
    },
    {
        name: 'trust',
        key: 'trust',
        expectContains: ['### `trust`', resourceFields.trust.description!, '**Type:** `object`'],
    },
    {
        name: 'trust src (required enum)',
        key: 'src',
        expectContains: ['### `src`', trustFields.src.description!, '**Required:** Yes', allowedValues(TRUST_SOURCES)],
    },
    {
        name: 'trust conf (required enum)',
        key: 'conf',
        expectContains: [
            '### `conf`',
            trustFields.conf.description!,
            '**Required:** Yes',
            allowedValues(TRUST_CONFIDENCE_LEVELS),
        ],
    },
    {
        name: 'trust cite',
        key: 'cite',
        expectContains: ['### `cite`', trustFields.cite.description!],
        expectExcludes: ['**Required:** Yes'],
    },
    {
        name: 'trust note',
        key: 'note',
        expectContains: ['### `note`', trustFields.note.description!],
        expectExcludes: ['**Required:** Yes'],
    },
    {
        name: 'deps',
        key: 'deps',
        expectContains: ['### `deps`', resourceFields.deps.description!, '**Type:** `array`'],
    },
];

/** Key syntax for the format: `key:` in YAML, `"key"` in JSON. */
function keySyntax(format: DocumentType, key: string): string {
    return format === DocumentType.JSON ? `"${key}"` : `${key}:`;
}

describe('Metadata.Context hover in the metadata-context fixture', () => {
    for (const [format, fixture] of [
        [DocumentType.YAML, Templates.metadataContext.yaml],
        [DocumentType.JSON, Templates.metadataContext.json],
    ] as const) {
        describe(`${format} template`, () => {
            const template = new TemplateBuilder(format, fixture.contents);

            for (const hoverCase of hoverCases) {
                it(`documents ${hoverCase.name}`, () => {
                    // Hover one character into the key so quoted JSON keys and bare YAML keys resolve identically
                    const hoverPosition = positionOfText(fixture.contents, keySyntax(format, hoverCase.key), {
                        occurrence: hoverCase.occurrence,
                        characterOffset: 1,
                    });

                    const expectation = HoverExpectationBuilder.create().expectContainsText(hoverCase.expectContains);
                    if (hoverCase.expectExcludes) {
                        expectation.expectExcludesText(hoverCase.expectExcludes);
                    }

                    template.verifyHoverAt(hoverPosition, expectation.build(), hoverCase.name);
                });
            }

            it('does not document Metadata keys outside the Context block', () => {
                const interfacePosition = positionOfText(
                    fixture.contents,
                    keySyntax(format, 'AWS::CloudFormation::Interface'),
                    { characterOffset: 1 },
                );

                template.verifyHoverAt(
                    interfacePosition,
                    HoverExpectationBuilder.create().expectExcludesText([METADATA_CONTEXT_KEY, SOURCE_LINK]).build(),
                    'sibling Metadata key',
                );
            });
        });
    }
});
