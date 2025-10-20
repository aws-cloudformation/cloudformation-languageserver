import { WorkspaceEdit, TextEdit, Range } from 'vscode-languageserver';
import { ExtractToParameterResult } from './ExtractToParameterTypes';

/**
 * Builds atomic workspace edits for extract-to-parameter operations.
 * Ensures both parameter insertion and literal replacement are applied together
 * to prevent partial application that would break the template.
 */
export class WorkspaceEditBuilder {
    /**
     * Creates a workspace edit from an extraction result.
     * Combines parameter insertion and literal replacement into a single atomic operation.
     */
    createWorkspaceEdit(documentUri: string, extractionResult: ExtractToParameterResult): WorkspaceEdit {
        const workspaceEdit: WorkspaceEdit = {
            changes: {
                [documentUri]: [extractionResult.parameterInsertionEdit, extractionResult.replacementEdit],
            },
        };

        return workspaceEdit;
    }

    /**
     * Creates a workspace edit from multiple text edits.
     * Validates that edits don't conflict and orders them appropriately.
     */
    createWorkspaceEditFromEdits(documentUri: string, edits: TextEdit[]): WorkspaceEdit {
        // Validate edits don't overlap
        this.validateNonOverlappingEdits(edits);

        // Sort edits by position (reverse order for proper application)
        const sortedEdits = this.sortEditsForApplication(edits);

        const workspaceEdit: WorkspaceEdit = {
            changes: {
                [documentUri]: sortedEdits,
            },
        };

        return workspaceEdit;
    }

    /**
     * Validates that text edits don't overlap, which would cause conflicts.
     * Throws an error if overlapping edits are detected.
     */
    private validateNonOverlappingEdits(edits: TextEdit[]): void {
        if (edits.length <= 1) {
            return; // No conflicts possible with 0 or 1 edits
        }

        // Sort edits by start position for overlap checking
        const sortedEdits = [...edits].sort((a, b) => {
            const lineCompare = a.range.start.line - b.range.start.line;
            if (lineCompare !== 0) {
                return lineCompare;
            }
            return a.range.start.character - b.range.start.character;
        });

        // Check for overlaps between adjacent edits
        for (let i = 0; i < sortedEdits.length - 1; i++) {
            const currentEdit = sortedEdits[i];
            const nextEdit = sortedEdits[i + 1];

            if (this.rangesOverlap(currentEdit.range, nextEdit.range)) {
                throw new Error(
                    `Conflicting text edits detected: ` +
                        `Edit at ${this.formatPosition(currentEdit.range.start)} overlaps with ` +
                        `edit at ${this.formatPosition(nextEdit.range.start)}`,
                );
            }
        }
    }

    /**
     * Sorts text edits for proper application order.
     * Edits are sorted in reverse document order (bottom to top) to prevent
     * position shifts from affecting subsequent edits.
     */
    private sortEditsForApplication(edits: TextEdit[]): TextEdit[] {
        return [...edits].sort((a, b) => {
            // Sort by line in descending order (bottom to top)
            const lineCompare = b.range.start.line - a.range.start.line;
            if (lineCompare !== 0) {
                return lineCompare;
            }
            // For same line, sort by character in descending order (right to left)
            return b.range.start.character - a.range.start.character;
        });
    }

    /**
     * Checks if two ranges overlap.
     * Returns true if the ranges have any overlapping positions.
     * Adjacent ranges (where one ends exactly where another starts) are not considered overlapping,
     * except for zero-width ranges at the same position which are considered overlapping.
     */
    private rangesOverlap(range1: Range, range2: Range): boolean {
        // Special case: zero-width ranges at the same position are overlapping
        if (
            this.isZeroWidthRange(range1) &&
            this.isZeroWidthRange(range2) &&
            this.positionsEqual(range1.start, range2.start)
        ) {
            return true;
        }

        // Check if range1 ends before or at range2 start (adjacent is allowed)
        if (this.positionIsBeforeOrEqual(range1.end, range2.start)) {
            return false;
        }

        // Check if range2 ends before or at range1 start (adjacent is allowed)
        if (this.positionIsBeforeOrEqual(range2.end, range1.start)) {
            return false;
        }

        // If neither condition is true, ranges overlap
        return true;
    }

