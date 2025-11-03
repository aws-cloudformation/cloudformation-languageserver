import { SyntaxNode } from 'tree-sitter';
import { DocumentType } from '../document/Document';
import { Context, logicalIdAndSection } from './Context';
import { SectionType, TopLevelSection, TopLevelSectionsWithLogicalIdsSet } from './ContextType';
import { contextEntitiesInSections } from './SectionContextBuilder';
import { Entity } from './semantic/Entity';
import { referencedLogicalIds, selectText } from './semantic/LogicalIdReferenceFinder';
import { PropertyPath, SyntaxTree } from './syntaxtree/SyntaxTree';

type RelatedEntitiesType = Map<SectionType, Map<string, Context>>;

export class ContextWithRelatedEntities extends Context {
    private _relatedEntities?: RelatedEntitiesType;

    constructor(
        private readonly relatedEntitiesProvider: () => RelatedEntitiesType,
        node: SyntaxNode,
        pathToRoot: ReadonlyArray<SyntaxNode>,
        propertyPath: PropertyPath,
        documentType: DocumentType,
        entityRootNode: SyntaxNode | undefined,
        entity?: Entity,
    ) {
        super(node, pathToRoot, propertyPath, documentType, entityRootNode, entity);
    }

    public get relatedEntities(): Map<SectionType, Map<string, Context>> {
        this._relatedEntities ??= this.relatedEntitiesProvider();
        return this._relatedEntities;
    }

    override logRecord() {
        return {
            ...super.logRecord(), // eslint-disable-line no-restricted-syntax
            relatedEntities: this.transformNestedMap(this.relatedEntities),
        };
    }

    private transformNestedMap(
        map: Map<SectionType, Map<string, Context>>,
    ): Record<string, Record<string, Record<string, unknown>>> {
        const result: Record<string, Record<string, Record<string, unknown>>> = {};

        for (const [outerKey, innerMap] of map.entries()) {
            result[outerKey] = {};
            for (const [innerKey, value] of innerMap.entries()) {
                result[outerKey][innerKey] = value.entity;
            }
        }

        return result;
    }

    static create(
        currentNode: SyntaxNode,
        pathToRoot: ReadonlyArray<SyntaxNode>,
        propertyPath: PropertyPath,
        entityRootNode: SyntaxNode | undefined,
        tree: SyntaxTree,
        fullEntitySearch: boolean = true,
    ): ContextWithRelatedEntities {
        const provider = () => {
            const { logicalId, section } = logicalIdAndSection(propertyPath);
            if (!logicalId || !TopLevelSectionsWithLogicalIdsSet.has(section)) {
                return new Map();
            }

            const sectionsMap = tree.findTopLevelSections([
                TopLevelSection.Parameters,
                TopLevelSection.Mappings,
                TopLevelSection.Conditions,
                TopLevelSection.Resources,
            ]);

            const logicalIds = referencedLogicalIds(
                selectText(currentNode, fullEntitySearch, entityRootNode),
                logicalId,
                tree.type,
            );

            return contextEntitiesInSections(sectionsMap, tree, logicalIds);
        };

        return new ContextWithRelatedEntities(
            provider,
            currentNode,
            pathToRoot,
            propertyPath,
            tree.type,
            entityRootNode,
        );
    }
}
