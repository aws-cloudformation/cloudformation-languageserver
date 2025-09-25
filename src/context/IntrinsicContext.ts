import { SyntaxNode } from 'tree-sitter';
import { DocumentType } from '../document/Document';
import { IntrinsicFunction, IntrinsicsSet } from './ContextType';
import { normalizeIntrinsicFunction } from './semantic/Intrinsics';
import { isLogicalIdCandidate } from './semantic/LogicalIdReferenceFinder';
import { nodeToObject } from './syntaxtree/utils/NodeParse';
import { NodeType } from './syntaxtree/utils/NodeType';
import { YamlNodeTypes } from './syntaxtree/utils/TreeSitterTypes';

export class IntrinsicContext {
    private _context?: IntrinsicFunctionInfo;

    constructor(
        private readonly pathToRoot: ReadonlyArray<SyntaxNode>,
        private readonly documentType: DocumentType,
    ) {}

    public inIntrinsic(): boolean {
        return this.intrinsicFunction() !== undefined;
    }

    public intrinsicFunction(): IntrinsicFunctionInfo | undefined {
        this._context ??= this.findIntrinsicFunction();
        return this._context;
    }

    private findIntrinsicFunction(): IntrinsicFunctionInfo | undefined {
        const cutoff = 3;
        if (this.pathToRoot.length < cutoff) {
            return undefined;
        }

        // Search from current node outward to find the innermost intrinsic function
        for (let i = 0; i < this.pathToRoot.length - cutoff - 1; i++) {
            const node = this.pathToRoot[i];
            const functionType = this.extractIntrinsicData(node);
            if (functionType) {
                return new IntrinsicFunctionInfo(functionType, this.parseIntrinsicArguments(node));
            }
        }

        return undefined;
    }

    private parseIntrinsicArguments(node: SyntaxNode): unknown {
        // Extract value from key-value pairs (JSON/YAML object syntax)
        if (NodeType.isPairNode(node, this.documentType)) {
            const value = NodeType.extractValueFromPair(node, this.documentType);
            if (value) {
                return nodeToObject(value, this.documentType);
            }
        }

        // Extract content from YAML tagged nodes (!Ref, !GetAtt, etc.)
        if (NodeType.isNodeType(node, YamlNodeTypes.BLOCK_NODE, YamlNodeTypes.FLOW_NODE)) {
            const contentNode = node.namedChildren.find((child) => !NodeType.isNodeType(child, YamlNodeTypes.TAG));
            if (contentNode) {
                return nodeToObject(contentNode, this.documentType);
            }
        }

        return nodeToObject(node, this.documentType);
    }

    private extractIntrinsicData(node: SyntaxNode): IntrinsicFunction | undefined {
        // Handle YAML tagged syntax (!Ref, !GetAtt, etc.)
        if (NodeType.isNodeType(node, YamlNodeTypes.BLOCK_NODE, YamlNodeTypes.FLOW_NODE)) {
            const tagNode = node.namedChildren.find((child) => NodeType.isNodeType(child, YamlNodeTypes.TAG));
            if (tagNode) {
                const normalizedKey = this.normalizedIntrinsicKey(tagNode.text);
                return normalizedKey ?? undefined;
            }
        }

        // Handle JSON/YAML object syntax ({"Ref": "..."} or Ref: ...)
        if (NodeType.isPairNode(node, this.documentType)) {
            const key = NodeType.extractKeyFromPair(node, this.documentType);
            if (key) {
                const normalizedKey = this.normalizedIntrinsicKey(key);
                return normalizedKey ?? undefined;
            }
        }

        return undefined;
    }

    private normalizedIntrinsicKey(text: string): IntrinsicFunction | undefined {
        const normalized = normalizeIntrinsicFunction(text);
        return IntrinsicsSet.has(normalized) ? (normalized as IntrinsicFunction) : undefined;
    }

    public record() {
        const intrinsicFunction = this.intrinsicFunction();
        return {
            isInsideIntrinsic: intrinsicFunction !== undefined,
            intrinsicFunction: intrinsicFunction?.record(),
        };
    }
}

