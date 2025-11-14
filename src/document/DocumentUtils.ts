import { extname, parse } from 'path';
import { Edit, Point } from 'tree-sitter';
import { DocumentType } from './Document';
import { parseValidYaml } from './YamlParser';

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

enum Extension {
    YAML = 'yaml',
    JSON = 'json',
    YML = 'yml',
    TXT = 'txt',
    CFN = 'cfn',
    TEMPLATE = 'template',
}

export function detectDocumentType(uri: string, content: string): { extension: string; type: DocumentType } {
    let extension = extname(uri).toLowerCase();
    if (extension.startsWith('.')) {
        extension = extension.slice(1);
    }

    let type: DocumentType;
    if (extension === Extension.JSON.toLowerCase()) {
        type = DocumentType.JSON;
    } else if (extension === Extension.YAML.toLowerCase() || extension === Extension.YML.toLowerCase()) {
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

export function parseDocumentContent(uri: string, content: string): unknown {
    const documentType = detectDocumentType(uri, content).type;
    if (documentType === DocumentType.JSON) {
        return JSON.parse(content);
    }
    return parseValidYaml(content);
}
