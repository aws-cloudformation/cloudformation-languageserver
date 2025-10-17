import { DocumentType } from '../../document/Document';
import { SyntaxTree } from './SyntaxTree';

export class YamlSyntaxTree extends SyntaxTree {
    constructor(content: string) {
        super(DocumentType.YAML, content);
    }
}