class IntrinsicFunctionInfo {
    private _subVariables?: readonly string[];
    private _hasNestedIntrinsics?: boolean;
    private _logicalIds?: readonly string[];

    constructor(
        public readonly type: IntrinsicFunction,
        public readonly args: unknown,
    ) {}

    get subVariables(): readonly string[] {
        this._subVariables ??= this.findSubstitutionVariables(this.args);
        return this._subVariables;
    }

    get logicalIds(): readonly string[] {
        this._logicalIds ??= this.findLogicalIds(this.args);
        return this._logicalIds;
    }

    get hasNestedIntrinsics(): boolean {
        this._hasNestedIntrinsics ??= this.containsNestedIntrinsics(this.args);
        return this._hasNestedIntrinsics;
    }

    private findSubstitutionVariables(args: unknown): ReadonlyArray<string> {
        const variables = new Set<string>();

        const traverse = (value: unknown): void => {
            if (typeof value === 'string') {
                // Find ${variable} patterns in strings
                const matches = value.matchAll(/\$\{([^}]+)}/g);
                for (const match of matches) {
                    this.addToSet(match[1], variables);
                }
            } else if (Array.isArray(value)) {
                for (const element of value) {
                    traverse(element);
                }
            } else if (value && typeof value === 'object') {
                for (const element of Object.values(value)) {
                    traverse(element);
                }
            }
        };

        traverse(args);
        return [...new Set(variables)].sort();
    }

    private findLogicalIds(args: unknown): readonly string[] {
        const potentialIds = new Set<string>();

        // Complex traversal logic to identify logical IDs based on intrinsic function context

        const traverse = (value: unknown, isIntrinsicContext = false): void => {
            if (typeof value === 'string') {
                if (isLogicalIdCandidate(value)) {
                    const normalized = normalizeIntrinsicFunction(value);
                    if (!IntrinsicsSet.has(normalized)) {
                        this.addToSet(value, potentialIds);
                    }
                }
            } else if (Array.isArray(value)) {
                for (const [i, element] of value.entries()) {
                    // Special handling for specific intrinsic functions based on argument position
                    const shouldTraverseAsReference =
                        (this.type === IntrinsicFunction.GetAtt && i === 0) || this.type === IntrinsicFunction.Ref;

                    const shouldTraverseAsIntrinsic = this.type === IntrinsicFunction.FindInMap && i === 1;

                    traverse(element, shouldTraverseAsIntrinsic || (!shouldTraverseAsReference && isIntrinsicContext));
                }
            } else if (value && typeof value === 'object') {
                for (const [key, val] of Object.entries(value)) {
                    const normalizedKey = normalizeIntrinsicFunction(key);
                    if (!IntrinsicsSet.has(normalizedKey) && !isIntrinsicContext && isLogicalIdCandidate(key)) {
                        this.addToSet(key, potentialIds);
                    }
                    traverse(val, true);
                }
            }
        };

        traverse(args, false);
        return [...new Set(potentialIds)].sort();
    }

    private containsNestedIntrinsics(args: unknown): boolean {
        const hasIntrinsics = (value: unknown): boolean => {
            if (!value || typeof value !== 'object') return false;

            if (Array.isArray(value)) {
                return value.some((element) => hasIntrinsics(element));
            }

            return Object.entries(value).some(([key, val]) => {
                const normalized = normalizeIntrinsicFunction(key);
                return IntrinsicsSet.has(normalized) || hasIntrinsics(val);
            });
        };

        return hasIntrinsics(args);
    }

    private addToSet(text: string, set: Set<string>) {
        // Extract base name before any dot notation (e.g., "MyResource.Arn" -> "MyResource")
        set.add(text.split('.')[0].trim());
    }

    public record() {
        return {
            type: this.type,
            args: this.args,
            logicalIds: this.logicalIds,
            subVariables: this.subVariables,
            hasNestedIntrinsics: this.hasNestedIntrinsics,
        };
    }
}