    /**
     * Compares two positions to determine if the first is before the second.
     * Returns true if pos1 comes before pos2 in the document.
     */
    private positionIsBefore(
        pos1: { line: number; character: number },
        pos2: { line: number; character: number },
    ): boolean {
        if (pos1.line < pos2.line) {
            return true;
        }
        if (pos1.line > pos2.line) {
            return false;
        }
        return pos1.character < pos2.character;
    }

    /**
     * Compares two positions to determine if the first is before or equal to the second.
     * Returns true if pos1 comes before or is at the same position as pos2 in the document.
     */
    private positionIsBeforeOrEqual(
        pos1: { line: number; character: number },
        pos2: { line: number; character: number },
    ): boolean {
        if (pos1.line < pos2.line) {
            return true;
        }
        if (pos1.line > pos2.line) {
            return false;
        }
        return pos1.character <= pos2.character;
    }

    /**
     * Checks if two positions are equal.
     * Returns true if both positions have the same line and character.
     */
    private positionsEqual(
        pos1: { line: number; character: number },
        pos2: { line: number; character: number },
    ): boolean {
        return pos1.line === pos2.line && pos1.character === pos2.character;
    }

    /**
     * Checks if a range is zero-width (start and end positions are the same).
     * Returns true if the range represents an insertion point rather than a replacement.
     */
    private isZeroWidthRange(range: Range): boolean {
        return this.positionsEqual(range.start, range.end);
    }

    /**
     * Formats a position for error messages.
     * Returns a human-readable string representation of the position.
     */
    private formatPosition(position: { line: number; character: number }): string {
        return `line ${position.line + 1}, column ${position.character + 1}`;
    }

    /**
     * Validates that a workspace edit is well-formed and safe to apply.
     * Checks for common issues that could cause edit application failures.
     */
    validateWorkspaceEdit(workspaceEdit: WorkspaceEdit): void {
        if (!workspaceEdit.changes) {
            throw new Error('Workspace edit must have changes defined');
        }

        for (const [documentUri, edits] of Object.entries(workspaceEdit.changes)) {
            if (!documentUri) {
                throw new Error('Document URI cannot be empty');
            }

            if (!Array.isArray(edits)) {
                throw new TypeError(`Edits for document ${documentUri} must be an array`);
            }

            if (edits.length === 0) {
                throw new Error(`No edits specified for document ${documentUri}`);
            }

            // Validate individual edits
            for (const edit of edits) {
                this.validateTextEdit(edit);
            }

            // Validate edits don't conflict
            this.validateNonOverlappingEdits(edits);
        }
    }

    /**
     * Validates that a single text edit is well-formed.
     * Checks range validity and newText presence.
     */
    private validateTextEdit(edit: TextEdit): void {
        if (!edit.range) {
            throw new Error('Text edit must have a range defined');
        }

        if (edit.newText === undefined || edit.newText === null) {
            throw new Error('Text edit must have newText defined (can be empty string)');
        }

        // Validate range positions
        if (edit.range.start.line < 0 || edit.range.start.character < 0) {
            throw new Error('Text edit range start position cannot be negative');
        }

        if (edit.range.end.line < 0 || edit.range.end.character < 0) {
            throw new Error('Text edit range end position cannot be negative');
        }

        // Validate range ordering
        if (this.positionIsBefore(edit.range.end, edit.range.start)) {
            throw new Error('Text edit range end cannot be before start');
        }
    }

    /**
     * Creates an empty workspace edit for the specified document.
     * Useful for error cases or when no changes are needed.
     */
    createEmptyWorkspaceEdit(documentUri: string): WorkspaceEdit {
        return {
            changes: {
                [documentUri]: [],
            },
        };
    }

    /**
     * Merges multiple workspace edits into a single edit.
     * Validates that all edits target the same document and don't conflict.
     */
    mergeWorkspaceEdits(documentUri: string, ...workspaceEdits: WorkspaceEdit[]): WorkspaceEdit {
        const allEdits: TextEdit[] = [];

        for (const workspaceEdit of workspaceEdits) {
            if (!workspaceEdit.changes?.[documentUri]) {
                continue; // Skip edits that don't affect this document
            }

            allEdits.push(...workspaceEdit.changes[documentUri]);
        }

        return this.createWorkspaceEditFromEdits(documentUri, allEdits);
    }
}
