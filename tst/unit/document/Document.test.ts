import { describe, expect, it } from 'vitest';
import { TextDocument } from 'vscode-languageserver-textdocument';
import { CloudFormationFileType, Document, DocumentType } from '../../../src/document/Document';

describe('Document', () => {
    describe('constructor', () => {
        it('should create YAML document', () => {
            const content = 'Resources:\n  Bucket:\n    Type: AWS::S3::Bucket';
            const textDocument = TextDocument.create('file:///test.yaml', 'yaml', 1, content);

            const doc = new Document(textDocument);

            expect(doc.extension).toBe('yaml');
            expect(doc.documentType).toBe(DocumentType.YAML);
            expect(doc.contents()).toBe(content);
        });

        it('should create JSON document', () => {
            const content = '{"Resources": {"Bucket": {"Type": "AWS::S3::Bucket"}}}';
            const textDocument = TextDocument.create('file:///test.json', 'json', 1, content);

            const doc = new Document(textDocument);

            expect(doc.extension).toBe('json');
            expect(doc.documentType).toBe(DocumentType.JSON);
            expect(doc.contents()).toBe(content);
        });

        it('should determine type from content for ambiguous extensions', () => {
            const jsonContent = '{"Resources": {}}';
            const textDocument = TextDocument.create('file:///test.template', 'template', 1, jsonContent);

            const doc = new Document(textDocument);

            expect(doc.documentType).toBe(DocumentType.JSON);
        });
    });

    describe('content', () => {
        it('should return current content', () => {
            const content = 'Resources:\n  Bucket:\n    Type: AWS::S3::Bucket';
            const textDocument = TextDocument.create('file:///test.yaml', 'yaml', 1, content);
            const doc = new Document(textDocument);

            expect(doc.contents()).toBe(content);
        });

        it('should return updated content after changes', () => {
            const textDocument = TextDocument.create('file:///test.yaml', 'yaml', 1, 'old');
            const doc = new Document(textDocument);

            TextDocument.update(textDocument, [{ text: 'new content' }], 2);

            expect(doc.contents()).toBe('new content');
        });
    });

    describe('CloudFormation file type', () => {
        it('should return current CloudFormation file type', () => {
            const textDocument = TextDocument.create(
                'file:///test.yaml',
                'yaml',
                1,
                'Resources:\n  Bucket:\n    Type: AWS::S3::Bucket',
            );
            const doc = new Document(textDocument);

            expect(doc.cfnFileType).toBe(CloudFormationFileType.Template);
        });

        it('should handle detection errors gracefully', () => {
            const textDocument = TextDocument.create('file:///test.yaml', 'yaml', 1, 'invalid: [unclosed');
            const doc = new Document(textDocument);

            expect(() => doc.cfnFileType).not.toThrow();
            expect(doc.cfnFileType).toBeDefined();
        });
    });

    describe('getLine', () => {
        it('should return correct line by number', () => {
            const content = 'line 0\nline 1\nline 2';
            const textDocument = TextDocument.create('file:///test.yaml', 'yaml', 1, content);
            const doc = new Document(textDocument);

            expect(doc.getLine(0)).toBe('line 0\n');
            expect(doc.getLine(1)).toBe('line 1\n');
            expect(doc.getLine(2)).toBe('line 2');
        });

        it('should return empty string for negative line number', () => {
            const content = 'line 0\nline 1';
            const textDocument = TextDocument.create('file:///test.yaml', 'yaml', 1, content);
            const doc = new Document(textDocument);

            expect(doc.getLine(-1)).toBe('');
        });

        it('should return empty string for line number beyond content', () => {
            const content = 'line 0\nline 1';
            const textDocument = TextDocument.create('file:///test.yaml', 'yaml', 1, content);
            const doc = new Document(textDocument);

            expect(doc.getLine(2)).toBe('');
            expect(doc.getLine(5)).toBe('');
        });

        it('should handle empty content', () => {
            const textDocument = TextDocument.create('file:///test.yaml', 'yaml', 1, '');
            const doc = new Document(textDocument);

            expect(doc.getLine(0)).toBe('');
            expect(doc.getLine(1)).toBe('');
        });
    });
});
