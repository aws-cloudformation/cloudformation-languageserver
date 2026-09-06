import { describe, expect, test } from 'vitest';
import { getMetadataContextRelativePath, getMetadataContextScope } from '../../../src/context/MetadataContext';
import { MetadataContextHoverProvider } from '../../../src/hover/MetadataContextHoverProvider';
import { METADATA_CONTEXT_KEY } from '../../../src/schema/MetadataContextSchema';
import { createContextFromYamlContentAndPath, createResourceContext } from '../../utils/MockContext';

describe('MetadataContext path helpers', () => {
    test('recognizes the dotted template-level Context key as one path segment', () => {
        const context = createContextFromYamlContentAndPath(
            `Metadata:\n  ${METADATA_CONTEXT_KEY}:\n    arch: producer -> queue -> worker\n`,
            { line: 1, character: 5 },
        );

        expect(context.section).toBe('Metadata');
        expect(context.text).toBe(METADATA_CONTEXT_KEY);
        expect(context.propertyPath).toEqual(['Metadata', METADATA_CONTEXT_KEY]);
        expect(getMetadataContextScope(context)).toBe('template');
        expect(getMetadataContextRelativePath(context)).toEqual([METADATA_CONTEXT_KEY]);
        expect(new MetadataContextHoverProvider().getInformation(context)).toContain(METADATA_CONTEXT_KEY);
    });

    test('does not confuse a resource named Metadata with its Metadata attribute', () => {
        const context = createResourceContext('Metadata', {
            propertyPath: ['Resources', 'Metadata', 'Metadata', METADATA_CONTEXT_KEY, 'why'],
            text: 'why',
            data: { Type: 'AWS::SQS::Queue' },
        });

        expect(getMetadataContextScope(context)).toBe('resource');
        expect(getMetadataContextRelativePath(context)).toEqual([METADATA_CONTEXT_KEY, 'why']);
    });

    test('recognizes Metadata.Context inside a real parsed ForEach resource', () => {
        const context = createContextFromYamlContentAndPath(
            `Transform: AWS::LanguageExtensions
Resources:
  Fn::ForEach::Queues:
    - QueueName
    - [Primary]
    - Queue\${QueueName}:
        Type: AWS::SQS::Queue
        Metadata:
          ${METADATA_CONTEXT_KEY}:
            why: buffer work
`,
            { line: 9, character: 14 },
        );

        expect(context.propertyPath).toEqual([
            'Resources',
            'Fn::ForEach::Queues',
            2,
            'Queue${QueueName}',
            'Metadata',
            METADATA_CONTEXT_KEY,
            'why',
        ]);
        expect(getMetadataContextScope(context)).toBe('resource');
        expect(getMetadataContextRelativePath(context)).toEqual([METADATA_CONTEXT_KEY, 'why']);
    });
});
