import { describe, it, expect, beforeEach, vi } from 'vitest';
import { DidChangeTextDocumentParams, Range } from 'vscode-languageserver';
import { TextDocument } from 'vscode-languageserver-textdocument';
import { DocumentUri } from 'vscode-languageserver-textdocument/lib/esm/main';
import { SyntaxTreeManager } from '../../../src/context/syntaxtree/SyntaxTreeManager';
import { Document, CloudFormationFileType } from '../../../src/document/Document';
import { createEdit } from '../../../src/document/DocumentUtils';
import {
    didOpenHandler,
    didChangeHandler,
    didCloseHandler,
    didSaveHandler,
} from '../../../src/handlers/DocumentHandler';
import { LintTrigger } from '../../../src/services/cfnLint/CfnLintService';
import { createMockComponents, MockedServerComponents } from '../../utils/MockServerComponents';
import { Templates } from '../../utils/TemplateUtils';
import { flushAllPromises } from '../../utils/Utils';

describe('DocumentHandler', () => {
    let mockServices: MockedServerComponents;
    const testUri: DocumentUri = 'file:///test.yaml';
    const testContent = 'AWSTemplateFormatVersion: "2010-09-09"';

    function createTextDocument() {
        return TextDocument.create(testUri, 'yaml', 1, testContent);
    }

    function createEvent() {
        return { document: createTextDocument() };
    }

    function createMockDocument(cfnFileType = CloudFormationFileType.Template) {
        const textDoc = createTextDocument();
        const doc = new Document(textDoc.uri, () => textDoc);
        (doc as any)._cfnFileType = cfnFileType;
        return doc;
    }

    function mockDocuments(mock: any) {
        (mockServices.documents as any).documents = mock;
    }

    beforeEach(() => {
        vi.clearAllMocks();
        mockServices = createMockComponents();
    });

    describe('didOpenHandler', () => {
        it('should create syntax tree for CloudFormation templates', () => {
            const mockDocument = createMockDocument();
            mockServices.documentManager.get.returns(mockDocument);

            const handler = didOpenHandler(mockServices);
            handler(createEvent());

            expect(
                mockServices.syntaxTreeManager.addWithTypes.calledWith(
                    testUri,
                    testContent,
                    mockDocument.documentType,
                    mockDocument.cfnFileType,
                ),
            ).toBe(true);
        });

        it('should use delayed linting and Guard validation for all files', () => {
            const mockDocument = createMockDocument();
            mockServices.documentManager.get.returns(mockDocument);

            const handler = didOpenHandler(mockServices);
            handler(createEvent());

            expect(mockServices.cfnLintService.lintDelayed.calledWith(testContent, testUri, LintTrigger.OnOpen)).toBe(
                true,
            );
            expect(mockServices.guardService.validateDelayed.calledWith(testContent, testUri)).toBe(true);
        });

        it.each([
            CloudFormationFileType.Template,
            CloudFormationFileType.GitSyncDeployment,
            CloudFormationFileType.Unknown,
        ])('should use delayed linting for %s files', (cfnFileType) => {
            mockServices.documentManager.get.returns(createMockDocument(cfnFileType));

            const handler = didOpenHandler(mockServices);
            handler(createEvent());

            expect(mockServices.cfnLintService.lintDelayed.calledWith(testContent, testUri, LintTrigger.OnOpen)).toBe(
                true,
            );
        });

        it('should handle errors when adding syntax tree', () => {
            const mockDocument = createMockDocument();
            mockServices.documentManager.get.returns(mockDocument);
            mockServices.syntaxTreeManager.addWithTypes.throws(new Error('Syntax error'));

            const handler = didOpenHandler(mockServices);

            expect(() => handler(createEvent())).not.toThrow();
            expect(mockServices.cfnLintService.lintDelayed.called).toBe(true);
            expect(mockServices.guardService.validateDelayed.called).toBe(true);
        });

        it('should handle linting and Guard validation errors gracefully', async () => {
            mockServices.documentManager.get.returns(createMockDocument());
            mockServices.cfnLintService.lintDelayed.rejects(new Error('Linting failed'));
            mockServices.guardService.validateDelayed.rejects(new Error('Guard validation error'));

            const handler = didOpenHandler(mockServices);

            expect(() => handler(createEvent())).not.toThrow();

            // Wait for async operations to complete
            await new Promise((resolve) => setTimeout(resolve, 10));

            expect(mockServices.cfnLintService.lintDelayed.called).toBe(true);
            expect(mockServices.guardService.validateDelayed.called).toBe(true);
        });
    });

    describe('didChangeHandler', () => {
        function createParams(params: any): DidChangeTextDocumentParams {
            return params;
        }

        it('should handle incremental changes and update syntax tree', () => {
            const expectedContent = 'AWSTemplateFormatVersion: "2010-09-10"';
            const textDocument = TextDocument.create(testUri, 'yaml', 1, expectedContent);
            mockDocuments({ get: vi.fn().mockReturnValue(textDocument) });

            mockServices.syntaxTreeManager.getSyntaxTree.returns({
                content: () => testContent,
            } as any);

            const handler = didChangeHandler(mockServices.documents, mockServices);

            handler(
                createParams({
                    textDocument: { uri: testUri },
                    contentChanges: [
                        {
                            range: Range.create(0, 37, 0, 38),
                            text: '0',
                        },
                    ],
                }),
            );

            expect(mockServices.syntaxTreeManager.updateWithEdit.calledOnce).toBe(true);
            expect(
                mockServices.cfnLintService.lintDelayed.calledWith(
                    expectedContent,
                    testUri,
                    LintTrigger.OnChange,
                    true,
                ),
            ).toBe(true);
        });

        it('should apply multiple sequential edits correctly', () => {
            const syntaxTreeManager = new SyntaxTreeManager();
            const testUri = 'file:///test/sample_template.json';
            const expectedUri = 'file:///test/sample_template_expected.json';
            const initialContent = Templates.sample.json.contents;
            const expectedContent = Templates.sampleExpected.json.contents;

            syntaxTreeManager.add(testUri, initialContent);
            syntaxTreeManager.add(expectedUri, expectedContent);

            const changes = [
                { range: { start: { line: 248, character: 40 }, end: { line: 248, character: 40 } }, text: '}' },
                { range: { start: { line: 248, character: 39 }, end: { line: 248, character: 39 } }, text: 'Action' },
                { range: { start: { line: 248, character: 35 }, end: { line: 248, character: 35 } }, text: 'cution' },
                { range: { start: { line: 248, character: 34 }, end: { line: 248, character: 34 } }, text: 'bdaEx' },
                { range: { start: { line: 248, character: 29 }, end: { line: 248, character: 33 } }, text: ' "La' },
                { range: { start: { line: 248, character: 25 }, end: { line: 248, character: 28 } }, text: 'Ref"' },
                { range: { start: { line: 248, character: 24 }, end: { line: 248, character: 24 } }, text: '{' },
                {
                    range: { start: { line: 45, character: 5 }, end: { line: 45, character: 5 } },
                    text: ',\n    "LambdaExecutionRoleAction": {\n      "Type": "String",\n      "Default": "sts:AssumeRole",\n      "Description": ""\n    }\n',
                },
            ];

            let currentContent = initialContent;

            for (const change of changes) {
                const start = { row: change.range.start.line, column: change.range.start.character };
                const end = { row: change.range.end.line, column: change.range.end.character };
                const { edit, newContent } = createEdit(currentContent, change.text, start, end);
                syntaxTreeManager.updateWithEdit(testUri, newContent, edit);
                currentContent = newContent;
            }

            const actualTree = syntaxTreeManager.getSyntaxTree(testUri);
            const expectedTree = syntaxTreeManager.getSyntaxTree(expectedUri);
            expect(actualTree).toBeDefined();
            expect(expectedTree).toBeDefined();

            const actualRoot = actualTree!.getRootNode();
            const expectedRoot = expectedTree!.getRootNode();

            // Check for corruption in actual tree
            const corruptedNodes: string[] = [];
            const errorNodes: string[] = [];

            function walkTree(node: any): void {
                const nodeText = node.text;

                if (nodeText.startsWith(': null')) {
                    corruptedNodes.push(`${node.type} at ${node.startPosition.row}:${node.startPosition.column}`);
                }

                if (node.type === 'ERROR') {
                    errorNodes.push(`ERROR at ${node.startPosition.row}:${node.startPosition.column}`);
                }

                for (let i = 0; i < node.childCount; i++) {
                    walkTree(node.child(i));
                }
            }

            walkTree(actualRoot);

            expect(corruptedNodes, `Found nodes with ": null" corruption:\n${corruptedNodes.join('\n')}`).toHaveLength(
                0,
            );
            expect(errorNodes, `Found ERROR nodes:\n${errorNodes.join('\n')}`).toHaveLength(0);

            // Compare tree structures
            expect(actualRoot.type).toBe(expectedRoot.type);
            expect(actualRoot.hasError).toBe(false);
            expect(expectedRoot.hasError).toBe(false);

            // Compare parsed JSON to ensure semantic equivalence
            const actualJson = JSON.parse(actualTree!.content());
            const expectedJson = JSON.parse(expectedTree!.content());

            expect(actualJson.Parameters.LambdaExecutionRoleAction).toEqual({
                Type: 'String',
                Default: 'sts:AssumeRole',
                Description: '',
            });
            expect(
                actualJson.Resources.LambdaExecutionRole.Properties.AssumeRolePolicyDocument.Statement[0].Action,
            ).toEqual({
                Ref: 'LambdaExecutionRoleAction',
            });

            // Verify overall structure matches
            expect(Object.keys(actualJson)).toEqual(Object.keys(expectedJson));
            expect(Object.keys(actualJson.Parameters)).toEqual(Object.keys(expectedJson.Parameters));
        });

        it('should handle full document replacement and trigger validation', () => {
            const newContent = 'Resources:\n  MyBucket:\n    Type: AWS::S3::Bucket';
            const textDocument = TextDocument.create(testUri, 'yaml', 1, newContent);
            mockDocuments({ get: vi.fn().mockReturnValue(textDocument) });

            const handler = didChangeHandler(mockServices.documents, mockServices);

            handler(
                createParams({
                    textDocument: { uri: testUri },
                    contentChanges: [{ text: newContent }],
                }),
            );

            expect(mockServices.syntaxTreeManager.add.calledWith(testUri, newContent)).toBe(true);
            expect(
                mockServices.cfnLintService.lintDelayed.calledWith(newContent, testUri, LintTrigger.OnChange, true),
            ).toBe(true);
            expect(mockServices.guardService.validateDelayed.calledWith(newContent, testUri)).toBe(true);
        });

        it('should create syntax tree when update fails', () => {
            const textDocument = createTextDocument();
            mockDocuments({ get: vi.fn().mockReturnValue(textDocument) });

            mockServices.syntaxTreeManager.getSyntaxTree.returns({
                content: () => testContent,
            } as any);
            mockServices.syntaxTreeManager.updateWithEdit.throws(new Error('Update failed'));

            const handler = didChangeHandler(mockServices.documents, mockServices);
            handler(
                createParams({
                    textDocument: { uri: testUri },
                    contentChanges: [
                        {
                            range: Range.create(0, 0, 0, 5),
                            text: 'Hello',
                        },
                    ],
                }),
            );

            expect(mockServices.syntaxTreeManager.add.calledWith(testUri, testContent)).toBe(true);
        });

        it('should handle linting and Guard validation cancellation gracefully', async () => {
            const textDocument = createTextDocument();
            mockDocuments({ get: vi.fn().mockReturnValue(textDocument) });
            mockServices.cfnLintService.lintDelayed.rejects(new Error('Request cancelled'));
            mockServices.guardService.validateDelayed.rejects(new Error('Request cancelled'));

            const handler = didChangeHandler(mockServices.documents, mockServices);

            expect(() =>
                handler(
                    createParams({
                        textDocument: { uri: testUri },
                        contentChanges: [{ text: 'new content' }],
                    }),
                ),
            ).not.toThrow();

            // Wait for async operations to complete
            await new Promise((resolve) => setTimeout(resolve, 10));

            expect(mockServices.cfnLintService.lintDelayed.called).toBe(true);
            expect(mockServices.guardService.validateDelayed.called).toBe(true);
        });

        it('should handle missing text document gracefully', () => {
            mockDocuments({ get: vi.fn().mockReturnValue(undefined) });

            const handler = didChangeHandler(mockServices.documents, mockServices);
            expect(() =>
                handler(
                    createParams({
                        textDocument: { uri: testUri },
                        contentChanges: [{ text: 'new content' }],
                    }),
                ),
            ).not.toThrow();
            expect(mockServices.cfnLintService.lintDelayed.called).toBe(false);
            expect(mockServices.guardService.validateDelayed.called).toBe(false);
        });

        it('should return early for non-template documents', () => {
            const textDocument = TextDocument.create(testUri, 'yaml', 1, 'Foo: Bar');
            mockDocuments({ get: vi.fn().mockReturnValue(textDocument) });

            const handler = didChangeHandler(mockServices.documents, mockServices);
            handler(
                createParams({
                    textDocument: { uri: testUri },
                    contentChanges: [{ text: 'not a template' }],
                }),
            );

            expect(mockServices.syntaxTreeManager.add.called).toBe(false);
            expect(mockServices.cfnLintService.lintDelayed.called).toBe(false);
        });

        it('should delete syntax tree when document becomes non-template', () => {
            const textDocument = TextDocument.create(testUri, 'yaml', 1, 'someKey: someValue');
            mockDocuments({ get: vi.fn().mockReturnValue(textDocument) });
            mockServices.syntaxTreeManager.getSyntaxTree.returns({ content: () => 'old content' } as any);

            const handler = didChangeHandler(mockServices.documents, mockServices);
            handler(
                createParams({
                    textDocument: { uri: testUri },
                    contentChanges: [{ text: 'someKey: someValue' }],
                }),
            );

            expect(mockServices.syntaxTreeManager.deleteSyntaxTree.calledWith(testUri)).toBe(true);
        });

        it('should create new tree when no existing tree', () => {
            const newContent = 'Resources:\n  MyBucket:\n    Type: AWS::S3::Bucket';
            const textDocument = TextDocument.create(testUri, 'yaml', 1, newContent);
            mockDocuments({ get: vi.fn().mockReturnValue(textDocument) });
            mockServices.syntaxTreeManager.getSyntaxTree.returns(undefined);

            const handler = didChangeHandler(mockServices.documents, mockServices);
            handler(
                createParams({
                    textDocument: { uri: testUri },
                    contentChanges: [{ text: newContent }],
                }),
            );

            expect(mockServices.syntaxTreeManager.add.calledWith(testUri, newContent)).toBe(true);
        });
    });

    describe('didCloseHandler', () => {
        it('should cancel linting and Guard validation, delete syntax tree, and clear diagnostics', async () => {
            const handler = didCloseHandler(mockServices);
            handler(createEvent());

            expect(mockServices.cfnLintService.cancelDelayedLinting.calledWith(testUri)).toBe(true);
            expect(mockServices.guardService.cancelDelayedValidation.calledWith(testUri)).toBe(true);
            expect(mockServices.syntaxTreeManager.deleteSyntaxTree.calledWith(testUri)).toBe(true);

            // Wait for async operations to complete
            await new Promise((resolve) => setTimeout(resolve, 10));

            expect(mockServices.diagnosticCoordinator.clearDiagnosticsForUri.calledWith(testUri)).toBe(true);
        });

        it('should handle diagnostic coordinator errors gracefully', async () => {
            const handler = didCloseHandler(mockServices);
            mockServices.diagnosticCoordinator.clearDiagnosticsForUri.rejects(new Error('Coordinator error'));

            handler(createEvent());

            await flushAllPromises();

            expect(mockServices.cfnLintService.cancelDelayedLinting.calledWith(testUri)).toBe(true);
            expect(mockServices.guardService.cancelDelayedValidation.calledWith(testUri)).toBe(true);
            expect(mockServices.syntaxTreeManager.deleteSyntaxTree.calledWith(testUri)).toBe(true);
            expect(mockServices.diagnosticCoordinator.clearDiagnosticsForUri.calledWith(testUri)).toBe(true);
        });
    });

    describe('didSaveHandler', () => {
        it('should use delayed linting and Guard validation for files', () => {
            const handler = didSaveHandler(mockServices);
            handler(createEvent());

            expect(mockServices.cfnLintService.lintDelayed.calledWith(testContent, testUri, LintTrigger.OnSave)).toBe(
                true,
            );
            expect(mockServices.guardService.validateDelayed.calledWith(testContent, testUri)).toBe(true);
        });

        it('should handle linting and Guard validation errors gracefully', async () => {
            mockServices.cfnLintService.lintDelayed.rejects(new Error('Linting failed'));
            mockServices.guardService.validateDelayed.rejects(new Error('Guard validation error'));

            const handler = didSaveHandler(mockServices);

            expect(() => handler(createEvent())).not.toThrow();

            // Wait for async operations to complete
            await new Promise((resolve) => setTimeout(resolve, 10));

            expect(mockServices.cfnLintService.lintDelayed.called).toBe(true);
            expect(mockServices.guardService.validateDelayed.called).toBe(true);
        });
    });

    describe('Guard validation integration', () => {
        it('should handle Guard validation errors independently of cfn-lint', async () => {
            mockServices.documentManager.get.returns(createMockDocument());

            // Only Guard validation fails, cfn-lint succeeds
            mockServices.guardService.validateDelayed.rejects(new Error('Guard validation error'));
            mockServices.cfnLintService.lintDelayed.resolves();

            const handler = didOpenHandler(mockServices);
            handler(createEvent());

            // Wait for async operations to complete
            await new Promise((resolve) => setTimeout(resolve, 10));

            expect(mockServices.cfnLintService.lintDelayed.called).toBe(true);
            expect(mockServices.guardService.validateDelayed.called).toBe(true);
            // Both should be called despite Guard validation failing
        });

        it('should handle cfn-lint errors independently of Guard validation', async () => {
            mockServices.documentManager.get.returns(createMockDocument());

            // Only cfn-lint fails, Guard validation succeeds
            mockServices.cfnLintService.lintDelayed.rejects(new Error('Linting error'));
            mockServices.guardService.validateDelayed.resolves();

            const handler = didOpenHandler(mockServices);
            handler(createEvent());

            // Wait for async operations to complete
            await new Promise((resolve) => setTimeout(resolve, 10));

            expect(mockServices.cfnLintService.lintDelayed.called).toBe(true);
            expect(mockServices.guardService.validateDelayed.called).toBe(true);
            // Both should be called despite cfn-lint failing
        });
    });
});
