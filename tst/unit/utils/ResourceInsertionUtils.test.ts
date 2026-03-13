// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-nocheck
import { stubInterface } from 'ts-sinon';
import { describe, it, expect } from 'vitest';
import { Document, DocumentType } from '../../../src/document/Document';
import { EditorSettings } from '../../../src/settings/Settings';
import {
    getResourceSection,
    getInsertPosition,
    combineResourcesToDocumentFormat,
    generateUniqueLogicalId,
} from '../../../src/utils/ResourceInsertionUtils';
import { createTree } from '../../utils/TestTree';

describe('ResourceInsertionUtils', () => {
    describe('getResourceSection', () => {
        it('should return Resources section node when present', () => {
            const tree = createTree(
                `AWSTemplateFormatVersion: '2010-09-09'
Resources:
  MyBucket:
    Type: AWS::S3::Bucket`,
                DocumentType.YAML,
            );

            const section = getResourceSection(tree);
            expect(section).toBeDefined();
            expect(section?.text).toContain('MyBucket');
        });

        it('should return undefined when Resources section is missing', () => {
            const tree = createTree(
                `AWSTemplateFormatVersion: '2010-09-09'
Parameters:
  Env:
    Type: String`,
                DocumentType.YAML,
            );

            const section = getResourceSection(tree);
            expect(section).toBeUndefined();
        });
    });

    describe('getInsertPosition', () => {
        it('should return position after Resources section for YAML', () => {
            const doc = stubInterface<Document>();
            doc.documentType = DocumentType.YAML;
            doc.getLine.returns('');
            doc.getLineCount.returns(5);

            const mockNode = { endPosition: { row: 4, column: 0 } } as any;

            const result = getInsertPosition(mockNode, doc);
            expect(result.commaPrefixNeeded).toBe(false);
            expect(result.newLineSuffixNeeded).toBe(false);
        });

        it('should return next line when YAML Resources section ends with content', () => {
            const doc = stubInterface<Document>();
            doc.documentType = DocumentType.YAML;
            doc.getLine.returns('    Type: AWS::S3::Bucket');
            doc.getLineCount.returns(5);

            const mockNode = { endPosition: { row: 3, column: 0 } } as any;

            const result = getInsertPosition(mockNode, doc);
            expect(result.position.line).toBe(4);
        });

        it('should return end of document when no Resources section for YAML', () => {
            const doc = stubInterface<Document>();
            doc.documentType = DocumentType.YAML;
            doc.getLine.returns('content');
            doc.getLineCount.returns(3);

            const result = getInsertPosition(undefined, doc);
            expect(result.position.line).toBe(3);
            expect(result.commaPrefixNeeded).toBe(false);
        });

        it('should return last line when YAML document ends with empty line', () => {
            const doc = stubInterface<Document>();
            doc.documentType = DocumentType.YAML;
            doc.getLine.withArgs(2).returns('');
            doc.getLineCount.returns(3);

            const result = getInsertPosition(undefined, doc);
            expect(result.position.line).toBe(2);
        });

        it('should handle JSON with comma prefix needed', () => {
            const doc = stubInterface<Document>();
            doc.documentType = DocumentType.JSON;
            doc.getLineCount.returns(5);
            doc.getLine.withArgs(3).returns('    }');
            doc.getLine.withArgs(2).returns('      "Type": "AWS::S3::Bucket"');

            const mockNode = { endPosition: { row: 4, column: 0 } } as any;

            const result = getInsertPosition(mockNode, doc);
            expect(result.commaPrefixNeeded).toBe(true);
        });

        it('should handle JSON ending with comma', () => {
            const doc = stubInterface<Document>();
            doc.documentType = DocumentType.JSON;
            doc.getLineCount.returns(5);
            doc.getLine.withArgs(3).returns('    },');

            const mockNode = { endPosition: { row: 4, column: 0 } } as any;

            const result = getInsertPosition(mockNode, doc);
            expect(result.commaPrefixNeeded).toBe(false);
            expect(result.newLineSuffixNeeded).toBe(true);
        });

        it('should handle JSON ending with opening brace', () => {
            const doc = stubInterface<Document>();
            doc.documentType = DocumentType.JSON;
            doc.getLineCount.returns(3);
            doc.getLine.withArgs(1).returns('  "Resources": {');

            const mockNode = { endPosition: { row: 2, column: 0 } } as any;

            const result = getInsertPosition(mockNode, doc);
            expect(result.commaPrefixNeeded).toBe(false);
            expect(result.newLineSuffixNeeded).toBe(true);
        });

        it('should handle JSON with undefined previous line', () => {
            const doc = stubInterface<Document>();
            doc.documentType = DocumentType.JSON;
            doc.getLineCount.returns(3);
            doc.getLine.returns(undefined);

            const mockNode = { endPosition: { row: 2, column: 0 } } as any;

            const result = getInsertPosition(mockNode, doc);
            expect(result.commaPrefixNeeded).toBe(false);
        });

        it('should handle JSON with all empty lines (malformed)', () => {
            const doc = stubInterface<Document>();
            doc.documentType = DocumentType.JSON;
            doc.getLineCount.returns(3);
            doc.getLine.returns('   ');

            const mockNode = { endPosition: { row: 2, column: 0 } } as any;

            const result = getInsertPosition(mockNode, doc);
            expect(result.position.line).toBe(3);
        });

        it('should handle JSON without Resources section', () => {
            const doc = stubInterface<Document>();
            doc.documentType = DocumentType.JSON;
            doc.getLineCount.returns(5);
            doc.getLine.withArgs(3).returns('  "Parameters": {}');

            const result = getInsertPosition(undefined, doc);
            expect(result.commaPrefixNeeded).toBe(true);
        });
    });

    describe('combineResourcesToDocumentFormat', () => {
        const editorSettings: EditorSettings = {
            tabSize: 2,
            insertSpaces: true,
        };

        it('should format YAML with existing Resources section', () => {
            const resources = [{ MyBucket: { Type: 'AWS::S3::Bucket' } }];

            const result = combineResourcesToDocumentFormat(resources, DocumentType.YAML, true, editorSettings);

            expect(result).toContain('MyBucket');
            expect(result).toContain('Type: AWS::S3::Bucket');
        });

        it('should format YAML without existing Resources section', () => {
            const resources = [{ MyBucket: { Type: 'AWS::S3::Bucket' } }];

            const result = combineResourcesToDocumentFormat(resources, DocumentType.YAML, false, editorSettings);

            expect(result).toContain('Resources:');
            expect(result).toContain('MyBucket');
        });

        it('should format JSON with existing Resources section', () => {
            const resources = [{ MyBucket: { Type: 'AWS::S3::Bucket' } }];

            const result = combineResourcesToDocumentFormat(resources, DocumentType.JSON, true, editorSettings);

            expect(result).toContain('"MyBucket"');
            expect(result).toContain('"Type": "AWS::S3::Bucket"');
        });

        it('should format JSON without existing Resources section', () => {
            const resources = [{ MyBucket: { Type: 'AWS::S3::Bucket' } }];

            const result = combineResourcesToDocumentFormat(resources, DocumentType.JSON, false, editorSettings);

            expect(result).toContain('"Resources"');
            expect(result).toContain('"MyBucket"');
        });

        it('should combine multiple resources', () => {
            const resources = [{ Bucket1: { Type: 'AWS::S3::Bucket' } }, { Bucket2: { Type: 'AWS::S3::Bucket' } }];

            const result = combineResourcesToDocumentFormat(resources, DocumentType.YAML, true, editorSettings);

            expect(result).toContain('Bucket1');
            expect(result).toContain('Bucket2');
        });
    });

    describe('generateUniqueLogicalId', () => {
        it('should return base ID when not in use', () => {
            const tree = createTree(
                `Resources:
  ExistingBucket:
    Type: AWS::S3::Bucket`,
                DocumentType.YAML,
            );

            const result = generateUniqueLogicalId('NewBucket', tree);
            expect(result).toBe('NewBucket');
        });

        it('should append number when base ID exists', () => {
            const tree = createTree(
                `Resources:
  MyBucket:
    Type: AWS::S3::Bucket`,
                DocumentType.YAML,
            );

            const result = generateUniqueLogicalId('MyBucket', tree);
            expect(result).toBe('MyBucket1');
        });

        it('should increment number until unique', () => {
            const tree = createTree(
                `Resources:
  MyBucket:
    Type: AWS::S3::Bucket
  MyBucket1:
    Type: AWS::S3::Bucket
  MyBucket2:
    Type: AWS::S3::Bucket`,
                DocumentType.YAML,
            );

            const result = generateUniqueLogicalId('MyBucket', tree);
            expect(result).toBe('MyBucket3');
        });

        it('should consider additional IDs set', () => {
            const tree = createTree(
                `Resources:
  MyBucket:
    Type: AWS::S3::Bucket`,
                DocumentType.YAML,
            );

            const additionalIds = new Set(['MyBucket1', 'MyBucket2']);
            const result = generateUniqueLogicalId('MyBucket', tree, additionalIds);
            expect(result).toBe('MyBucket3');
        });
    });
});
