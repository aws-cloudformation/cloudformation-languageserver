import { TextEdit } from 'vscode-languageserver';

/**
 * Applies a list of TextEdit operations to a document content string.
 * Edits are applied in reverse order (from end to start) to maintain correct positions.
 *
 * @param content - The original document content
 * @param edits - Array of TextEdit operations to apply
 * @returns The modified document content with all edits applied
 */
export function applyWorkspaceEdit(content: string, edits: TextEdit[]): string {
    // Sort edits in reverse order to apply from end to start
    const sortedEdits = [...edits].sort((a, b) => {
        if (a.range.start.line !== b.range.start.line) {
            return b.range.start.line - a.range.start.line;
        }
        return b.range.start.character - a.range.start.character;
    });

    let result = content;
    for (const textEdit of sortedEdits) {
        const lines = result.split('\n');
        const startLine = textEdit.range.start.line;
        const startChar = textEdit.range.start.character;
        const endLine = textEdit.range.end.line;
        const endChar = textEdit.range.end.character;

        if (startLine === endLine) {
            const line = lines[startLine];
            lines[startLine] = line.slice(0, startChar) + textEdit.newText + line.slice(endChar);
        } else {
            const firstLine = lines[startLine].slice(0, startChar) + textEdit.newText;
            const lastLine = lines[endLine].slice(endChar);
            lines.splice(startLine, endLine - startLine + 1, firstLine + lastLine);
        }
        result = lines.join('\n');
    }
    return result;
}
