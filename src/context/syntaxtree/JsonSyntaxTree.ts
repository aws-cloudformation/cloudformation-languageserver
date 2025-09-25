import { SyntaxNode } from 'tree-sitter';
import { DocumentType } from '../../document/Document';
import { TopLevelSection } from '../ContextType';
import { SyntaxTree } from './SyntaxTree';
import { NodeSearch } from './utils/NodeSearch';

export class JsonSyntaxTree extends SyntaxTree {
    constructor(content: string) {
        super(DocumentType.JSON, content);
    }

    override findTopLevelSections(sectionsToFind: TopLevelSection[]): Map<TopLevelSection, SyntaxNode> {
        const result = new Map<TopLevelSection, SyntaxNode>();

        if (sectionsToFind.length === 0) {
            return result;
        }

        const sectionsSet = new Set(sectionsToFind);

        NodeSearch.findSectionsInAllMappingPairs(this.tree.rootNode, sectionsSet, this.type, result);

        return result;
    }
}
