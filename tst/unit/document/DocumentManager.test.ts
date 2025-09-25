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

        it('should return Unknown for non-CloudFormation files', () => {
            const uri = 'file:///config.yaml';
            const content = 'name: my-app\nversion: 1.0.0';
            const textDocument = TextDocument.create(uri, 'yaml', 1, content);
            mockDocuments.get.returns(textDocument);

            expect(documentManager.get(uri)?.cfnFileType).toBe(CloudFormationFileType.Unknown);
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
});
