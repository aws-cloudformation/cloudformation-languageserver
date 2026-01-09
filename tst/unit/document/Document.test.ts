import { describe, expect, it } from 'vitest';
import { TextDocument } from 'vscode-languageserver-textdocument';
import { CloudFormationFileType, DocumentType } from '../../../src/document/Document';
import { createDocument } from '../../utils/Utils';

describe('Document', () => {
    describe('constructor', () => {
        it('should create YAML document', () => {
            const content = 'Resources:\n  Bucket:\n    Type: AWS::S3::Bucket';
            const textDocument = TextDocument.create('file:///test.yaml', 'yaml', 1, content);

            const doc = createDocument(textDocument);

            expect(doc.extension).toBe('yaml');
            expect(doc.documentType).toBe(DocumentType.YAML);
            expect(doc.contents()).toBe(content);
        });

        it('should create JSON document', () => {
            const content = '{"Resources": {"Bucket": {"Type": "AWS::S3::Bucket"}}}';
            const textDocument = TextDocument.create('file:///test.json', 'json', 1, content);

            const doc = createDocument(textDocument);

            expect(doc.extension).toBe('json');
            expect(doc.documentType).toBe(DocumentType.JSON);
            expect(doc.contents()).toBe(content);
        });

        it('should determine type from content for ambiguous extensions', () => {
            const jsonContent = '{"Resources": {}}';
            const textDocument = TextDocument.create('file:///test.template', 'template', 1, jsonContent);

            const doc = createDocument(textDocument);

            expect(doc.documentType).toBe(DocumentType.JSON);
        });
    });

    describe('content', () => {
        it('should return current content', () => {
            const content = 'Resources:\n  Bucket:\n    Type: AWS::S3::Bucket';
            const textDocument = TextDocument.create('file:///test.yaml', 'yaml', 1, content);
            const doc = createDocument(textDocument);

            expect(doc.contents()).toBe(content);
        });

        it('should return updated content after changes', () => {
            const textDocument = TextDocument.create('file:///test.yaml', 'yaml', 1, 'old');
            const doc = createDocument(textDocument);

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
            const doc = createDocument(textDocument);

            expect(doc.cfnFileType).toBe(CloudFormationFileType.Template);
        });

        it('should handle detection errors gracefully', () => {
            const textDocument = TextDocument.create('file:///test.yaml', 'yaml', 1, 'invalid: [unclosed');
            const doc = createDocument(textDocument);

            expect(() => doc.cfnFileType).not.toThrow();
            expect(doc.cfnFileType).toBeDefined();
        });
    });

    describe('getLine', () => {
        it('should return correct line by number', () => {
            const content = 'line 0\nline 1\nline 2';
            const textDocument = TextDocument.create('file:///test.yaml', 'yaml', 1, content);
            const doc = createDocument(textDocument);

            expect(doc.getLine(0)).toBe('line 0\n');
            expect(doc.getLine(1)).toBe('line 1\n');
            expect(doc.getLine(2)).toBe('line 2');
        });

        it('should return empty string for negative line number', () => {
            const content = 'line 0\nline 1';
            const textDocument = TextDocument.create('file:///test.yaml', 'yaml', 1, content);
            const doc = createDocument(textDocument);

            expect(doc.getLine(-1)).toBe('');
        });

        it('should return empty string for line number beyond content', () => {
            const content = 'line 0\nline 1';
            const textDocument = TextDocument.create('file:///test.yaml', 'yaml', 1, content);
            const doc = createDocument(textDocument);

            expect(doc.getLine(2)).toBe('');
            expect(doc.getLine(5)).toBe('');
        });

        it('should handle empty content', () => {
            const textDocument = TextDocument.create('file:///test.yaml', 'yaml', 1, '');
            const doc = createDocument(textDocument);

            expect(doc.getLine(0)).toBe('');
            expect(doc.getLine(1)).toBe('');
        });
    });

    describe('getParsedDocumentContent', () => {
        it('should parse JSON document content', () => {
            const content = '{"Resources": {"Bucket": {"Type": "AWS::S3::Bucket"}}}';
            const textDocument = TextDocument.create('file:///test.json', 'json', 1, content);
            const doc = createDocument(textDocument);

            const parsed = doc.getParsedDocumentContent();

            expect(parsed).toEqual({
                Resources: {
                    Bucket: {
                        Type: 'AWS::S3::Bucket',
                    },
                },
            });
        });

        it('should parse YAML document content', () => {
            const content = 'Resources:\n  Bucket:\n    Type: AWS::S3::Bucket';
            const textDocument = TextDocument.create('file:///test.yaml', 'yaml', 1, content);
            const doc = createDocument(textDocument);

            const parsed = doc.getParsedDocumentContent();

            expect(parsed).toEqual({
                Resources: {
                    Bucket: {
                        Type: 'AWS::S3::Bucket',
                    },
                },
            });
        });

        it('should return undefined for invalid JSON', () => {
            const content = '{"invalid": json}';
            const textDocument = TextDocument.create('file:///test.json', 'json', 1, content);
            const doc = createDocument(textDocument);

            expect(doc.getParsedDocumentContent()).toBeUndefined();
        });

        it('should return undefined for invalid YAML', () => {
            const content = 'key: value\n  invalid: indentation';
            const textDocument = TextDocument.create('file:///test.yaml', 'yaml', 1, content);
            const doc = createDocument(textDocument);

            expect(doc.getParsedDocumentContent()).toBeUndefined();
        });
    });

    describe('CloudFormation detection', () => {
        describe('should detect CloudFormation templates', () => {
            it('with languageId cloudformation', () => {
                const content = '{}'; // Empty content
                const textDocument = TextDocument.create('file:///test.json', 'cloudformation', 1, content);
                const doc = createDocument(textDocument);

                expect(doc.cfnFileType).toBe(CloudFormationFileType.Template);
            });

            it('with AWSTemplateFormatVersion', () => {
                const content = '{"AWSTemplateFormatVersion": "2010-09-09"}';
                const textDocument = TextDocument.create('file:///test.json', 'json', 1, content);
                const doc = createDocument(textDocument);

                expect(doc.cfnFileType).toBe(CloudFormationFileType.Template);
            });

            it('with Resources', () => {
                const content = '{"Resources": {"Bucket": {"Type": "AWS::S3::Bucket"}}}';
                const textDocument = TextDocument.create('file:///test.json', 'json', 1, content);
                const doc = createDocument(textDocument);

                expect(doc.cfnFileType).toBe(CloudFormationFileType.Template);
            });

            it('with Transform', () => {
                const content = '{"Transform": "AWS::Serverless-2016-10-31"}';
                const textDocument = TextDocument.create('file:///test.json', 'json', 1, content);
                const doc = createDocument(textDocument);

                expect(doc.cfnFileType).toBe(CloudFormationFileType.Template);
            });

            it('YAML template with Resources', () => {
                const content = 'Resources:\n  Bucket:\n    Type: AWS::S3::Bucket';
                const textDocument = TextDocument.create('file:///test.yaml', 'yaml', 1, content);
                const doc = createDocument(textDocument);

                expect(doc.cfnFileType).toBe(CloudFormationFileType.Template);
            });
        });

        describe('should detect GitSync deployment files', () => {
            it('with template-file-path', () => {
                const content = '{"template-file-path": "./template.yaml"}';
                const textDocument = TextDocument.create('file:///test.json', 'json', 1, content);
                const doc = createDocument(textDocument);

                expect(doc.cfnFileType).toBe(CloudFormationFileType.GitSyncDeployment);
            });

            it('with templateFilePath', () => {
                const content = 'templateFilePath: ./template.yaml';
                const textDocument = TextDocument.create('file:///test.yaml', 'yaml', 1, content);
                const doc = createDocument(textDocument);

                expect(doc.cfnFileType).toBe(CloudFormationFileType.GitSyncDeployment);
            });
        });

        describe('should reject non-CloudFormation files', () => {
            it('changeset diff JSON', () => {
                const content = `{
                    "StackId": "arn:aws:cloudformation:us-east-1:123456789012:stack/MyStack/1a2345b6-0000-00a0-a123-00abc0abc000",
                    "Parameters": [
                        {
                            "ParameterValue": "testing",
                            "ParameterKey": "Purpose"
                        }
                    ],
                    "Changes": [
                        {
                            "ResourceChange": {
                                "ResourceType": "AWS::EC2::Instance",
                                "Action": "Modify"
                            }
                        }
                    ]
                }`;
                const textDocument = TextDocument.create('file:///test.json', 'json', 1, content);
                const doc = createDocument(textDocument);

                expect(doc.cfnFileType).toBe(CloudFormationFileType.Other);
            });

            it('package.json with CloudFormation-like keys', () => {
                const content = '{"name": "my-package", "Parameters": {"env": "prod"}, "Outputs": {"build": "dist"}}';
                const textDocument = TextDocument.create('file:///test.json', 'json', 1, content);
                const doc = createDocument(textDocument);

                expect(doc.cfnFileType).toBe(CloudFormationFileType.Other);
            });

            it('nested Resources key', () => {
                const content = `{
                    "name": "my-app",
                    "config": {
                        "Resources": {
                            "memory": "512MB"
                        }
                    }
                }`;
                const textDocument = TextDocument.create('file:///test.json', 'json', 1, content);
                const doc = createDocument(textDocument);

                expect(doc.cfnFileType).toBe(CloudFormationFileType.Other);
            });
        });

        describe('should handle empty content', () => {
            it('empty file should be Empy', () => {
                const content = '';
                const textDocument = TextDocument.create('file:///test.json', 'json', 1, content);
                const doc = createDocument(textDocument);

                expect(doc.cfnFileType).toBe(CloudFormationFileType.Empty);
            });

            it('whitespace-only file should be Empy', () => {
                const content = '   \n\n  \t  ';
                const textDocument = TextDocument.create('file:///test.yaml', 'yaml', 1, content);
                const doc = createDocument(textDocument);

                expect(doc.cfnFileType).toBe(CloudFormationFileType.Empty);
            });

            it('string only should be Empty', () => {
                const content = '\nRe\n';
                const textDocument = TextDocument.create('file:///test.yaml', 'yaml', 1, content);
                const doc = createDocument(textDocument);

                expect(doc.cfnFileType).toBe(CloudFormationFileType.Empty);
            });
        });

        describe('should maintain stateful behavior', () => {
            it('should keep Template status when content becomes unparseable', () => {
                // Start with valid CloudFormation template
                const validContent = '{"AWSTemplateFormatVersion": "2010-09-09", "Resources": {}}';
                const textDocument = TextDocument.create('file:///test.json', 'json', 1, validContent);
                const doc = createDocument(textDocument);

                expect(doc.cfnFileType).toBe(CloudFormationFileType.Template);

                // Simulate content change to invalid JSON (missing closing brace)
                Object.defineProperty(textDocument, 'getText', {
                    value: () => '{"AWSTemplateFormatVersion": "2010-09-09", "Resources": {',
                });

                doc.updateCfnFileType();

                // Should maintain Template status despite being unparseable
                expect(doc.cfnFileType).toBe(CloudFormationFileType.Template);
            });
        });
    });

    describe('indentation detection', () => {
        it('should use fallback tabSize for empty file', () => {
            const textDocument = TextDocument.create('file:///test.yaml', 'yaml', 1, '');
            const doc = new Document(textDocument, true, 4);

            expect(doc.getTabSize(true)).toBe(4);
        });

        it('should detect 2-space indentation from content', () => {
            const content = 'Resources:\n  Bucket:\n    Type: AWS::S3::Bucket';
            const textDocument = TextDocument.create('file:///test.yaml', 'yaml', 1, content);
            const doc = new Document(textDocument, true, 4);

            expect(doc.getTabSize(true)).toBe(2);
        });

        it('should detect 4-space indentation from content', () => {
            const content = 'Resources:\n    Bucket:\n        Type: AWS::S3::Bucket';
            const textDocument = TextDocument.create('file:///test.yaml', 'yaml', 1, content);
            const doc = new Document(textDocument, true, 2);

            expect(doc.getTabSize(true)).toBe(4);
        });

        it('should use fallback when detectIndentation is disabled', () => {
            const content = 'Resources:\n  Bucket:\n    Type: AWS::S3::Bucket';
            const textDocument = TextDocument.create('file:///test.yaml', 'yaml', 1, content);
            const doc = new Document(textDocument, false, 4);

            expect(doc.getTabSize(false)).toBe(4);
        });

        it('should lazily detect indentation when content is added after creation', () => {
            // Start with empty content
            const textDocument = TextDocument.create('file:///test.yaml', 'yaml', 1, '');
            const doc = new Document(textDocument, true, 4);

            // Initially uses fallback
            expect(doc.getTabSize(true)).toBe(4);

            // Simulate user typing with 2-space indentation
            Object.defineProperty(textDocument, 'getText', {
                value: () => 'Resources:\n  Bucket:',
            });

            // Should now detect 2-space indentation
            expect(doc.getTabSize(true)).toBe(2);
        });

        it('should not re-detect once indentation is detected', () => {
            const content = 'Resources:\n  Bucket:';
            const textDocument = TextDocument.create('file:///test.yaml', 'yaml', 1, content);
            const doc = new Document(textDocument, true, 4);

            // First call detects 2-space
            expect(doc.getTabSize(true)).toBe(2);

            // Simulate content change to 4-space indentation
            Object.defineProperty(textDocument, 'getText', {
                value: () => 'Resources:\n    Bucket:',
            });

            // Should still return 2 (already detected)
            expect(doc.getTabSize(true)).toBe(2);
        });

        it('should reset detection when processIndentation is called with detectIndentation=false', () => {
            const content = 'Resources:\n  Bucket:';
            const textDocument = TextDocument.create('file:///test.yaml', 'yaml', 1, content);
            const doc = new Document(textDocument, true, 4);

            expect(doc.getTabSize(true)).toBe(2);

            // Reset with detectIndentation disabled
            doc.processIndentation(false, 8);

            expect(doc.getTabSize(false)).toBe(8);
        });
    });
});
