import { SyntaxNode } from 'tree-sitter';
import { DocumentType } from '../document/Document';
import { removeQuotes } from '../utils/String';
import {
    IntrinsicsSet,
    PseudoParametersSet,
    ResourceAttributesSet,
    TopLevelSection,
    TopLevelSectionsSet,
    TopLevelSectionsWithLogicalIdsSet,
} from './ContextType';
import { IntrinsicContext } from './IntrinsicContext';
import { Entity } from './semantic/Entity';
import { nodeToEntity } from './semantic/EntityBuilder';
import { normalizeIntrinsicFunction } from './semantic/Intrinsics';
import { PropertyPath } from './syntaxtree/SyntaxTree';
import { NodeType } from './syntaxtree/utils/NodeType';
import { YamlNodeTypes, CommonNodeTypes } from './syntaxtree/utils/TreeSitterTypes';

export type SectionType = TopLevelSection | 'Unknown';
export type QuoteCharacter = '"' | "'";

export class Context {
    public readonly section: SectionType;
    public readonly isTopLevel: boolean;
    public readonly logicalId?: string;
    public readonly hasLogicalId: boolean;
    public readonly text: string;
    public readonly entitySection?: string | number;

    public readonly isResourceType: boolean;
    public readonly isIntrinsicFunc: boolean;
    public readonly isPseudoParameter: boolean;
    public readonly isResourceAttribute: boolean;

    private _intrinsicContext?: IntrinsicContext;

    constructor(
        private readonly node: SyntaxNode,
        private readonly pathToRoot: ReadonlyArray<SyntaxNode>,
        public readonly propertyPath: PropertyPath,
        public readonly documentType: DocumentType,
        public readonly entityRootNode: SyntaxNode | undefined,
        private _entity?: Entity, // Lazy loading
    ) {
        const { section, logicalId } = logicalIdAndSection(propertyPath);
        this.section = section;
        this.isTopLevel = this.propertyPath.length < 2 && !NodeType.containsMultipleSections(node);
        this.logicalId = logicalId;
        this.hasLogicalId = this.logicalId !== undefined;

        this.text = removeQuotes(this.node.text).trim();
        this.isResourceType = NodeType.isResourceType(this.text);
        this.isPseudoParameter = PseudoParametersSet.has(this.text);
        this.isResourceAttribute = ResourceAttributesSet.has(this.text);
        this.isIntrinsicFunc = this.isIntrinsicFunction(this.text);
        this.entitySection = this.hasLogicalId ? this.propertyPath[2] : undefined;
    }

    public get entity(): Entity {
        this._entity ??= nodeToEntity(this.documentType, this.entityRootNode, this.section, this.logicalId);
        return this._entity;
    }

    public get intrinsicContext(): IntrinsicContext {
        this._intrinsicContext ??= new IntrinsicContext(this.pathToRoot, this.documentType);
        return this._intrinsicContext;
    }

    public get startPosition() {
        return this.node.startPosition;
    }

    public get endPosition() {
        return this.node.endPosition;
    }

    public get syntaxNode() {
        return this.node;
    }

    public getRootEntityText() {
        return this.entityRootNode?.text;
    }

    public isKey() {
        // SYNTHETIC_KEY_OR_VALUE can be both key and value
        if (NodeType.isNodeType(this.node, CommonNodeTypes.SYNTHETIC_KEY_OR_VALUE)) {
            return true;
        }

        // Check if we're on a different row than the key (indented on next line)
        const isOnDifferentRow = this.isOnDifferentRowThanKey();

        return (
            this.propertyPath.at(-1) === this.text ||
            NodeType.isNodeType(this.node, CommonNodeTypes.SYNTHETIC_KEY) ||
            isOnDifferentRow
        );
    }

    public textInQuotes(): QuoteCharacter | undefined {
        if (NodeType.isNodeType(this.node, YamlNodeTypes.DOUBLE_QUOTE_SCALAR)) {
            return '"';
        } else if (NodeType.isNodeType(this.node, YamlNodeTypes.SINGLE_QUOTE_SCALAR)) {
            return "'";
        }

        return undefined;
    }

    public isValue() {
        // SYNTHETIC_KEY_OR_VALUE can be both key and value
        if (NodeType.isNodeType(this.node, CommonNodeTypes.SYNTHETIC_KEY_OR_VALUE)) {
            return true;
        }

        // SYNTHETIC_KEY should only be a key, not a value
        if (NodeType.isNodeType(this.node, CommonNodeTypes.SYNTHETIC_KEY)) {
            return false;
        }

        // Check if we're on a different row than the key (indented on next line)
        const isOnDifferentRow = this.isOnDifferentRowThanKey();

        // If we're on a different row, we could be a key and a value
        if (isOnDifferentRow) {
            return true;
        }

        // If we're positioned on the property name itself, it's a key not a value
        return !(this.propertyPath.at(-1) === this.text);
    }

    public isResourceAttributeProperty(): boolean {
        if (this.section !== TopLevelSection.Resources || !this.hasLogicalId) {
            return false;
        }
        const resourceAttributeIndex = this.propertyPath.findIndex((segment) =>
            ResourceAttributesSet.has(segment as string),
        );

        if (resourceAttributeIndex === -1) {
            return false;
        }
        return this.propertyPath.length > resourceAttributeIndex + 1;
    }

    public isResourceAttributeValue(): boolean {
        if (this.section !== TopLevelSection.Resources || !this.hasLogicalId) {
            return false;
        }

        if (this.propertyPath.length !== 3) {
            return false;
        }

        const attributeName = this.propertyPath[2] as string;
        if (!ResourceAttributesSet.has(attributeName)) {
            return false;
        }

        if (this.text === attributeName) {
            return false;
        }

        return this.isValue();
    }

