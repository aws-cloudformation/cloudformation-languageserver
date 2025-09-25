import { stubInterface } from 'ts-sinon';
import { JsonSyntaxTree } from '../../src/context/syntaxtree/JsonSyntaxTree';
import { YamlSyntaxTree } from '../../src/context/syntaxtree/YamlSyntaxTree';
import { DocumentType } from '../../src/document/Document';

export function createTree(content: string, documentType: DocumentType) {
    if (documentType === DocumentType.JSON) {
        return new JsonSyntaxTree(content);
    }

    return new YamlSyntaxTree(content);
}

export function createYamlTree(content: string) {
    return createTree(content, DocumentType.YAML);
}

export function createJsonTree(content: string) {
    return createTree(content, DocumentType.JSON);
}

export function createMockYamlSyntaxTree() {
    const instance = stubInterface<YamlSyntaxTree>();
    (instance as any).type = DocumentType.YAML;
    return instance;
}

export function createMockJsonSyntaxTree() {
    const instance = stubInterface<JsonSyntaxTree>();
    (instance as any).type = DocumentType.JSON;
    return instance;
}
