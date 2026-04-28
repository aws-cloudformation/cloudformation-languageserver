import { DocumentType } from '../../document/Document';
import { ParserFactory } from '../../parser/ParserFactory';
import { SyntaxTree } from './SyntaxTree';
import { ParserType } from './SyntaxTreeFactory';

export class YamlSyntaxTree extends SyntaxTree {
    constructor(content: string, factory: ParserFactory, parserType: ParserType) {
        super(DocumentType.YAML, content, factory, parserType);
    }
}
