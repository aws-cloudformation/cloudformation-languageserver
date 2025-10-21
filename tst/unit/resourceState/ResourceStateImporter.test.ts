import { beforeEach, describe, expect, it, vi } from 'vitest';
import { TextDocuments } from 'vscode-languageserver/node';
import { TextDocument, TextEdit } from 'vscode-languageserver-textdocument';
import { SyntaxTreeManager } from '../../../src/context/syntaxtree/SyntaxTreeManager';
import { DocumentType } from '../../../src/document/Document';
import { DocumentManager } from '../../../src/document/DocumentManager';
import { ResourceStateImporter } from '../../../src/resourceState/ResourceStateImporter';
import {
    ResourceSelection,
    ResourceStateParams,
    ResourceStatePurpose,
} from '../../../src/resourceState/ResourceStateTypes';
import { createMockSchemaRetriever, createMockStackManagementInfoProvider } from '../../utils/MockServerComponents';
import { combinedSchemas } from '../../utils/SchemaUtils';
import { createMockResourceState, MockResourceStates } from './MockResourceState';
import { TestScenarios, getImportExpectation, getCloneExpectation } from './StateImportExpectation';

describe('ResourceStateImporter', () => {
    let mockResourceStateManager: any;
    const documentManager = new DocumentManager(new TextDocuments(TextDocument));
    const syntaxTreeManager = new SyntaxTreeManager();
    const schemaRetriever = createMockSchemaRetriever(combinedSchemas());
    const mockStackManagementInfoProvider = createMockStackManagementInfoProvider();
    let importer: ResourceStateImporter;

    beforeEach(() => {
        vi.clearAllMocks();

        mockResourceStateManager = {
            getResource: vi.fn(),
            listResources: vi.fn(),
            importResourceState: vi.fn(),
        };
        mockStackManagementInfoProvider.getResourceManagementState.resolves({
            physicalResourceId: '',
            managedByStack: true,
            stackName: 'test-stack',
        });

        importer = new ResourceStateImporter(
            documentManager,
            syntaxTreeManager,
            mockResourceStateManager,
            schemaRetriever,
            mockStackManagementInfoProvider,
        );
    });

    function createAndRegisterDocument(uri: string, content: string, documentType: DocumentType): TextDocument {
        const languageId = documentType === DocumentType.JSON ? 'json' : 'yaml';
        const textDocument = TextDocument.create(uri, languageId, 1, content);

        (documentManager as any).documents._syncedDocuments.set(uri, textDocument);

        if (content.trim()) {
            try {
                syntaxTreeManager.add(uri, content);
            } catch {
                // Ignore syntax tree creation errors in tests
            }
        }

        return textDocument;
    }

    describe.each(TestScenarios)('$name', (scenario) => {
        describe('Import functionality', () => {
            const resourceTypes = Object.keys(MockResourceStates);

            for (const resourceType of resourceTypes) {
                it(`should import ${resourceType} with exact expected output`, async () => {
                    const uri = `test://test-import-${resourceType.toLowerCase().replaceAll('::', '-')}-${scenario.name.toLowerCase().replaceAll(' ', '-')}.template`;

                    createAndRegisterDocument(uri, scenario.initialContent, scenario.documentType);

                    const mockResource = createMockResourceState(resourceType);
                    const resourceSelections: ResourceSelection[] = [
                        {
                            resourceType,
                            resourceIdentifiers: [mockResource.identifier],
                        },
                    ];

                    mockResourceStateManager.getResource.mockResolvedValue(mockResource);

                    const params: ResourceStateParams = {
                        resourceSelections,
                        textDocument: { uri } as any,
                        range: { start: { line: 0, character: 0 }, end: { line: 0, character: 0 } },
                        context: { diagnostics: [], only: [], triggerKind: 1 },
                        purpose: ResourceStatePurpose.IMPORT,
                    };

                    const result = await importer.importResourceState(params);

                    expect(result.edit).toBeDefined();
                    expect(result.edit!.changes![uri]).toBeDefined();

                    const textEdit = result.edit!.changes![uri][0] as TextEdit;
                    const newText = textEdit.newText;

                    const expectedText = getImportExpectation(scenario, resourceType);
                    expect(newText).toBe(expectedText);

                    expect(newText).not.toContain('<CLONE INPUT REQUIRED>');
                    expect(result.successfulImports).toBeDefined();
                    expect(result.failedImports).toBeDefined();
                });
            }
        });

        describe('Clone functionality', () => {
            const resourceTypes = Object.keys(MockResourceStates);

            for (const resourceType of resourceTypes) {
                it(`should clone ${resourceType} with exact expected output`, async () => {
                    const uri = `test://test-clone-${resourceType.toLowerCase().replaceAll('::', '-')}-${scenario.name.toLowerCase().replaceAll(' ', '-')}.template`;

                    createAndRegisterDocument(uri, scenario.initialContent, scenario.documentType);

                    const mockResource = createMockResourceState(resourceType);
                    const resourceSelections: ResourceSelection[] = [
                        {
                            resourceType,
                            resourceIdentifiers: [mockResource.identifier],
                        },
                    ];

                    mockResourceStateManager.getResource.mockResolvedValue(mockResource);

                    const params: ResourceStateParams = {
                        resourceSelections,
                        textDocument: { uri } as any,
                        range: { start: { line: 0, character: 0 }, end: { line: 0, character: 0 } },
                        context: { diagnostics: [], only: [], triggerKind: 1 },
                        purpose: ResourceStatePurpose.CLONE,
                    };

                    const result = await importer.importResourceState(params);

                    expect(result.edit).toBeDefined();
                    expect(result.edit!.changes![uri]).toBeDefined();

                    const textEdit = result.edit!.changes![uri][0] as TextEdit;
                    const newText = textEdit.newText;

                    const expectedText = getCloneExpectation(scenario, resourceType);
                    expect(newText).toBe(expectedText);

                    expect(result.successfulImports).toBeDefined();
                    expect(result.failedImports).toBeDefined();
                });
            }
        });
    });

    describe('Error handling', () => {
        it('should handle no resources selected', async () => {
            const uri = 'test://test-no-resources.template';
            const scenario = TestScenarios[0]; // Use first scenario

            createAndRegisterDocument(uri, scenario.initialContent, scenario.documentType);

            const params: ResourceStateParams = {
                resourceSelections: [],
                textDocument: { uri } as any,
                range: { start: { line: 0, character: 0 }, end: { line: 0, character: 0 } },
                context: { diagnostics: [], only: [], triggerKind: 1 },
                purpose: ResourceStatePurpose.IMPORT,
            };

            const result = await importer.importResourceState(params);

            expect(result.edit).toBeDefined();
            expect(result.title).toBe('Resource State Import');
            expect(Object.keys(result.successfulImports)).toHaveLength(0);
            expect(Object.keys(result.failedImports)).toHaveLength(0);
        });

        it('should handle document not found', async () => {
            const uri = 'test://non-existent.template';

            const params: ResourceStateParams = {
                resourceSelections: [{ resourceType: 'AWS::S3::Bucket', resourceIdentifiers: ['test-bucket'] }],
                textDocument: { uri } as any,
                range: { start: { line: 0, character: 0 }, end: { line: 0, character: 0 } },
                context: { diagnostics: [], only: [], triggerKind: 1 },
                purpose: ResourceStatePurpose.IMPORT,
            };

            const result = await importer.importResourceState(params);

            expect(result.edit).toBeUndefined();
            expect(result.title).toBe('Import failed. Document not found.');
            expect(Object.keys(result.successfulImports)).toHaveLength(0);
            expect(Object.keys(result.failedImports)).toHaveLength(0);
        });

        it('should handle syntax tree not found', async () => {
            const uri = 'test://test-no-syntax-tree.template';
            const scenario = TestScenarios[0]; // Use first scenario

            createAndRegisterDocument(uri, scenario.initialContent, scenario.documentType);

            const params: ResourceStateParams = {
                resourceSelections: [{ resourceType: 'AWS::S3::Bucket', resourceIdentifiers: ['test-bucket'] }],
                textDocument: { uri } as any,
                range: { start: { line: 0, character: 0 }, end: { line: 0, character: 0 } },
                context: { diagnostics: [], only: [], triggerKind: 1 },
                purpose: ResourceStatePurpose.IMPORT,
            };

            const result = await importer.importResourceState(params);

            expect(result.edit).toBeDefined();
            expect(result.title).toBe('Resource State Import');
            expect(Object.keys(result.successfulImports)).toHaveLength(0);
            expect(Object.keys(result.failedImports)).toHaveLength(1);
        });
    });

    describe('Logical ID uniqueness', () => {
        it('should generate unique logical IDs with numeric suffixes', async () => {
            const uri = 'test://test-unique-ids.template';
            const initialContent = `{
  "AWSTemplateFormatVersion": "2010-09-09",
  "Resources": {
    "IAMRole": {
      "Type": "AWS::IAM::Role",
      "Properties": {
        "RoleName": "ExistingRole"
      }
    },
    "IAMRole1": {
      "Type": "AWS::IAM::Role",
      "Properties": {
        "RoleName": "ExistingRole1"
      }
    }
  }
}`;

            createAndRegisterDocument(uri, initialContent, DocumentType.JSON);

            const mockResource = createMockResourceState('AWS::IAM::Role');
            const resourceSelections: ResourceSelection[] = [
                {
                    resourceType: 'AWS::IAM::Role',
                    resourceIdentifiers: [mockResource.identifier],
                },
            ];

            mockResourceStateManager.getResource.mockResolvedValue(mockResource);

            const params: ResourceStateParams = {
                resourceSelections,
                textDocument: { uri } as any,
                range: { start: { line: 0, character: 0 }, end: { line: 0, character: 0 } },
                context: { diagnostics: [], only: [], triggerKind: 1 },
                purpose: ResourceStatePurpose.IMPORT,
            };

            const result = await importer.importResourceState(params);

            expect(result.edit).toBeDefined();
            expect(result.edit!.changes![uri]).toBeDefined();

            const textEdit = result.edit!.changes![uri][0];
            expect(textEdit.newText).toContain('"IAMRole2"');
            expect(textEdit.newText).not.toContain('"IAMRole"');
            expect(textEdit.newText).not.toContain('"IAMRole1"');
        });

        it('should generate multiple unique logical IDs in same import', async () => {
            const uri = 'test://test-multiple-unique-ids.template';
            const initialContent = `{
  "AWSTemplateFormatVersion": "2010-09-09",
  "Resources": {}
}`;

            createAndRegisterDocument(uri, initialContent, DocumentType.JSON);

            const mockResource1 = createMockResourceState('AWS::IAM::Role');
            const mockResource2 = createMockResourceState('AWS::IAM::Role');
            const mockResource3 = createMockResourceState('AWS::IAM::Role');

            const resourceSelections: ResourceSelection[] = [
                {
                    resourceType: 'AWS::IAM::Role',
                    resourceIdentifiers: [mockResource1.identifier, mockResource2.identifier, mockResource3.identifier],
                },
            ];

            mockResourceStateManager.getResource.mockResolvedValue(mockResource1);

            const params: ResourceStateParams = {
                resourceSelections,
                textDocument: { uri } as any,
                range: { start: { line: 0, character: 0 }, end: { line: 0, character: 0 } },
                context: { diagnostics: [], only: [], triggerKind: 1 },
                purpose: ResourceStatePurpose.IMPORT,
            };

            const result = await importer.importResourceState(params);

            expect(result.edit).toBeDefined();
            expect(result.edit!.changes![uri]).toBeDefined();

            const textEdit = result.edit!.changes![uri][0];
            expect(textEdit.newText).toContain('"IAMRole"');
            expect(textEdit.newText).toContain('"IAMRole1"');
            expect(textEdit.newText).toContain('"IAMRole2"');
        });
    });
});
