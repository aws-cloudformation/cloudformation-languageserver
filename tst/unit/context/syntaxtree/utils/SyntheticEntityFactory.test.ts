import { Point } from 'tree-sitter';
import { describe, it, expect } from 'vitest';
import { createSyntheticNode } from '../../../../../src/context/syntaxtree/utils/SyntheticEntityFactory';
import { CommonNodeTypes } from '../../../../../src/context/syntaxtree/utils/TreeSitterTypes';

describe('SyntheticEntityFactory', () => {
    describe('createSyntheticNode', () => {
        const startPos: Point = { row: 0, column: 0 };
        const endPos: Point = { row: 0, column: 5 };

        it('should create node with correct text and positions', () => {
            const node = createSyntheticNode('hello', startPos, endPos);

            expect(node.text).toBe('hello');
            expect(node.startPosition).toEqual(startPos);
            expect(node.endPosition).toEqual(endPos);
            expect(node.startIndex).toBe(0);
            expect(node.endIndex).toBe(5);
        });

        it('should set type to SYNTHETIC_ENTITY', () => {
            const node = createSyntheticNode('test', startPos, endPos);

            expect(node.type).toBe(CommonNodeTypes.SYNTHETIC_ENTITY);
            expect(node.grammarType).toBe(CommonNodeTypes.SYNTHETIC_ENTITY);
        });

        it('should set parent when provided', () => {
            const parentNode = createSyntheticNode('parent', startPos, endPos);
            const childNode = createSyntheticNode('child', startPos, endPos, parentNode);

            expect(childNode.parent).toBe(parentNode);
        });

        it('should set parent to null when not provided', () => {
            const node = createSyntheticNode('test', startPos, endPos);
            expect(node.parent).toBeNull();
        });

        it('should return self for descendantForIndex within bounds', () => {
            const node = createSyntheticNode('hello', startPos, endPos);
            expect(node.descendantForIndex(0)).toBe(node);
            expect(node.descendantForIndex(5)).toBe(node);
        });

        it('should throw for descendantForIndex out of bounds', () => {
            const node = createSyntheticNode('hello', startPos, endPos);
            expect(() => node.descendantForIndex(10)).toThrow('out of bounds');
        });

        it('should return self for namedDescendantForIndex within bounds', () => {
            const node = createSyntheticNode('hello', startPos, endPos);
            expect(node.namedDescendantForIndex(3)).toBe(node);
        });

        it('should throw for namedDescendantForIndex out of bounds', () => {
            const node = createSyntheticNode('hello', startPos, endPos);
            expect(() => node.namedDescendantForIndex(-1)).toThrow('out of bounds');
        });

        it('should return self for descendantForPosition', () => {
            const node = createSyntheticNode('test', startPos, endPos);
            expect(node.descendantForPosition({ row: 0, column: 2 })).toBe(node);
        });

        it('should return self for namedDescendantForPosition', () => {
            const node = createSyntheticNode('test', startPos, endPos);
            expect(node.namedDescendantForPosition({ row: 0, column: 2 })).toBe(node);
        });

        it('should return self in array for descendantsOfType when type matches', () => {
            const node = createSyntheticNode('test', startPos, endPos);
            expect(node.descendantsOfType(CommonNodeTypes.SYNTHETIC_ENTITY)).toEqual([node]);
        });

        it('should return empty array for descendantsOfType when type does not match', () => {
            const node = createSyntheticNode('test', startPos, endPos);
            expect(node.descendantsOfType('other_type')).toEqual([]);
        });

        it('should format toString correctly', () => {
            const node = createSyntheticNode('mytext', startPos, endPos);
            expect(node.toString()).toBe('(synthetic_entity "mytext")');
        });

        it('should have empty children arrays', () => {
            const node = createSyntheticNode('test', startPos, endPos);
            expect(node.children).toEqual([]);
            expect(node.namedChildren).toEqual([]);
            expect(node.childCount).toBe(0);
            expect(node.namedChildCount).toBe(0);
        });

        it('should return null for child accessors', () => {
            const node = createSyntheticNode('test', startPos, endPos);
            expect(node.child(0)).toBeNull();
            expect(node.namedChild(0)).toBeNull();
            expect(node.childForFieldName('key')).toBeNull();
            expect(node.childForFieldId(1)).toBeNull();
            expect(node.fieldNameForChild(0)).toBeNull();
            expect(node.firstChild).toBeNull();
            expect(node.lastChild).toBeNull();
        });
    });
});
