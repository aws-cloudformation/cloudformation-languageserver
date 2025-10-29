/* eslint-disable @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-argument, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-explicit-any */
import { SyntaxNode } from 'tree-sitter';
import { DocumentType } from '../../document/Document';
import { LoggerFactory } from '../../telemetry/LoggerFactory';
import { SectionType } from '../Context';
import { TopLevelSection, TopLevelSectionsWithLogicalIdsSet } from '../ContextType';
import { nodeToObject, parseSyntheticNode } from '../syntaxtree/utils/NodeParse';
import { NodeType } from '../syntaxtree/utils/NodeType';
import { CommonNodeTypes } from '../syntaxtree/utils/TreeSitterTypes';
import {
    Condition,
    ForEachResource,
    Mapping,
    Metadata,
    Output,
    Parameter,
    Resource,
    Rule,
    Transform,
    Unknown,
} from './Entity';

const log = LoggerFactory.getLogger('EntityBuilder');

export function nodeToEntity(type: DocumentType, node: SyntaxNode | undefined, section: SectionType, id?: string) {
    if (!node) {
        return new Unknown();
    }

    let entityObject: any;
    try {
        if (NodeType.isPairNode(node, type)) {
            entityObject = nodeToObject(NodeType.extractValueFromPair(node, type), type);
        } else if (NodeType.isNodeType(node, CommonNodeTypes.ERROR, CommonNodeTypes.SYNTHETIC_ENTITY)) {
            entityObject = parseSyntheticNode(node, type);
            if (id !== undefined && typeof entityObject === 'object' && Object.keys(entityObject).includes(id)) {
                entityObject = entityObject[id];
            }
        } else if (!id || !TopLevelSectionsWithLogicalIdsSet.has(section)) {
            entityObject = nodeToObject(node, type);
        } else {
            entityObject = nodeToObject(node, type)?.[id];
        }
    } catch (error) {
        log.error({ error }, 'Error creating entity');
        entityObject = undefined;
    }

    const logicalId = id ?? 'Unknown';
    return createEntityFromObject(logicalId, entityObject, section);
}

/**
 * Creates an entity from a parsed data object
 */
export function createEntityFromObject(logicalId: string, entityObject: any, section: SectionType) {
    // Create typed entity based on CloudFormation section
    switch (section) {
        case TopLevelSection.Parameters: {
            return Parameter.from(logicalId, entityObject);
        }
        case TopLevelSection.Resources: {
            if (logicalId.startsWith('Fn::ForEach')) {
                const loopName = logicalId.replace('Fn::ForEach::', '');
                const identifier = Array.isArray(entityObject) ? entityObject[0] : undefined;
                const collection = Array.isArray(entityObject) ? entityObject[1] : undefined;
                const outputMap = Array.isArray(entityObject) ? entityObject[2] : {};
                const [key, value]: [string, any] = Object.entries(outputMap ?? {})[0] || [undefined, {}];
                const resourceInsideForEach = new Resource(
                    key,
                    value?.Type,
                    value?.Properties,
                    value?.DependsOn,
                    value?.Condition,
                    value?.Metadata,
                    value?.CreationPolicy,
                    value?.DeletionPolicy,
                    value?.UpdatePolicy,
                    value?.UpdateReplacePolicy,
                );
                return new ForEachResource(loopName, identifier, collection, resourceInsideForEach);
            }
            return new Resource(
                logicalId,
                entityObject?.Type,
                entityObject?.Properties,
                entityObject?.DependsOn,
                entityObject?.Condition,
                entityObject?.Metadata,
                entityObject?.CreationPolicy,
                entityObject?.DeletionPolicy,
                entityObject?.UpdatePolicy,
                entityObject?.UpdateReplacePolicy,
            );
        }
        case TopLevelSection.Outputs: {
            return new Output(
                logicalId,
                entityObject?.Value,
                entityObject?.Description,
                entityObject?.Export,
                entityObject?.Condition,
            );
        }
        case TopLevelSection.Mappings: {
            return new Mapping(logicalId, entityObject);
        }
        case TopLevelSection.Conditions: {
            return new Condition(logicalId, entityObject);
        }
        case TopLevelSection.Rules: {
            return new Rule(logicalId, entityObject?.RuleCondition, entityObject?.Assertions);
        }
        case TopLevelSection.Metadata: {
            return new Metadata(logicalId, entityObject);
        }
        case TopLevelSection.Transform: {
            return new Transform(entityObject);
        }
        default: {
            return new Unknown(entityObject);
        }
    }
}
