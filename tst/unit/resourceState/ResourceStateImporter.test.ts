import { beforeEach, describe, expect, it, vi } from 'vitest';
import { TextDocuments } from 'vscode-languageserver/node';
import { TextDocument, TextEdit } from 'vscode-languageserver-textdocument';
import { SyntaxTreeManager } from '../../../src/context/syntaxtree/SyntaxTreeManager';
import { DocumentType } from '../../../src/document/Document';
import { DocumentManager } from '../../../src/document/DocumentManager';
import { ResourceStateImporter } from '../../../src/resourceState/ResourceStateImporter';
import { ResourceSelection, ResourceStateImportParams } from '../../../src/resourceState/ResourceStateTypes';
import {
    createMockClientMessage,
    createMockSchemaRetriever,
    createMockStackManagementInfoProvider,
} from '../../utils/MockServerComponents';
import { combinedSchemas } from '../../utils/SchemaUtils';

describe('ResourceStateImporter', () => {
    let mockResourceStateManager: any;
    const documentManager = new DocumentManager(new TextDocuments(TextDocument));
    const syntaxTreeManager = new SyntaxTreeManager(createMockClientMessage());
    const schemaRetriever = createMockSchemaRetriever(combinedSchemas());
    const mockStackManagementInfoProvider = createMockStackManagementInfoProvider();
    let importer: ResourceStateImporter;

    beforeEach(() => {
        // Create a proper mock for ResourceStateManager
        mockResourceStateManager = {
            getResource: vi.fn(),
            listResources: vi.fn(),
            importResourceState: vi.fn(),
        };
        mockStackManagementInfoProvider.getResourceManagementState.resolves({
            physicalResourceId: '',
            managedByStack: undefined,
        });

        importer = new ResourceStateImporter(
            documentManager,
            syntaxTreeManager,
            mockResourceStateManager,
            schemaRetriever,
            mockStackManagementInfoProvider,
        );
    });

    // Test data generators
    const createS3BucketResource = (identifier: string) => ({
        resourceType: 'AWS::S3::Bucket',
        resourceIdentifier: identifier,
        properties: JSON.stringify({
            BucketName: identifier,
            PublicAccessBlockConfiguration: {
                BlockPublicAcls: true,
                BlockPublicPolicy: true,
                IgnorePublicAcls: true,
                RestrictPublicBuckets: true,
            },
        }),
        createdTimestamp: new Date(),
        lastUpdatedTimestamp: new Date(),
    });

    // Helper to create and register a document
    const createAndRegisterDocument = (uri: string, content: string, documentType: DocumentType) => {
        const languageId = documentType === DocumentType.JSON ? 'json' : 'yaml';
        const textDocument = TextDocument.create(uri, languageId, 1, content);

        // Manually add the document to the TextDocuments collection (like TemplateBuilder does)
        (documentManager as any).documents._syncedDocuments.set(uri, textDocument);

        // Add to syntax tree manager if content exists
        if (content.trim()) {
            try {
                syntaxTreeManager.add(uri, content);
            } catch {
                // Ignore syntax tree creation errors in tests
            }
        }

        return textDocument;
    };

    // Simplified test cases for debugging
    const testCases = [
        {
            documentType: DocumentType.JSON,
            hasResourcesSection: false,
            resources: [{ type: 'single', count: 1, resourceType: 'AWS::S3::Bucket' }],
            description: 'JSON - No resources section - Single S3 bucket',
        },
        {
            documentType: DocumentType.JSON,
            hasResourcesSection: true,
            resources: [{ type: 'single', count: 1, resourceType: 'AWS::S3::Bucket' }],
            description: 'JSON - With resources section - Single S3 bucket',
        },
        {
            documentType: DocumentType.YAML,
            hasResourcesSection: false,
            resources: [{ type: 'single', count: 1, resourceType: 'AWS::S3::Bucket' }],
            description: 'YAML - No resources section - Single S3 bucket',
        },
        {
            documentType: DocumentType.YAML,
            hasResourcesSection: true,
            resources: [{ type: 'single', count: 1, resourceType: 'AWS::S3::Bucket' }],
            description: 'YAML - With resources section - Single S3 bucket',
        },
    ];

    for (const testCase of testCases) {
        it(`${testCase.description}`, async () => {
            const uri = `test://test-${testCase.description.replaceAll(/\s+/g, '-').toLowerCase()}.template`;

            // Setup initial document content
            let initialContent: string;
            if (testCase.documentType === DocumentType.JSON) {
                initialContent = testCase.hasResourcesSection
                    ? `{
  "AWSTemplateFormatVersion": "2010-09-09",
  "Resources": {
    "ExistingBucket": {
      "Type": "AWS::S3::Bucket",
      "Properties": {
        "BucketName": "existing-bucket"
      }
    }
  }
}`
                    : `{
  "AWSTemplateFormatVersion": "2010-09-09"
}`;
            } else {
                initialContent = testCase.hasResourcesSection
                    ? `AWSTemplateFormatVersion: "2010-09-09"
Resources:
  ExistingBucket:
    Type: AWS::S3::Bucket
    Properties:
      BucketName: existing-bucket`
                    : `AWSTemplateFormatVersion: "2010-09-09"`;
            }

            // Create and register the document
            // eslint-disable-next-line @typescript-eslint/no-unused-vars
            const textDocument = createAndRegisterDocument(uri, initialContent, testCase.documentType);

            // Setup resource selections and mock resource state manager responses
            const resourceSelections: ResourceSelection[] = [];
            const identifier = 'test-bucket-1';

            const mockResource = createS3BucketResource(identifier);

            // Mock getResource to return the resource state correctly
            mockResourceStateManager.getResource.mockResolvedValue(mockResource);

            resourceSelections.push({
                resourceType: 'AWS::S3::Bucket',
                resourceIdentifiers: [identifier],
            });

            // Execute the import
            const params: ResourceStateImportParams = {
                resourceSelections,
                textDocument: { uri },
                range: { start: { line: 0, character: 0 }, end: { line: 0, character: 0 } },
                context: { diagnostics: [], only: [], triggerKind: 1 },
            };

            const result = await importer.importResourceState(params);

            // Basic assertions - check for edit instead of success
            expect(result.edit).toBeDefined();
            expect(result.edit?.changes).toBeDefined();

            const changes = result.edit!.changes![uri];
            expect(changes).toHaveLength(1);

            const textEdit = changes[0];
            const newText = textEdit.newText;

            // Verify the format is valid JSON/YAML when combined with original
            const fullContent = applyTextEdit(initialContent, textEdit);
            if (testCase.documentType === DocumentType.JSON) {
                expect(() => JSON.parse(fullContent)).not.toThrow();
            } else {
                // For YAML, just check it's not empty and has proper structure
                expect(fullContent).toContain('AWSTemplateFormatVersion');
                expect(fullContent).toContain('Resources');
            }

            // Verify proper comma placement and formatting for existing resources section
            if (testCase.hasResourcesSection) {
                if (testCase.documentType === DocumentType.JSON) {
                    expect(newText).toMatch(/^,/); // Should start with comma
                    expect(newText).toMatch(/^,\s*\n/); // Should have newline after comma
                    expect(newText).not.toMatch(/^, *"[^"]+"/); // Should NOT have resource immediately after comma (same line)
                    expect(newText).toMatch(/^,\n\s*"[^"]+"/); // Should have proper newline separation before resource
                } else {
                    // YAML formatting checks
                    expect(newText).toMatch(/^\n/); // Should start with newline for YAML
                    expect(newText).toContain('Type: AWS::S3::Bucket'); // Should contain resource type
                }
            } else {
                // No existing resources section
                if (testCase.documentType === DocumentType.JSON) {
                    expect(newText).toContain('"Resources"'); // Should add Resources section
                } else {
                    expect(newText).toContain('Resources:'); // Should add Resources section
                }
            }

            // Verify resource content is present
            expect(newText).toContain('AWS::S3::Bucket');
            expect(newText).toContain(identifier);

            // Clean up - remove document from manager
            (documentManager as any).documents._syncedDocuments.delete(uri);
            syntaxTreeManager.deleteSyntaxTree(uri);
        });
    }

    // Test cases for failure scenarios
    describe('Failure scenarios', () => {
        it('should return failure when no resources are selected', async () => {
            const params: ResourceStateImportParams = {
                resourceSelections: undefined as any,
                textDocument: { uri: 'test://test.template' },
                range: { start: { line: 0, character: 0 }, end: { line: 0, character: 0 } },
                context: { diagnostics: [], only: [], triggerKind: 1 },
            };

            const result = await importer.importResourceState(params);

            expect(result.edit).toBeUndefined();
            expect(result.title).toBe('No resources selected for import.');
            expect(Object.keys(result.successfulImports)).toHaveLength(0);
            expect(Object.keys(result.failedImports)).toHaveLength(0);
        });

        it('should return failure when document is not found', async () => {
            const params: ResourceStateImportParams = {
                resourceSelections: [
                    {
                        resourceType: 'AWS::S3::Bucket',
                        resourceIdentifiers: ['test-bucket'],
                    },
                ],
                textDocument: { uri: 'test://nonexistent.template' },
                range: { start: { line: 0, character: 0 }, end: { line: 0, character: 0 } },
                context: { diagnostics: [], only: [], triggerKind: 1 },
            };

            const result = await importer.importResourceState(params);

            expect(result.edit).toBeUndefined();
            expect(result.title).toBe('Import failed. Document not found.');
            expect(Object.keys(result.successfulImports)).toHaveLength(0);
            expect(Object.keys(result.failedImports)).toHaveLength(0);
        });

        it('should return failure when syntax tree is not found', async () => {
            const uri = 'test://test-no-syntax-tree.template';
            const content = '{ "AWSTemplateFormatVersion": "2010-09-09" }';

            // Create document but don't add to syntax tree manager
            const textDocument = TextDocument.create(uri, 'json', 1, content);
            (documentManager as any).documents._syncedDocuments.set(uri, textDocument);

            const params: ResourceStateImportParams = {
                resourceSelections: [
                    {
                        resourceType: 'AWS::S3::Bucket',
                        resourceIdentifiers: ['test-bucket'],
                    },
                ],
                textDocument: { uri },
                range: { start: { line: 0, character: 0 }, end: { line: 0, character: 0 } },
                context: { diagnostics: [], only: [], triggerKind: 1 },
            };

            const result = await importer.importResourceState(params);

            expect(result.edit).toBeUndefined();
            expect(result.title).toBe('Import failed. Syntax tree not found');
            expect(Object.keys(result.successfulImports)).toHaveLength(0);
            expect(Object.keys(result.failedImports)).toHaveLength(0);

            // Cleanup
            (documentManager as any).documents._syncedDocuments.delete(uri);
        });
    });

    // Helper function to apply text edit to content
    function applyTextEdit(content: string, textEdit: TextEdit): string {
        const lines = content.split('\n');
        const startLine = textEdit.range.start.line;
        const startChar = textEdit.range.start.character;
        const endLine = textEdit.range.end.line;
        const endChar = textEdit.range.end.character;

        // Ensure we have enough lines
        while (lines.length <= Math.max(startLine, endLine)) {
            lines.push('');
        }

        if (startLine === endLine) {
            const line = lines[startLine] || '';
            lines[startLine] =
                line.slice(0, Math.max(0, startChar)) + textEdit.newText + line.slice(Math.max(0, endChar));
        } else {
            const newLines = textEdit.newText.split('\n');
            const startLineContent = lines[startLine] || '';
            lines[startLine] = startLineContent.slice(0, Math.max(0, startChar)) + newLines[0];

            for (let i = 1; i < newLines.length; i++) {
                lines.splice(startLine + i, 0, newLines[i]);
            }

            if (newLines.length > 1) {
                const endLineContent = lines[endLine + newLines.length - 1] || '';
                lines[startLine + newLines.length - 1] += endLineContent.slice(Math.max(0, endChar));
            }

            // Remove the original end line and any lines in between
            lines.splice(endLine + newLines.length - 1, endLine - startLine);
        }

        return lines.join('\n');
    }
});