    public getResourceAttributePropertyPath(): string[] {
        const resourceAttributeIndex = this.propertyPath.findIndex((segment) =>
            ResourceAttributesSet.has(segment as string),
        );

        if (resourceAttributeIndex === -1) {
            return [];
        }

        return this.propertyPath.slice(resourceAttributeIndex) as string[];
    }

    private isOnDifferentRowThanKey(): boolean {
        // Find the parent block_mapping_pair node to get the key position
        let current = this.node.parent;
        while (current) {
            // if we are in a FLOW (nested JSON) then just return FALSE because this doesn't apply
            if (NodeType.isNodeType(current, YamlNodeTypes.FLOW_MAPPING, YamlNodeTypes.FLOW_SEQUENCE)) {
                return false;
            } else if (NodeType.isNodeType(current, YamlNodeTypes.BLOCK_MAPPING_PAIR)) {
                // If current node starts on a different row than the key, it could be a new key
                return current.startPosition.row < this.node.startPosition.row;
            }
            current = current.parent;
        }

        return false;
    }

    public atBlockMappingLevel() {
        return this.node.type === (YamlNodeTypes.BLOCK_MAPPING as string);
    }

    private isIntrinsicFunction(text: string): boolean {
        return IntrinsicsSet.has(normalizeIntrinsicFunction(text));
    }

    // Matches SectionType, ignores LogicalId, then matches the paths provided after logicalId
    public matchPathWithLogicalId(section: SectionType, ...paths: string[]) {
        if (section !== this.section) {
            return false;
        }

        if (!this.hasLogicalId) {
            return false;
        }

        if (paths.length > 0 && this.propertyPath.length < 3) {
            return false;
        }

        for (const [idx, path] of paths.entries()) {
            if (this.propertyPath[idx + 2] !== path) {
                return false;
            }
        }

        return true;
    }

    public atEntityKeyLevel() {
        if (!this.hasLogicalId) {
            return false;
        }

        // Case 1: If we are over 3 we know for sure we are beyond the entity level
        if (this.propertyPath.length > 3) {
            return false;
        }

        // Case 2: Two situations exist that we need to account for:
        // isKey and isValue can be True when at the first key inside a value
        // when we are at level 2 this means we are at Entity/LogicalId as the first key
        // when we are at level 3 this means we are at Entity/LogicalId/Properties as the first key
        if (this.isKey() && this.isValue()) {
            if (this.propertyPath.length === 2) {
                return true;
            } else if (this.propertyPath.length === 3) {
                return false;
            }
        }

        // Case 3 propertyPath.length === 2 (e.g., ['Resources', 'MyResource'])
        // We need to see if the cursor is in the resource logical id
        if (this.propertyPath.length === 2 && this.text === this.logicalId) {
            return false;
        }

        // Catch all at this point to say that the isKey is the most important thing
        return this.isKey();
    }

    public getMappingKeys(): string[] {
        if (!NodeType.isMappingNode(this.node, this.documentType)) {
            return [];
        }

        const keys: string[] = [];
        for (const child of this.node.children) {
            const key = NodeType.extractKeyFromPair(child, this.documentType);
            if (key !== undefined) {
                keys.push(key);
            }
        }
        return keys;
    }

    public createContextFromParent(stopCondition: (node: SyntaxNode) => boolean): Context | undefined {
        let current = this.node.parent;
        let pathIndex = this.pathToRoot.length - 1; // Start from parent

        while (current && pathIndex >= 0) {
            if (stopCondition(current)) {
                const parentPath = this.pathToRoot.slice(0, pathIndex + 1);
                const parentPropertyPath = this.propertyPath.slice(0, pathIndex + 1);

                return new Context(
                    current,
                    parentPath,
                    parentPropertyPath,
                    this.documentType,
                    this.entityRootNode,
                    this._entity,
                );
            }
            current = current.parent;
            pathIndex--;
        }
        return undefined;
    }

    public record() {
        return {
            section: this.section,
            logicalId: this.logicalId,
            text: this.text,
            nodeType: this.node.type,
            propertyPath: this.propertyPath,
            entitySection: this.entitySection,
            metadata: `isTopLevel=${this.isTopLevel}, isResourceType=${this.isResourceType}, isIntrinsicFunction=${this.isIntrinsicFunc}, isPseudoParameter=${this.isPseudoParameter}, isResourceAttribute=${this.isResourceAttribute}`,
            node: { start: this.node.startPosition, end: this.node.endPosition },
            root: { start: this.entityRootNode?.startPosition, end: this.entityRootNode?.endPosition },
            entity: this.entity,
            intrinsicContext: this.intrinsicContext.record(),
            isKey: this.isKey(),
            isValue: this.isValue(),
        };
    }
}

export function logicalIdAndSection(propertyPath: PropertyPath) {
    const section = findSection(propertyPath);
    let logicalId: string | undefined;

    if (propertyPath.length > 1 && section !== 'Unknown' && TopLevelSectionsWithLogicalIdsSet.has(section)) {
        logicalId = propertyPath[1] as string;
    }

    return {
        section,
        logicalId,
    };
}

function findSection(propertyPath: PropertyPath): SectionType {
    if (propertyPath.length > 0) {
        const topLevelKey = propertyPath[0] as string;
        if (TopLevelSectionsSet.has(topLevelKey)) {
            return topLevelKey as TopLevelSection;
        }
    }
    return 'Unknown';
}
