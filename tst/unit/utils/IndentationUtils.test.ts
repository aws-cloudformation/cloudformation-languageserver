import { describe, expect, test } from 'vitest';
import { DocumentType } from '../../../src/document/Document';
import { EditorSettings } from '../../../src/settings/Settings';
import { getIndentationString } from '../../../src/utils/IndentationUtils';

describe('IndentationUtils', () => {
    describe('getIndentationString', () => {
        describe('YAML behavior', () => {
            test('should always return spaces for YAML regardless of insertSpaces setting', () => {
                const editorSettings: EditorSettings = {
                    tabSize: 2,
                    insertSpaces: false,
                    detectIndentation: true,
                };

                const result = getIndentationString(editorSettings, DocumentType.YAML);

                expect(result).toBe('  '); // 2 spaces
            });

            test('should respect different tab sizes for YAML', () => {
                const editorSettings4: EditorSettings = {
                    tabSize: 4,
                    insertSpaces: false,
                    detectIndentation: true,
                };

                const editorSettings8: EditorSettings = {
                    tabSize: 8,
                    insertSpaces: true,
                    detectIndentation: true,
                };

                expect(getIndentationString(editorSettings4, DocumentType.YAML)).toBe('    '); // 4 spaces
                expect(getIndentationString(editorSettings8, DocumentType.YAML)).toBe('        '); // 8 spaces
            });
        });

        describe('JSON behavior', () => {
            test('should return spaces for JSON when insertSpaces is true', () => {
                const editorSettings: EditorSettings = {
                    tabSize: 4,
                    insertSpaces: true,
                    detectIndentation: true,
                };

                const result = getIndentationString(editorSettings, DocumentType.JSON);

                expect(result).toBe('    '); // 4 spaces
            });

            test('should return single tab for JSON when insertSpaces is false', () => {
                const editorSettings: EditorSettings = {
                    tabSize: 4,
                    insertSpaces: false,
                    detectIndentation: true,
                };

                const result = getIndentationString(editorSettings, DocumentType.JSON);

                expect(result).toBe('\t'); // Single tab
            });
        });
    });
});
