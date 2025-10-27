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
import { createMockResourceState } from './MockResourceState';
import { TestScenarios, getImportExpectation, getCloneExpectation } from './StateImportExpectation';

describe('ResourceStateImporter', () => {
    let mockResourceStateManager: any;
    let documentManager: DocumentManager;
    let syntaxTreeManager: SyntaxTreeManager;
    let schemaRetriever: ReturnType<typeof createMockSchemaRetriever>;
    const mockStackManagementInfoProvider = createMockStackManagementInfoProvider();
    let importer: ResourceStateImporter;

    beforeEach(() => {
        vi.clearAllMocks();

        // Create fresh instances for each test to prevent memory accumulation
        documentManager = new DocumentManager(new TextDocuments(TextDocument));
        syntaxTreeManager = new SyntaxTreeManager();

        // Mock editor settings with 2 spaces and insertSpaces: true
        (documentManager as any).editorSettings = {
            tabSize: 2,
            insertSpaces: true,
            detectIndentation: false,
        };

        schemaRetriever = createMockSchemaRetriever(combinedSchemas());
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
            const resourceTypes = ['AWS::S3::Bucket', 'AWS::Synthetics::Canary'];

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
                        purpose: ResourceStatePurpose.IMPORT,
                    };

                    const result = await importer.importResourceState(params);

                    expect(result.completionItem).toBeDefined();
                    expect(result.completionItem!.textEdit).toBeDefined();

                    const textEdit = result.completionItem!.textEdit as TextEdit;
                    const newText = textEdit.newText;

                    const expectedText = getImportExpectation(scenario, resourceType);
                    expect(newText).toBe(expectedText);
                    expect(result.successfulImports).toBeDefined();
                    expect(result.failedImports).toBeDefined();
                });
            }
        });

        describe('Clone functionality', () => {
            const resourceTypes = [
                'AWS::S3::Bucket', // Non-required primary identifier
                'AWS::Synthetics::Canary', // Required primary identifier
            ];

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
                        purpose: ResourceStatePurpose.CLONE,
                    };

                    const result = await importer.importResourceState(params);

                    expect(result.completionItem).toBeDefined();
                    expect(result.completionItem!.textEdit).toBeDefined();

                    const textEdit = result.completionItem!.textEdit as TextEdit;
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
                purpose: ResourceStatePurpose.IMPORT,
            };

            const result = await importer.importResourceState(params);

            expect(result.completionItem).toBeUndefined();
            expect(Object.keys(result.successfulImports)).toHaveLength(0);
            expect(Object.keys(result.failedImports)).toHaveLength(0);
        });

        it('should handle document not found', async () => {
            const uri = 'test://non-existent.template';

            const params: ResourceStateParams = {
                resourceSelections: [{ resourceType: 'AWS::S3::Bucket', resourceIdentifiers: ['test-bucket'] }],
                textDocument: { uri } as any,
                purpose: ResourceStatePurpose.IMPORT,
            };

            const result = await importer.importResourceState(params);

            expect(result.completionItem).toBeUndefined();
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
                purpose: ResourceStatePurpose.IMPORT,
            };

            const result = await importer.importResourceState(params);

            expect(result.completionItem).toBeUndefined();
            expect(Object.keys(result.successfulImports)).toHaveLength(0);
            expect(Object.keys(result.failedImports)).toHaveLength(1);
        });

        it('should include warning when importing managed resources', async () => {
            const uri = 'test://test-managed-resources.template';
            const scenario = TestScenarios[0];

            createAndRegisterDocument(uri, scenario.initialContent, scenario.documentType);

            mockStackManagementInfoProvider.getResourceManagementState.resolves({
                physicalResourceId: 'test-bucket',
                managedByStack: true,
                stackName: 'test-stack',
                stackId: 'arn:aws:cloudformation:us-east-1:123456789012:stack/test-stack/guid',
            });

            const mockResource = createMockResourceState('AWS::S3::Bucket');
            mockResourceStateManager.getResource.mockResolvedValue(mockResource);

            const params: ResourceStateParams = {
                resourceSelections: [
                    {
                        resourceType: 'AWS::S3::Bucket',
                        resourceIdentifiers: [mockResource.identifier],
                    },
                ],
                textDocument: { uri } as any,
                purpose: ResourceStatePurpose.IMPORT,
            };

            const result = await importer.importResourceState(params);

            expect(result.warning).toBeDefined();
            expect(result.warning).toContain('Cannot import resources that are already managed by a stack');
            expect(result.warning).toContain('Bucket');
        });

        it('should not include warning when cloning managed resources', async () => {
            const uri = 'test://test-clone-managed.template';
            const scenario = TestScenarios[0];

            createAndRegisterDocument(uri, scenario.initialContent, scenario.documentType);

            mockStackManagementInfoProvider.getResourceManagementState.resolves({
                physicalResourceId: 'test-bucket',
                managedByStack: true,
                stackName: 'test-stack',
                stackId: 'arn:aws:cloudformation:us-east-1:123456789012:stack/test-stack/guid',
            });

            const mockResource = createMockResourceState('AWS::S3::Bucket');
            mockResourceStateManager.getResource.mockResolvedValue(mockResource);

            const params: ResourceStateParams = {
                resourceSelections: [
                    {
                        resourceType: 'AWS::S3::Bucket',
                        resourceIdentifiers: [mockResource.identifier],
                    },
                ],
                textDocument: { uri } as any,
                purpose: ResourceStatePurpose.CLONE,
            };

            const result = await importer.importResourceState(params);

            expect(result.warning).toBeUndefined();
        });

        it('should not include warning when importing unmanaged resources', async () => {
            const uri = 'test://test-unmanaged-resources.template';
            const scenario = TestScenarios[0];

            createAndRegisterDocument(uri, scenario.initialContent, scenario.documentType);

            mockStackManagementInfoProvider.getResourceManagementState.resolves({
                physicalResourceId: 'test-bucket',
                managedByStack: false,
            });

            const mockResource = createMockResourceState('AWS::S3::Bucket');
            mockResourceStateManager.getResource.mockResolvedValue(mockResource);

            const params: ResourceStateParams = {
                resourceSelections: [
                    {
                        resourceType: 'AWS::S3::Bucket',
                        resourceIdentifiers: [mockResource.identifier],
                    },
                ],
                textDocument: { uri } as any,
                purpose: ResourceStatePurpose.IMPORT,
            };

            const result = await importer.importResourceState(params);

            expect(result.warning).toBeUndefined();
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
                purpose: ResourceStatePurpose.IMPORT,
            };

            const result = await importer.importResourceState(params);

            expect(result.completionItem).toBeDefined();
            expect(result.completionItem!.textEdit).toBeDefined();

            const textEdit = result.completionItem!.textEdit as TextEdit;
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
                purpose: ResourceStatePurpose.IMPORT,
            };

            const result = await importer.importResourceState(params);

            expect(result.completionItem).toBeDefined();
            expect(result.completionItem!.textEdit).toBeDefined();

            const textEdit = result.completionItem!.textEdit as TextEdit;
            expect(textEdit.newText).toContain('"IAMRole"');
            expect(textEdit.newText).toContain('"IAMRole1"');
            expect(textEdit.newText).toContain('"IAMRole2"');
        });
    });
});
