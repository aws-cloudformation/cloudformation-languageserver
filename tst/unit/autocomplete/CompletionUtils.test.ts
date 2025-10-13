import { describe, expect, test } from 'vitest';
import { CompletionItemKind, MarkupContent, MarkupKind } from 'vscode-languageserver';
import {
    createCompletionItem,
} from '../../../src/autocomplete/CompletionUtils';

describe('CompletionUtils', () => {
    describe('createCompletionItem', () => {
        describe('documentation handling', () => {
            const stringDoc = "This is a test documentation";
            const expectedStringResult = "This is a test documentation\n\nSource: AWS CloudFormation";

            const markupDoc = { kind: MarkupKind.Markdown, value: "**Bold** documentation" };
            const expectedMarkupResult = { 
                kind: MarkupKind.Markdown, 
                value: "**Bold** documentation\n\n**Source:** AWS CloudFormation" 
            };

            const emptyDoc = "";
            const defaultSource = "Source: AWS CloudFormation";

            const markdownDoc = { kind: MarkupKind.Markdown, value: "**Bold** text" };
            const plainTextDoc = { kind: MarkupKind.PlainText, value: "Plain text" };

            const complexMarkdown = {
                kind: MarkupKind.Markdown,
                value: `# S3 Bucket
                
            Creates an **Amazon S3** bucket with:
            - Versioning enabled
            - Public access *blocked*
            - [Documentation](https://docs.aws.amazon.com)`
            };

            const expectedComplexMarkdown = {
                kind: MarkupKind.Markdown,
                value: `# S3 Bucket
                
            Creates an **Amazon S3** bucket with:
            - Versioning enabled
            - Public access *blocked*
            - [Documentation](https://docs.aws.amazon.com)

**Source:** AWS CloudFormation`,
            };

            test('should handle string documentation with source attribution', () => {
                const result = createCompletionItem("Test", CompletionItemKind.Keyword, {
                    documentation: stringDoc,
                });
                expect(result.documentation).toEqual(expectedStringResult);
            });

            test('should handle MarkupContent documentation with source attribution', () => {
                const result = createCompletionItem("Test", CompletionItemKind.Keyword, {
                    documentation: markupDoc,
                });
                expect(result.documentation).toEqual(expectedMarkupResult);
            });

            test('should handle undefined documentation with default source', () => {
                const result = createCompletionItem("Test", CompletionItemKind.Keyword);
                expect(result.documentation).toEqual(defaultSource);
            });

            test('should handle empty string documentation', () => {
                const result = createCompletionItem("Test", CompletionItemKind.Keyword, {
                    documentation: emptyDoc,
                });
                expect(result.documentation).toEqual(defaultSource);
            });

            test('should preserve MarkupContent kind when adding source attribution', () => {
                const markdownResult = createCompletionItem("Test", CompletionItemKind.Keyword, {
                    documentation: markdownDoc,
                });
                const markdownAsMarkup = markdownResult.documentation as MarkupContent;
                expect(markdownAsMarkup.kind).toEqual(MarkupKind.Markdown);
                
                const plainTextResult = createCompletionItem("Test", CompletionItemKind.Keyword, {
                    documentation: plainTextDoc,
                });
                const plainTextAsMarkup = plainTextResult.documentation as MarkupContent;
                expect(plainTextAsMarkup.kind).toEqual(MarkupKind.PlainText);
            });


            test('should handle MarkupContent with existing markdown formatting', () => {
              const result = createCompletionItem("Test", CompletionItemKind.Keyword, {
                documentation: complexMarkdown,
              });

              expect(result.documentation).toEqual(expectedComplexMarkdown);
            });
        });
    });
});
