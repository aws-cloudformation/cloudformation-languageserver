import { Point, SyntaxNode } from 'tree-sitter';
import { Position, Range } from 'vscode-languageserver';

export function toNumber(value?: unknown): number {
    if (value === undefined || value === null || typeof value === 'object' || typeof value === 'function') {
        return Number.NaN;
    }

    return Number(value);
}

export function toNumberList(value?: unknown[]): number[] {
    if (value === undefined) {
        return [];
    }

    return value.map((element) => toNumber(element));
}

export function pointToPosition(point: Point): Position {
    return {
        line: point.row,
        character: point.column,
    };
}

export function nodeToRange(node: SyntaxNode): Range {
    return {
        start: pointToPosition(node.startPosition),
        end: pointToPosition(node.endPosition),
    };
}
