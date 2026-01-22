import { StubbedInstance, stubInterface } from 'ts-sinon';
import { beforeEach, describe, expect, it } from 'vitest';
import { TextDocuments } from 'vscode-languageserver/node';
import { TextDocument } from 'vscode-languageserver-textdocument';
import { CloudFormationFileType } from '../../../src/document/Document';
import { DocumentManager } from '../../../src/document/DocumentManager';

describe('DocumentManager', () => {
    let documentManager: DocumentManager;
    let mockDocuments: StubbedInstance<TextDocuments<TextDocument>>;

    beforeEach(() => {
        mockDocuments = stubInterface<TextDocuments<TextDocument>>();
        documentManager = new DocumentManager(mockDocuments);
    });

    describe('CloudFormation file type detection', () => {
        it('should detect CloudFormation template', () => {
            const uri = 'file:///template.yaml';
            const content = 'Resources:\n  Bucket:\n    Type: AWS::S3::Bucket';
            const textDocument = TextDocument.create(uri, 'yaml', 1, content);

            mockDocuments.get.returns(textDocument);

            expect(documentManager.get(uri)?.cfnFileType).toBe(CloudFormationFileType.Template);
            expect(documentManager.isTemplate(uri)).toBe(true);
        });

        it('should return Other for non-CloudFormation files', () => {
            const uri = 'file:///config.yaml';
            const content = 'name: my-app\nversion: 1.0.0';
            const textDocument = TextDocument.create(uri, 'yaml', 1, content);
            mockDocuments.get.returns(textDocument);

            expect(documentManager.get(uri)?.cfnFileType).toBe(CloudFormationFileType.Other);
            expect(documentManager.isTemplate(uri)).toBe(false);
        });

        it('should return undefined for non-existent documents', () => {
            mockDocuments.get.returns(undefined);

            expect(documentManager.get('file:///missing.yaml')?.cfnFileType).toBeUndefined();
            expect(documentManager.isTemplate('file:///missing.yaml')).toBe(false);
        });
    });

    describe('getLine', () => {
        it('should return line from document', () => {
            const uri = 'file:///test.yaml';
            const content = 'line 0\nline 1\nline 2';
            const textDocument = TextDocument.create(uri, 'yaml', 1, content);

            mockDocuments.get.returns(textDocument);

            expect(documentManager.getLine(uri, 0)).toBe('line 0\n');
            expect(documentManager.getLine(uri, 1)).toBe('line 1\n');
            expect(documentManager.getLine(uri, 2)).toBe('line 2');
        });

        it('should return undefined for non-existent document', () => {
            mockDocuments.get.returns(undefined);

            expect(documentManager.getLine('file:///nonexistent.yaml', 0)).toBeUndefined();
        });
    });

    describe('document cache updates', () => {
        it('should cache document on first access', () => {
            const uri = 'file:///test.yaml';
            const content = 'Resources:\n  Bucket:\n    Type: AWS::S3::Bucket';
            const textDocument = TextDocument.create(uri, 'yaml', 1, content);

            mockDocuments.get.returns(textDocument);

            const doc1 = documentManager.get(uri);
            const doc2 = documentManager.get(uri);

            expect(doc1).toBe(doc2);
        });

        it('should return updated content when TextDocument is mutated', () => {
            const uri = 'file:///test.yaml';
            const textDocument = TextDocument.create(uri, 'yaml', 1, 'old content');

            mockDocuments.get.returns(textDocument);

            const doc = documentManager.get(uri);
            expect(doc?.contents()).toBe('old content');

            TextDocument.update(textDocument, [{ text: 'new content' }], 2);

            expect(doc?.contents()).toBe('new content');
        });

        it('should return updated version when TextDocument is mutated', () => {
            const uri = 'file:///test.yaml';
            const textDocument = TextDocument.create(uri, 'yaml', 1, 'content');

            mockDocuments.get.returns(textDocument);

            const doc = documentManager.get(uri);
            expect(doc?.version).toBe(1);

            TextDocument.update(textDocument, [{ text: 'updated' }], 2);

            expect(doc?.version).toBe(2);
        });

        it('should return updated lineCount when TextDocument is mutated', () => {
            const uri = 'file:///test.yaml';
            const textDocument = TextDocument.create(uri, 'yaml', 1, 'line1');

            mockDocuments.get.returns(textDocument);

            const doc = documentManager.get(uri);
            expect(doc?.lineCount).toBe(1);

            TextDocument.update(textDocument, [{ text: 'line1\nline2\nline3' }], 2);

            expect(doc?.lineCount).toBe(3);
        });

        it('should remove document from cache', () => {
            const uri = 'file:///test.yaml';
            const textDocument = TextDocument.create(uri, 'yaml', 1, 'content');

            mockDocuments.get.returns(textDocument);

            const doc1 = documentManager.get(uri);
            expect(doc1).toBeDefined();

            documentManager.removeDocument(uri);

            const doc2 = documentManager.get(uri);
            expect(doc2).not.toBe(doc1);
        });

        it('should recreate document after cache invalidation', () => {
            const uri = 'file:///test.yaml';
            const textDocument = TextDocument.create(uri, 'yaml', 1, 'Resources: {}');

            mockDocuments.get.returns(textDocument);

            const doc1 = documentManager.get(uri);
            expect(doc1?.cfnFileType).toBe(CloudFormationFileType.Template);

            documentManager.removeDocument(uri);

            TextDocument.update(textDocument, [{ text: 'name: app' }], 2);

            const doc2 = documentManager.get(uri);
            expect(doc2).not.toBe(doc1);
            expect(doc2?.cfnFileType).toBe(CloudFormationFileType.Other);
        });
    });
});
