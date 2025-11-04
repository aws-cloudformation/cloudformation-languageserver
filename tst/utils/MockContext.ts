import { Point, SyntaxNode } from 'tree-sitter';
import { Position } from 'vscode-languageserver';
import { Context } from '../../src/context/Context';
import { SectionType, TopLevelSection } from '../../src/context/ContextType';
import { ContextWithRelatedEntities } from '../../src/context/ContextWithRelatedEntities';
import {
    Condition,
    Entity,
    ForEachResource,
    Mapping,
    Output,
    Parameter,
    Resource,
    Unknown,
} from '../../src/context/semantic/Entity';
import { PropertyPath } from '../../src/context/syntaxtree/SyntaxTree';
import { DocumentType } from '../../src/document/Document';
import { createYamlTree } from './TestTree';

type ContextParams = {
    text: string;
    type: DocumentType;
    entity: Entity;
    propertyPath: PropertyPath;
    startPosition: Point;
    endPosition: Point;
    nodeType?: string;
    node: SyntaxNode;
};

type EntityTypeParams = {
    text: string;
    type: DocumentType;
    data: any;
    propertyPath: PropertyPath;
    nodeType?: string;
};

const defaultContextParams: Partial<ContextParams> = {
    text: 'SomeText',
    entity: new Unknown(),
    type: DocumentType.YAML,
};

function node(text: string, startPosition?: Point, endPosition?: Point, type?: string): SyntaxNode {
    const mockNode: Partial<SyntaxNode> = {
        text,
        startPosition,
        endPosition,
        type,
        parent: null,
        childCount: 0,
        child: () => null,
        childForFieldName: () => null,
        descendantsOfType: () => [],
        namedChildren: [],
        children: [],
    };
    return mockNode as SyntaxNode;
}

export function createMockContext(
    section: string,
    logicalId: string | undefined = undefined,
    other?: Partial<ContextParams>,
) {
    return createMockContextWithRelatedEntity(section, logicalId, new Map(), other);
}

export function createMockContextWithRelatedEntity(
    section: string,
    logicalId: string | undefined = undefined,
    relatedEntities = new Map(),
    other?: Partial<ContextParams>,
) {
    const [data, propPath] = getContextDataAndProp(section, logicalId, other);
    return new ContextWithRelatedEntities(
        () => relatedEntities,
        node(
            data.text ?? '',
            data.startPosition ?? { row: 1, column: 2 },
            data.endPosition ?? { row: 1, column: 4 },
            data.nodeType,
        ),
        [],
        propPath,
        data.type!,
        undefined,
        data.entity,
    );
}

function getContextDataAndProp(
    section: string,
    logicalId: string | undefined = undefined,
    other?: Partial<ContextParams>,
): [Partial<ContextParams>, PropertyPath] {
    const data = {
        ...defaultContextParams,
        ...other,
    };
    let propPath: PropertyPath;
    if (data.propertyPath !== undefined) {
        propPath = data.propertyPath;
    } else if (logicalId === undefined) {
        propPath = [section];
    } else {
        propPath = [section, logicalId];
    }

    return [data, propPath];
}

export function createTopLevelContext(section: string, other?: Partial<ContextParams>) {
    return createMockContext(section, undefined, other);
}

export function createParameterContext(logicalId: string, other?: Partial<EntityTypeParams>) {
    return createMockContext(TopLevelSection.Parameters, logicalId, {
        text: other?.text,
        type: other?.type,
        propertyPath: other?.propertyPath,
        entity: Parameter.from(logicalId, other?.data),
    });
}

export function createResourceContext(
    logicalId: string,
    other?: Partial<EntityTypeParams>,
    relatedEntities?: Map<SectionType, Map<string, Context>>,
) {
    return createMockContextWithRelatedEntity(TopLevelSection.Resources, logicalId, relatedEntities, {
        text: other?.text,
        type: other?.type,
        propertyPath: other?.propertyPath,
        nodeType: other?.nodeType,
        entity: new Resource(
            logicalId,
            other?.data?.Type,
            other?.data?.Properties,
            other?.data?.DependsOn,
            other?.data?.Condition,
            other?.data?.Metadata,
            other?.data?.CreationPolicy,
            other?.data?.DeletionPolicy,
            other?.data?.UpdatePolicy,
            other?.data?.UpdateReplacePolicy,
        ),
    });
}

export function createForEachResourceContext(
    forEachName: string,
    resourceKey: string,
    other?: Partial<EntityTypeParams>,
    relatedEntities?: Map<SectionType, Map<string, Context>>,
) {
    const resource = new Resource(
        resourceKey,
        other?.data?.Type,
        other?.data?.Properties,
        other?.data?.DependsOn,
        other?.data?.Condition,
        other?.data?.Metadata,
        other?.data?.CreationPolicy,
        other?.data?.DeletionPolicy,
        other?.data?.UpdatePolicy,
        other?.data?.UpdateReplacePolicy,
    );

    return createMockContextWithRelatedEntity(TopLevelSection.Resources, forEachName, relatedEntities, {
        text: other?.text,
        type: other?.type,
        propertyPath: other?.propertyPath,
        nodeType: other?.nodeType,
        entity: new ForEachResource(forEachName, other?.data?.identifier, other?.data?.collection, resource),
    });
}

export function createConditionContext(logicalId: string, other?: Partial<EntityTypeParams>) {
    return createMockContext(TopLevelSection.Conditions, logicalId, {
        text: other?.text,
        type: other?.type,
        propertyPath: other?.propertyPath,
        entity: new Condition(logicalId, other?.data),
    });
}

export function createMappingContext(logicalId: string, other?: Partial<EntityTypeParams>) {
    return createMockContext(TopLevelSection.Mappings, logicalId, {
        text: other?.text,
        type: other?.type,
        propertyPath: other?.propertyPath,
        entity: new Mapping(logicalId, other?.data),
    });
}

export function createOutputContext(logicalId: string, other?: Partial<EntityTypeParams>) {
    return createMockContext(TopLevelSection.Outputs, logicalId, {
        text: other?.text,
        type: other?.type,
        propertyPath: other?.propertyPath,
        entity: new Output(
            logicalId,
            other?.data?.Value,
            other?.data?.Description,
            other?.data?.Export,
            other?.data?.Condition,
        ),
    });
}

export function createContextFromYamlContentAndPath(content: string, position: Position): Context {
    const tree = createYamlTree(content);
    const node = tree.getNodeAtPosition(position);
    const pathAndEntity = tree.getPathAndEntityInfo(node);
    return new Context(
        node,
        pathAndEntity.path,
        pathAndEntity.propertyPath,
        DocumentType.YAML,
        pathAndEntity.entityRootNode,
    );
}
