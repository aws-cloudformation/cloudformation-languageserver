import { describe, it, expect } from 'vitest';
import { DocumentType } from '../../../src/document/Document';
import {
    getIndexFromPoint,
    getNewEndPosition,
    createEdit,
    detectDocumentType,
} from '../../../src/document/DocumentUtils';

describe('DocumentUtils', () => {
    describe('getIndexFromPoint', () => {
        it('should calculate correct index for single line', () => {
            const content = 'hello world';
            const point = { row: 0, column: 6 };

            const index = getIndexFromPoint(content, point);

            expect(index).toBe(6);
        });

        it('should calculate correct index for multi-line content', () => {
            const content = 'line1\nline2\nline3';
            const point = { row: 1, column: 2 };

            const index = getIndexFromPoint(content, point);

            expect(index).toBe(8); // 6 (line1\n) + 2
        });

        it('should handle UTF-8 characters correctly', () => {
            const content = 'héllo\nwörld';
            const point = { row: 1, column: 2 };

            const index = getIndexFromPoint(content, point);

            expect(index).toBe(10); // 7 (héllo\n) + 3 (wö)
        });

        it('should throw error for invalid row', () => {
            const content = 'line1\nline2';
            const point = { row: 5, column: 0 };

            expect(() => getIndexFromPoint(content, point)).toThrow('Invalid row: 5. Source has 2 lines.');
        });

        it('should handle negative row', () => {
            const content = 'line1\nline2';
            const point = { row: -1, column: 0 };

            expect(() => getIndexFromPoint(content, point)).toThrow('Invalid row: -1. Source has 2 lines.');
        });
    });

    describe('getNewEndPosition', () => {
        it('should calculate position for single line insertion', () => {
            const text = 'hello';
            const start = { row: 2, column: 5 };

            const newPos = getNewEndPosition(text, start);

            expect(newPos).toEqual({ row: 2, column: 10 });
        });

        it('should calculate position for multi-line insertion', () => {
            const text = 'line1\nline2\nline3';
            const start = { row: 1, column: 3 };

            const newPos = getNewEndPosition(text, start);

            expect(newPos).toEqual({ row: 3, column: 5 }); // 1 + 2 lines, last line length
        });

        it('should handle empty text', () => {
            const text = '';
            const start = { row: 1, column: 5 };

            const newPos = getNewEndPosition(text, start);

            expect(newPos).toEqual({ row: 1, column: 5 });
        });
    });

    describe('createEdit', () => {
        it('should create edit for text insertion', () => {
            const content = 'hello world';
            const textToInsert = ' beautiful';
            const start = { row: 0, column: 5 };
            const end = { row: 0, column: 5 };

            const { edit, newContent } = createEdit(content, textToInsert, start, end);

            expect(newContent).toBe('hello beautiful world');
            expect(edit.startIndex).toBe(5);
            expect(edit.oldEndIndex).toBe(5);
            expect(edit.newEndIndex).toBe(15);
            expect(edit.startPosition).toEqual(start);
            expect(edit.oldEndPosition).toEqual(end);
            expect(edit.newEndPosition).toEqual({ row: 0, column: 15 });
        });

        it('should create edit for text replacement', () => {
            const content = 'hello world';
            const textToInsert = 'beautiful';
            const start = { row: 0, column: 6 };
            const end = { row: 0, column: 11 };

            const { edit, newContent } = createEdit(content, textToInsert, start, end);

            expect(newContent).toBe('hello beautiful');
            expect(edit.startIndex).toBe(6);
            expect(edit.oldEndIndex).toBe(11);
            expect(edit.newEndIndex).toBe(15);
        });

        it('should handle multi-line edits', () => {
            const content = 'line1\nline2\nline3';
            const textToInsert = 'new\nlines';
            const start = { row: 1, column: 0 };
            const end = { row: 1, column: 5 };

            const { edit, newContent } = createEdit(content, textToInsert, start, end);

            expect(newContent).toBe('line1\nnew\nlines\nline3');
            expect(edit.newEndPosition).toEqual({ row: 2, column: 5 });
        });
    });

    describe('detectDocumentType', () => {
        it('should determine JSON type from .json extension', () => {
            const result = detectDocumentType('file:///test.json', '{}');

            expect(result.extension).toBe('json');
            expect(result.type).toBe(DocumentType.JSON);
        });

        it('should determine YAML type from .yaml extension', () => {
            const result = detectDocumentType('file:///test.yaml', 'key: value');

            expect(result.extension).toBe('yaml');
            expect(result.type).toBe(DocumentType.YAML);
        });

        it('should determine type from content for .template extension', () => {
            const jsonResult = detectDocumentType('file:///test.template', '{"key": "value"}');
            const yamlResult = detectDocumentType('file:///test.template', 'key: value');

            expect(jsonResult.type).toBe(DocumentType.JSON);
            expect(yamlResult.type).toBe(DocumentType.YAML);
        });

        it('should handle case-insensitive extensions', () => {
            const result = detectDocumentType('file:///test.JSON', '{}');

            expect(result.extension).toBe('json');
            expect(result.type).toBe(DocumentType.JSON);
        });

        it('should detect JSON from array content', () => {
            const result = detectDocumentType('file:///test.template', '[1, 2, 3]');

            expect(result.type).toBe(DocumentType.JSON);
        });

        it('should default to YAML for ambiguous content', () => {
            const result = detectDocumentType('file:///test.template', 'plain text');

            expect(result.type).toBe(DocumentType.YAML);
        });
    });
});
