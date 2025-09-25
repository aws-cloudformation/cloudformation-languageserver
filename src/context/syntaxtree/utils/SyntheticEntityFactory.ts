import { Point, SyntaxNode, TreeCursor } from 'tree-sitter';
import { CommonNodeTypes } from './TreeSitterTypes';

/* eslint-disable unicorn/no-null */
export function createSyntheticNode(
    text: string,
    startPosition: Point,
    endPosition: Point,
    parent?: SyntaxNode | null,
): SyntaxNode {
    const startIndex = 0;
    const endIndex = text.length;

    return {
        // @ts-expect-error Cannot create a tree from a synthetic node
        tree: undefined,
        id: Math.random() * 1000000, // eslint-disable-line
        typeId: Number.MAX_SAFE_INTEGER,
        grammarId: Number.MAX_SAFE_INTEGER,
        type: CommonNodeTypes.SYNTHETIC_ENTITY,
        grammarType: CommonNodeTypes.SYNTHETIC_ENTITY,
        isNamed: false,
        isMissing: false,
        isExtra: false,
        hasChanges: false,
        hasError: false,
        isError: false,
        text: text,
        parseState: Number.MAX_SAFE_INTEGER,
        nextParseState: Number.MAX_SAFE_INTEGER,
        startPosition: startPosition,
        endPosition: endPosition,
        startIndex: startIndex,
        endIndex: endIndex,
        parent: parent ?? null,
        children: [],
        namedChildren: [],
        childCount: 0,
        namedChildCount: 0,
        firstChild: null,
        firstNamedChild: null,
        lastChild: null,
        lastNamedChild: null,
        nextSibling: null,
        nextNamedSibling: null,
        previousSibling: null,
        previousNamedSibling: null,
        descendantCount: 0,

        child: () => null,
        namedChild: () => null,
        childForFieldName: () => null,
        childForFieldId: () => null,
        fieldNameForChild: () => null,

        descendantForIndex(index: number): SyntaxNode {
            if (index >= this.startIndex && index <= this.endIndex) {
                return this;
            }
            throw new Error(`Index ${index} is out of bounds for synthetic entity`);
        },
        namedDescendantForIndex(index: number): SyntaxNode {
            if (index >= this.startIndex && index <= this.endIndex) {
                return this;
            }
            throw new Error(`Index ${index} is out of bounds for synthetic entity`);
        },
        descendantForPosition(): SyntaxNode {
            return this;
        },
        namedDescendantForPosition(): SyntaxNode {
            return this;
        },
        descendantsOfType(type: string): SyntaxNode[] {
            if (this.type === type) {
                return [this];
            }
            return [];
        },
        toString: function (): string {
            return `(${this.type} "${this.text}")`;
        },

        fieldNameForNamedChild(_namedChildIndex: number): string | null {
            throw new Error('Function not implemented.');
        },
        childrenForFieldName(_fieldName: string): Array<SyntaxNode> {
            throw new Error('Function not implemented.');
        },
        childrenForFieldId(_fieldId: number): Array<SyntaxNode> {
            throw new Error('Function not implemented.');
        },
        firstChildForIndex(_index: number): SyntaxNode | null {
            throw new Error('Function not implemented.');
        },
        firstNamedChildForIndex(_index: number): SyntaxNode | null {
            throw new Error('Function not implemented.');
        },
        childWithDescendant(_descendant: SyntaxNode): SyntaxNode | null {
            throw new Error('Function not implemented.');
        },
        closest(_types: string | string[]): SyntaxNode | null {
            throw new Error('Function not implemented.');
        },
        walk(): TreeCursor {
            throw new Error('Function not implemented.');
        },
    };
}
