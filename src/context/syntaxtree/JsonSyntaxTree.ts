import { DocumentType } from '../../document/Document';
import { ParserFactory } from '../../parser/ParserFactory';
import { SyntaxTree } from './SyntaxTree';
import { ParserType } from './SyntaxTreeFactory';

export class JsonSyntaxTree extends SyntaxTree {
    constructor(content: string, factory: ParserFactory, parserType: ParserType) {
        super(DocumentType.JSON, content, factory, parserType);
    }
}
