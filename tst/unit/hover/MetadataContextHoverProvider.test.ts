import { describe, expect, test } from 'vitest';
import { TopLevelSection } from '../../../src/context/CloudFormationEnums';
import { MetadataContextHoverProvider } from '../../../src/hover/MetadataContextHoverProvider';
import { METADATA_CONTEXT_DOCUMENTATION_URL, METADATA_CONTEXT_KEY } from '../../../src/schema/MetadataContextSchema';
import { createMockContext, createResourceContext } from '../../utils/MockContext';

describe('MetadataContextHoverProvider', () => {
    const provider = new MetadataContextHoverProvider();

    test('documents the full template Context key and authoritative source', () => {
        const context = createMockContext(TopLevelSection.Metadata, METADATA_CONTEXT_KEY, {
            text: METADATA_CONTEXT_KEY,
            propertyPath: [TopLevelSection.Metadata, METADATA_CONTEXT_KEY],
        });

        const result = provider.getInformation(context);

        expect(result).toContain(`### \`${METADATA_CONTEXT_KEY}\``);
        expect(result).toContain('template-level');
        expect(result).toContain('CloudFormation does not validate or enforce');
        expect(result).toContain(`[Source Documentation](${METADATA_CONTEXT_DOCUMENTATION_URL})`);
    });

    test('documents template fields and value types', () => {
        const context = createMockContext(TopLevelSection.Metadata, METADATA_CONTEXT_KEY, {
            text: 'arch',
            propertyPath: [TopLevelSection.Metadata, METADATA_CONTEXT_KEY, 'arch'],
        });

        const result = provider.getInformation(context);

        expect(result).toContain('### `arch`');
        expect(result).toContain('High-level shape or pattern of the system.');
        expect(result).toContain('**Type:** `string`');
    });

    test('documents required rich reference fields', () => {
        const context = createMockContext(TopLevelSection.Metadata, METADATA_CONTEXT_KEY, {
            text: 'at',
            propertyPath: [TopLevelSection.Metadata, METADATA_CONTEXT_KEY, 'ref', 0, 'at'],
        });

        const result = provider.getInformation(context);

        expect(result).toContain('### `at`');
        expect(result).toContain('URI to the external context source.');
        expect(result).toContain('**Required:** Yes');
    });

    test('documents resource mutability enum values', () => {
        const context = createResourceContext('OrderQueue', {
            text: 'mutable',
            propertyPath: [TopLevelSection.Resources, 'OrderQueue', 'Metadata', METADATA_CONTEXT_KEY, 'mutable'],
            data: { Type: 'AWS::SQS::Queue' },
        });

        const result = provider.getInformation(context);

        expect(result).toContain('Default resource-level change-safety level.');
        expect(result).toContain(
            '**Allowed values:** `must-never-change`, `change-with-constraints`, `review-required`, `free-to-tune`',
        );
    });

    test('documents required trust fields and enum values', () => {
        const context = createResourceContext('OrderQueue', {
            text: 'src',
            propertyPath: [TopLevelSection.Resources, 'OrderQueue', 'Metadata', METADATA_CONTEXT_KEY, 'trust', 'src'],
            data: { Type: 'AWS::SQS::Queue' },
        });

        const result = provider.getInformation(context);

        expect(result).toContain('How this context was produced.');
        expect(result).toContain('**Required:** Yes');
        expect(result).toContain('**Allowed values:** `authored`, `comment`, `commit`, `infer`');
    });

    test('documents both supported reference entry shapes', () => {
        const context = createMockContext(TopLevelSection.Metadata, METADATA_CONTEXT_KEY, {
            text: 'https://example.invalid/context',
            propertyPath: [TopLevelSection.Metadata, METADATA_CONTEXT_KEY, 'ref', 0],
        });

        const result = provider.getInformation(context);

        expect(result).toContain('### `ref`');
        expect(result).toContain('**Type:** `string` or `object`');
    });

    test('does not document unrelated Metadata', () => {
        const context = createMockContext(TopLevelSection.Metadata, 'CustomMetadata', {
            text: 'CustomMetadata',
            propertyPath: [TopLevelSection.Metadata, 'CustomMetadata'],
        });

        expect(provider.getInformation(context)).toBeUndefined();
    });
});
