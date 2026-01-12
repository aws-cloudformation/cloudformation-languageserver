import { SyntaxNode } from 'tree-sitter';
import { DocumentType } from '../document/Document';
import { LoggerFactory } from '../telemetry/LoggerFactory';
import { TopLevelSection, TopLevelSectionsWithLogicalIdsSet } from './CloudFormationEnums';
import { Context } from './Context';
import { SectionType } from './semantic/CloudFormationTypes';
import { SyntaxTree } from './syntaxtree/SyntaxTree';
import { NodeType } from './syntaxtree/utils/NodeType';
import { FieldNames, YamlNodeTypes } from './syntaxtree/utils/TreeSitterTypes';

const log = LoggerFactory.getLogger('SectionContextBuilder');

export function contextEntitiesInSections(
    sectionsMap: Map<TopLevelSection, SyntaxNode>,
    syntaxTree: SyntaxTree,
    targetLogicalIds?: Set<string>,
): Map<SectionType, Map<string, Context>> {
    const contexts = new Map<SectionType, Map<string, Context>>();

    for (const [section, sectionNode] of sectionsMap.entries()) {
        if (!TopLevelSectionsWithLogicalIdsSet.has(section)) {
            continue; // For sections like Description, AWSTemplateFormatVersion, etc., skip processing
        }

        let entityNodes: SyntaxNode[];
        try {
            entityNodes = findEntityNodesInSection(sectionNode, syntaxTree.type, targetLogicalIds);
        } catch (error) {
            log.warn(error, `Failed to process entities in section ${section}`);
            continue;
        }

        if (entityNodes.length === 0) {
            continue;
        }

        const entities = new Map<string, Context>();
        for (const entityNode of entityNodes) {
            try {
                const context = getPathAndContext(entityNode, syntaxTree);
                if (context?.logicalId && context.section !== 'Unknown') {
                    entities.set(context.logicalId, context);
                }
            } catch (error) {
                log.warn(error, `Failed to create context for entity in section ${section}`);
            }
        }

        if (entities.size > 0) {
            contexts.set(section, entities);
        }
    }

    return contexts;
}

export function getEntityMap(syntaxTree: SyntaxTree, sectionToFind: TopLevelSection): Map<string, Context> | undefined {
    const sectionNodeMap = syntaxTree.findTopLevelSections([sectionToFind]);
    if (!sectionNodeMap.has(sectionToFind)) {
        return undefined;
    }

    return contextEntitiesInSections(sectionNodeMap, syntaxTree).get(sectionToFind);
}

function getPathAndContext(entityNode: SyntaxNode, tree: SyntaxTree): Context | undefined {
    // If the entityNode is a pair node, we need to call getPathAndEntityInfo on one of its children
    // to get the correct property path that includes the pair's key
    let nodeForPath = entityNode;
    if (NodeType.isPairNode(entityNode, tree.type)) {
        const keyChild = entityNode.childForFieldName(FieldNames.KEY);
        if (keyChild) {
            nodeForPath = keyChild;
        }
    }

    const pathInfo = tree.getPathAndEntityInfo(nodeForPath);
    if (pathInfo) {
        return new Context(entityNode, pathInfo.path, pathInfo.propertyPath, tree.type, pathInfo.entityRootNode);
    }
}

function findEntityNodesInSection(
    sectionNode: SyntaxNode,
    type: DocumentType,
    targetLogicalIds?: Set<string>,
): SyntaxNode[] {
    const entityNodes: SyntaxNode[] = [];

    // 1. Get the value of the section, which should be a mapping node.
    let mappingNode = NodeType.extractValueFromPair(sectionNode, type);
    if (!mappingNode) {
        return [];
    }

    // For YAML, the extracted value might be a block_node that contains a block_mapping
    if (type === DocumentType.YAML && NodeType.isNodeType(mappingNode, YamlNodeTypes.BLOCK_NODE)) {
        // Look for a block_mapping child within the block_node
        const blockMapping = mappingNode.namedChildren.find((child) =>
            NodeType.isNodeType(child, YamlNodeTypes.BLOCK_MAPPING),
        );
        if (blockMapping) {
            mappingNode = blockMapping;
        }
    }

    if (!NodeType.isMappingNode(mappingNode, type)) {
        return [];
    }

    // 2. Iterate through it is named children, which are the entity pairs.
    for (const entityPairNode of mappingNode.namedChildren) {
        if (NodeType.isPairNode(entityPairNode, type)) {
            // If target logical ids are provided, check if the entity's key matches.
            if (targetLogicalIds) {
                const key = NodeType.extractKeyFromPair(entityPairNode, type);
                if (!key || !targetLogicalIds.has(key)) {
                    continue;
                }
            }
            // This is a valid entity definition.
            entityNodes.push(entityPairNode);
        }
    }

    return entityNodes;
}
