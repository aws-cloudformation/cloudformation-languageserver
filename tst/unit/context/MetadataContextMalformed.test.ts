import { stubInterface } from 'ts-sinon';
import { describe, expect, test } from 'vitest';
import { Position } from 'vscode-languageserver';
import { MetadataContextCompletionProvider } from '../../../src/autocomplete/MetadataContextCompletionProvider';
import { ContextManager } from '../../../src/context/ContextManager';
import { SyntaxTreeManager } from '../../../src/context/syntaxtree/SyntaxTreeManager';
import { MetadataContextHoverProvider } from '../../../src/hover/MetadataContextHoverProvider';
import { HoverRouter } from '../../../src/hover/HoverRouter';
import { SchemaRetriever } from '../../../src/schema/SchemaRetriever';
import { METADATA_CONTEXT_KEY } from '../../../src/schema/MetadataContextSchema';

describe('Metadata.Context paths in malformed templates', () => {
    function createContextFixture(content: string, extension: 'json' | 'yaml', position: Position) {
        const uri = `file:///metadata-context-malformed.${extension}`;
        const syntaxTreeManager = new SyntaxTreeManager();
        syntaxTreeManager.add(uri, content);
        const contextManager = new ContextManager(syntaxTreeManager);
        const params = { textDocument: { uri }, position };
        const featureFlag = { isEnabled: () => true, describe: () => 'test' };
        const hoverRouter = new HoverRouter(contextManager, stubInterface<SchemaRetriever>(), featureFlag);
        return {
            context: contextManager.getContextAndRelatedEntities(params),
            hover: hoverRouter.getHoverDoc(params),
        };
    }

    function completionLabels(context: NonNullable<ReturnType<typeof createContextFixture>['context']>): string[] {
        const provider = new MetadataContextCompletionProvider();
        const completions = provider.getCompletions(context, {
            textDocument: { uri: 'file:///metadata-context-malformed.json' },
            position: { line: context.startPosition.row, character: context.startPosition.column },
        });
        return completions.map((item) => item.label);
    }

    test('recovers a template field path from malformed YAML', () => {
        const { context, hover } = createContextFixture(
            `AWSTemplateFormatVersion: '2010-09-09'
BrokenTopLevel
Metadata:
  ${METADATA_CONTEXT_KEY}:
    arch: queue -> worker
Resources: {}
`,
            'yaml',
            { line: 4, character: 6 },
        );

        expect(context?.propertyPath).toEqual(['Metadata', METADATA_CONTEXT_KEY, 'arch']);
        expect(new MetadataContextHoverProvider().getInformation(context!)).toContain('High-level shape');
        expect(hover).toContain('High-level shape');
    });

    test('recovers a resource trust field path from malformed YAML', () => {
        const { context, hover } = createContextFixture(
            `Resources:
  OrderQueue:
    Type: AWS::SQS::Queue
    Metadata:
      ${METADATA_CONTEXT_KEY}:
        trust:
          src: authored
BrokenTopLevel
`,
            'yaml',
            { line: 6, character: 12 },
        );

        expect(context?.propertyPath).toEqual([
            'Resources',
            'OrderQueue',
            'Metadata',
            METADATA_CONTEXT_KEY,
            'trust',
            'src',
        ]);
        expect(new MetadataContextHoverProvider().getInformation(context!)).toContain('How this context was produced');
        expect(hover).toContain('How this context was produced');
    });

    test('recovers a template field path from JSON with missing closing braces', () => {
        const { context, hover } = createContextFixture(
            `{
  "AWSTemplateFormatVersion": "2010-09-09",
  "Metadata": {
    "${METADATA_CONTEXT_KEY}": {
      "arch": "queue -> worker"`,
            'json',
            { line: 4, character: 9 },
        );

        expect(context?.propertyPath).toEqual(['Metadata', METADATA_CONTEXT_KEY, 'arch']);
        expect(new MetadataContextHoverProvider().getInformation(context!)).toContain('High-level shape');
        expect(hover).toContain('High-level shape');
    });

    test('recovers a resource enum field path from JSON with missing closing braces', () => {
        const { context, hover } = createContextFixture(
            `{
  "Resources": {
    "OrderQueue": {
      "Type": "AWS::SQS::Queue",
      "Metadata": {
        "${METADATA_CONTEXT_KEY}": {
          "mutable": "review-required"`,
            'json',
            { line: 6, character: 13 },
        );

        expect(context?.propertyPath).toEqual(['Resources', 'OrderQueue', 'Metadata', METADATA_CONTEXT_KEY, 'mutable']);
        expect(hover).toContain('Default resource-level change-safety level.');
    });

    test('recovers a partial template field completion from JSON with missing closing braces', () => {
        const { context } = createContextFixture(
            `{
  "AWSTemplateFormatVersion": "2010-09-09",
  "Metadata": {
    "${METADATA_CONTEXT_KEY}": {
      "ar"`,
            'json',
            { line: 4, character: 9 },
        );

        expect(context?.text).toBe('ar');
        expect(context?.isKey()).toBe(true);
        expect(context?.propertyPath).toEqual(['Metadata', METADATA_CONTEXT_KEY, 'ar']);
        expect(completionLabels(context!)).toContain('arch');
    });

    test('recovers a partial nested trust completion from JSON with missing closing braces', () => {
        const { context } = createContextFixture(
            `{
  "Resources": {
    "OrderQueue": {
      "Type": "AWS::SQS::Queue",
      "Metadata": {
        "${METADATA_CONTEXT_KEY}": {
          "trust": {
            "s"`,
            'json',
            { line: 7, character: 14 },
        );

        expect(context?.text).toBe('s');
        expect(context?.isKey()).toBe(true);
        expect(context?.propertyPath).toEqual([
            'Resources',
            'OrderQueue',
            'Metadata',
            METADATA_CONTEXT_KEY,
            'trust',
            's',
        ]);
        expect(completionLabels(context!)).toContain('src');
    });

    test('recovers a partial enum value completion from JSON with missing closing braces', () => {
        const { context } = createContextFixture(
            `{
  "Resources": {
    "OrderQueue": {
      "Type": "AWS::SQS::Queue",
      "Metadata": {
        "${METADATA_CONTEXT_KEY}": {
          "mutable": "rev"`,
            'json',
            { line: 6, character: 26 },
        );

        expect(context?.text).toBe('rev');
        expect(context?.isValue()).toBe(true);
        expect(context?.propertyPath).toEqual(['Resources', 'OrderQueue', 'Metadata', METADATA_CONTEXT_KEY, 'mutable']);
        expect(completionLabels(context!)).toContain('review-required');
    });
});
