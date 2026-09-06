import { beforeEach, describe, expect, test, vi } from 'vitest';
import { CompletionItemKind, CompletionParams } from 'vscode-languageserver';
import {
    MetadataContextCompletionProvider,
    METADATA_CONTEXT_KEY,
} from '../../../src/autocomplete/MetadataContextCompletionProvider';
import { TopLevelSection } from '../../../src/context/CloudFormationEnums';
import { Context } from '../../../src/context/Context';
import { createMockContext, createResourceContext } from '../../utils/MockContext';

describe('MetadataContextCompletionProvider', () => {
    const provider = new MetadataContextCompletionProvider();
    const params: CompletionParams = {
        textDocument: { uri: 'file:///template.yaml' },
        position: { line: 0, character: 0 },
    };

    beforeEach(() => {
        vi.restoreAllMocks();
    });

    function asKeyContext(context: Context): Context {
        vi.spyOn(context, 'isKey').mockReturnValue(true);
        vi.spyOn(context, 'isValue').mockReturnValue(false);
        return context;
    }

    function asValueContext(context: Context): Context {
        vi.spyOn(context, 'isKey').mockReturnValue(false);
        vi.spyOn(context, 'isValue').mockReturnValue(true);
        return context;
    }

    function labels(context: Context): string[] {
        return provider.getCompletions(context, params)?.map((item) => item.label) ?? [];
    }

    test('suggests the full Context key in template Metadata', () => {
        const context = asKeyContext(
            createMockContext(TopLevelSection.Metadata, undefined, {
                text: '',
                propertyPath: [TopLevelSection.Metadata, ''],
            }),
        );

        const completions = provider.getCompletions(context, params) ?? [];

        expect(completions).toHaveLength(1);
        expect(completions[0]).toMatchObject({
            label: METADATA_CONTEXT_KEY,
            kind: CompletionItemKind.Property,
            data: { type: 'object' },
        });
    });

    test('suggests template Context fields with schema-aware value types', () => {
        const context = asKeyContext(
            createMockContext(TopLevelSection.Metadata, METADATA_CONTEXT_KEY, {
                text: '',
                propertyPath: [TopLevelSection.Metadata, METADATA_CONTEXT_KEY, ''],
            }),
        );

        const completions = provider.getCompletions(context, params) ?? [];

        expect(completions.map((item) => item.label)).toEqual(['arch', 'must', 'ref', 'owner']);
        expect(completions.find((item) => item.label === 'arch')?.data).toEqual({ type: 'simple' });
        expect(completions.find((item) => item.label === 'must')?.data).toEqual({ type: 'array' });
        expect(completions.find((item) => item.label === 'ref')?.data).toEqual({ type: 'array' });
    });

    test('suggests rich reference fields inside a template ref array item', () => {
        const context = asKeyContext(
            createMockContext(TopLevelSection.Metadata, METADATA_CONTEXT_KEY, {
                text: '',
                propertyPath: [TopLevelSection.Metadata, METADATA_CONTEXT_KEY, 'ref', 0, ''],
            }),
        );

        expect(labels(context)).toEqual(['at', 'has', 'scope']);
    });

    test('suggests resource Context fields', () => {
        const context = asKeyContext(
            createResourceContext('OrderQueue', {
                text: '',
                propertyPath: [TopLevelSection.Resources, 'OrderQueue', 'Metadata', METADATA_CONTEXT_KEY, ''],
                data: { Type: 'AWS::SQS::Queue', Metadata: {} },
            }),
        );

        expect(labels(context)).toEqual(['why', 'must', 'mutable', 'mutability', 'trust', 'deps']);
    });

    test('suggests mutability enum values for the resource default and property overrides', () => {
        const expectedValues = ['must-never-change', 'change-with-constraints', 'review-required', 'free-to-tune'];
        const mutableContext = asValueContext(
            createResourceContext('OrderQueue', {
                text: '',
                propertyPath: [TopLevelSection.Resources, 'OrderQueue', 'Metadata', METADATA_CONTEXT_KEY, 'mutable'],
                data: { Type: 'AWS::SQS::Queue' },
            }),
        );
        const overrideContext = asValueContext(
            createResourceContext('OrderQueue', {
                text: '',
                propertyPath: [
                    TopLevelSection.Resources,
                    'OrderQueue',
                    'Metadata',
                    METADATA_CONTEXT_KEY,
                    'mutability',
                    'VisibilityTimeout',
                ],
                data: { Type: 'AWS::SQS::Queue' },
            }),
        );

        expect(labels(mutableContext)).toEqual(expectedValues);
        expect(labels(overrideContext)).toEqual(expectedValues);
    });

    test('suggests trust fields and enum values', () => {
        const trustContext = asKeyContext(
            createResourceContext('OrderQueue', {
                text: '',
                propertyPath: [TopLevelSection.Resources, 'OrderQueue', 'Metadata', METADATA_CONTEXT_KEY, 'trust', ''],
                data: { Type: 'AWS::SQS::Queue' },
            }),
        );
        const sourceContext = asValueContext(
            createResourceContext('OrderQueue', {
                text: '',
                propertyPath: [
                    TopLevelSection.Resources,
                    'OrderQueue',
                    'Metadata',
                    METADATA_CONTEXT_KEY,
                    'trust',
                    'src',
                ],
                data: { Type: 'AWS::SQS::Queue' },
            }),
        );
        const confidenceContext = asValueContext(
            createResourceContext('OrderQueue', {
                text: '',
                propertyPath: [
                    TopLevelSection.Resources,
                    'OrderQueue',
                    'Metadata',
                    METADATA_CONTEXT_KEY,
                    'trust',
                    'conf',
                ],
                data: { Type: 'AWS::SQS::Queue' },
            }),
        );

        expect(labels(trustContext)).toEqual(['src', 'conf', 'cite', 'note']);
        expect(labels(sourceContext)).toEqual(['authored', 'comment', 'commit', 'infer']);
        expect(labels(confidenceContext)).toEqual(['high', 'medium', 'low']);
    });

    test('does not claim unrelated Metadata paths', () => {
        const templateContext = createMockContext(TopLevelSection.Metadata, 'AWS::CloudFormation::Interface', {
            propertyPath: [TopLevelSection.Metadata, 'AWS::CloudFormation::Interface', 'ParameterGroups'],
        });
        const resourceContext = createResourceContext('OrderQueue', {
            propertyPath: [TopLevelSection.Resources, 'OrderQueue', 'Properties', 'VisibilityTimeout'],
            data: { Type: 'AWS::SQS::Queue' },
        });

        expect(MetadataContextCompletionProvider.canProvide(templateContext)).toBe(false);
        expect(provider.getCompletions(templateContext, params)).toEqual([]);
        expect(MetadataContextCompletionProvider.canProvide(resourceContext)).toBe(false);
    });
});
