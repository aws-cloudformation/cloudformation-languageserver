import { DocumentType } from '../../document/Document';
import { SyntaxTree } from './SyntaxTree';

export class JsonSyntaxTree extends SyntaxTree {
    constructor(content: string) {
        super(DocumentType.JSON, content);
    }
}
