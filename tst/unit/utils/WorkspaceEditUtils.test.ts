import { describe, it, expect } from 'vitest';
import { TextEdit, Range } from 'vscode-languageserver';
import { applyWorkspaceEdit } from '../../utils/WorkspaceEditUtils';

describe('WorkspaceEditUtils', () => {
    describe('applyWorkspaceEdit', () => {
        it('should apply single-line edit', () => {
            const content = 'Hello World';
            const edits: TextEdit[] = [
                {
                    range: Range.create(0, 6, 0, 11),
                    newText: 'Universe',
                },
            ];

            const result = applyWorkspaceEdit(content, edits);
            expect(result).toBe('Hello Universe');
        });

        it('should apply multiple edits in correct order', () => {
            const content = 'Line 1\nLine 2\nLine 3';
            const edits: TextEdit[] = [
                {
                    range: Range.create(0, 5, 0, 6),
                    newText: 'A',
                },
                {
                    range: Range.create(1, 5, 1, 6),
                    newText: 'B',
                },
            ];

            const result = applyWorkspaceEdit(content, edits);
            expect(result).toBe('Line A\nLine B\nLine 3');
        });

        it('should apply multi-line edit', () => {
            const content = 'Line 1\nLine 2\nLine 3';
            const edits: TextEdit[] = [
                {
                    range: Range.create(0, 0, 1, 6),
                    newText: 'Replaced',
                },
            ];

            const result = applyWorkspaceEdit(content, edits);
            expect(result).toBe('Replaced\nLine 3');
        });

        it('should handle edits with overlapping positions correctly', () => {
            const content = '{"key": "value"}';
            const edits: TextEdit[] = [
                {
                    range: Range.create(0, 8, 0, 15),
                    newText: '{"Ref": "Param"}',
                },
                {
                    range: Range.create(0, 0, 0, 0),
                    newText: '{"Parameters": {"Param": {"Type": "String"}}}, ',
                },
            ];

            const result = applyWorkspaceEdit(content, edits);
            expect(result).toContain('Parameters');
            expect(result).toContain('Ref');
        });

        it('should handle empty edits array', () => {
            const content = 'No changes';
            const edits: TextEdit[] = [];

            const result = applyWorkspaceEdit(content, edits);
            expect(result).toBe('No changes');
        });

        it('should handle insertion at beginning of line', () => {
            const content = 'Original text';
            const edits: TextEdit[] = [
                {
                    range: Range.create(0, 0, 0, 0),
                    newText: 'Prefix: ',
                },
            ];

            const result = applyWorkspaceEdit(content, edits);
            expect(result).toBe('Prefix: Original text');
        });

        it('should handle insertion at end of line', () => {
            const content = 'Original text';
            const edits: TextEdit[] = [
                {
                    range: Range.create(0, 13, 0, 13),
                    newText: ' - suffix',
                },
            ];

            const result = applyWorkspaceEdit(content, edits);
            expect(result).toBe('Original text - suffix');
        });
    });
});
