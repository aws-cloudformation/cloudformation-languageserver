import { StubbedInstance, stubInterface } from 'ts-sinon';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
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

    afterEach(() => {
        documentManager.close();
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

    describe('allDocuments', () => {
        it('should return all documents', () => {
            const doc1 = TextDocument.create(
                'file:///a.yaml',
                'yaml',
                1,
                'Resources:\n  Bucket:\n    Type: AWS::S3::Bucket',
            );
            const doc2 = TextDocument.create(
                'file:///b.yaml',
                'yaml',
                1,
                'Resources:\n  Table:\n    Type: AWS::DynamoDB::Table',
            );

            mockDocuments.all.returns([doc1, doc2]);
            mockDocuments.get.callsFake((uri: string) => (uri === doc1.uri ? doc1 : doc2));

            const docs = documentManager.allDocuments();
            expect(docs).toHaveLength(2);
        });
    });

    describe('getByName', () => {
        it('should find document by filename', () => {
            const doc = TextDocument.create('file:///path/to/template.yaml', 'yaml', 1, 'Resources:');
            mockDocuments.all.returns([doc]);
            mockDocuments.get.returns(doc);

            const found = documentManager.getByName('template.yaml');
            expect(found?.fileName).toBe('template.yaml');
        });

        it('should return undefined for non-existent filename', () => {
            mockDocuments.all.returns([]);
            expect(documentManager.getByName('missing.yaml')).toBeUndefined();
        });
    });

    describe('removeDocument', () => {
        it('should remove document from cache', () => {
            const uri = 'file:///test.yaml';
            const doc = TextDocument.create(uri, 'yaml', 1, 'Resources:');
            mockDocuments.get.returns(doc);

            documentManager.get(uri);
            documentManager.removeDocument(uri);

            // After removal, get should create a new document
            mockDocuments.get.returns(undefined);
            expect(documentManager.get(uri)).toBeUndefined();
        });
    });

    describe('clear', () => {
        it('should clear all cached documents', () => {
            const doc = TextDocument.create('file:///test.yaml', 'yaml', 1, 'Resources:');
            mockDocuments.get.returns(doc);

            documentManager.get('file:///test.yaml');
            documentManager.clear();

            mockDocuments.get.returns(undefined);
            expect(documentManager.get('file:///test.yaml')).toBeUndefined();
        });
    });
});
