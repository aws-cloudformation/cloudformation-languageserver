import { extname, parse } from 'path';
import { Edit, Point } from 'tree-sitter';
import { DocumentType, Extension, Extensions } from './Document';

export function getIndexFromPoint(content: string, point: Point): number {
    const contentInLines = content.split('\n');
    if (point.row < 0 || point.row >= contentInLines.length) {
        throw new Error(`Invalid row: ${point.row}. Source has ${contentInLines.length} lines.`);
    }

    let byteIndex = 0;
    for (let i = 0; i < point.row; i++) {
        byteIndex += Buffer.byteLength(contentInLines[i], 'utf8') + 1; // +1 for newline
    }
    const line = contentInLines[point.row] || '';
    const prefix = line.slice(0, point.column);
    byteIndex += Buffer.byteLength(prefix, 'utf8');
    return byteIndex;
}

export function getNewEndPosition(textToInsert: string, start: Point): Point {
    const textLines = textToInsert.split('\n');
    return {
        row: start.row + textLines.length - 1,
        column: textLines.length > 1 ? textLines[textLines.length - 1].length : start.column + textToInsert.length,
    };
}

export function createEdit(
    content: string,
    textToInsert: string,
    start: Point,
    end: Point,
): {
    edit: Edit;
    newContent: string;
} {
    const startIndex = getIndexFromPoint(content, start);
    const oldEndIndex = getIndexFromPoint(content, end);

    const newContent = `${content.slice(0, Math.max(0, startIndex))}${textToInsert}${content.slice(Math.max(0, oldEndIndex))}`;

    const newEndPosition = getNewEndPosition(textToInsert, start);
    const newEndIndex = getIndexFromPoint(newContent, newEndPosition);

    return {
        edit: {
            startIndex: startIndex,
            oldEndIndex: oldEndIndex,
            newEndIndex: newEndIndex,
            startPosition: start,
            oldEndPosition: end,
            newEndPosition: newEndPosition,
        },
        newContent,
    };
}

export function detectDocumentType(uri: string, content: string): { extension: Extension; type: DocumentType } {
    let ext = extname(uri).toLowerCase();
    if (ext.startsWith('.')) {
        ext = ext.slice(1);
    }

    const extension = Extensions.find((type) => type.toString().toLowerCase() === ext);
    if (!extension) {
        throw new Error(`Extension ${ext} is not supported`);
    }

    let type: DocumentType;
    if (extension === Extension.JSON) {
        type = DocumentType.JSON;
    } else if (extension === Extension.YAML || extension === Extension.YML) {
        type = DocumentType.YAML;
    } else if (content.startsWith('{') || content.startsWith('[')) {
        type = DocumentType.JSON;
    } else {
        type = DocumentType.YAML;
    }

    return {
        extension,
        type,
    };
}

export function uriToPath(uri: string) {
    return parse(uri);
}
