import { stubInterface } from 'ts-sinon';
import { describe, it, beforeEach, expect } from 'vitest';
import { CodeActionParams, CodeActionKind, Range } from 'vscode-languageserver';
import { Context } from '../../../src/context/Context';
import { ContextManager } from '../../../src/context/ContextManager';
import { SyntaxTree } from '../../../src/context/syntaxtree/SyntaxTree';
import { SyntaxTreeManager } from '../../../src/context/syntaxtree/SyntaxTreeManager';
import { Document, DocumentType } from '../../../src/document/Document';
import { DocumentManager } from '../../../src/document/DocumentManager';
import { CodeActionService } from '../../../src/services/CodeActionService';
import { ExtractToParameterProvider } from '../../../src/services/extractToParameter/ExtractToParameterProvider';
import { ExtractToParameterResult } from '../../../src/services/extractToParameter/ExtractToParameterTypes';

describe('CodeActionService - Extract to Parameter Integration', () => {
    let codeActionService: CodeActionService;
    let mockSyntaxTreeManager: ReturnType<typeof stubInterface<SyntaxTreeManager>>;
    let mockDocumentManager: ReturnType<typeof stubInterface<DocumentManager>>;
    let mockContextManager: ReturnType<typeof stubInterface<ContextManager>>;
    let mockExtractToParameterProvider: ReturnType<typeof stubInterface<ExtractToParameterProvider>>;
    let mockSyntaxTree: ReturnType<typeof stubInterface<SyntaxTree>>;
    let mockDocument: ReturnType<typeof stubInterface<Document>>;
    let mockContext: ReturnType<typeof stubInterface<Context>>;

    beforeEach(() => {
        mockSyntaxTreeManager = stubInterface<SyntaxTreeManager>();
        mockDocumentManager = stubInterface<DocumentManager>();
        mockContextManager = stubInterface<ContextManager>();
        mockExtractToParameterProvider = stubInterface<ExtractToParameterProvider>();
        mockSyntaxTree = stubInterface<SyntaxTree>();
        mockDocument = stubInterface<Document>();
        mockContext = stubInterface<Context>();

        // Create CodeActionService with mocked dependencies
        codeActionService = new CodeActionService(
            mockSyntaxTreeManager,
            mockDocumentManager,
            mockContextManager,
            mockExtractToParameterProvider,
        );
    });

    describe('RefactorExtract context detection', () => {
        it('should detect RefactorExtract context and offer Extract to Parameter action', () => {
            const range: Range = {
                start: { line: 5, character: 10 },
                end: { line: 5, character: 20 },
            };

            const params: CodeActionParams = {
                textDocument: { uri: 'file:///test.yaml' },
                range,
                context: {
                    diagnostics: [],
                    only: [CodeActionKind.RefactorExtract],
                },
            };

            // Setup mocks
            mockDocumentManager.get.returns(mockDocument);
            (mockDocument.documentType as any) = DocumentType.YAML;
            mockSyntaxTreeManager.getSyntaxTree.returns(mockSyntaxTree);
            mockContextManager.getContext.returns(mockContext);
            (mockContext.documentType as any) = DocumentType.YAML;
            mockExtractToParameterProvider.canExtract.returns(true);

            const mockExtractionResult: ExtractToParameterResult = {
                parameterName: 'TestParameter',
                parameterDefinition: {
                    Type: 'String',
                    Default: 'test-value',
                    Description: '',
                },
                replacementEdit: {
                    range,
                    newText: '!Ref TestParameter',
                },
                parameterInsertionEdit: {
                    range: { start: { line: 0, character: 0 }, end: { line: 0, character: 0 } },
                    newText:
                        'Parameters:\n  TestParameter:\n    Type: String\n    Default: test-value\n    Description: ""\n',
                },
            };

            mockExtractToParameterProvider.generateExtraction.returns(mockExtractionResult);

            const result = codeActionService.generateCodeActions(params);

            expect(result).toHaveLength(1);
            expect(result[0].title).toBe('Extract to Parameter');
            expect(result[0].kind).toBe(CodeActionKind.RefactorExtract);
            expect(result[0].edit?.changes).toBeDefined();
            expect(result[0].edit?.changes?.['file:///test.yaml']).toHaveLength(2);

            // Verify that the command for cursor positioning is included
            expect(result[0].command).toBeDefined();
            expect(result[0].command?.command).toBe('aws.cloudformation.extractToParameter.positionCursor');
            expect(result[0].command?.arguments).toEqual([
                'file:///test.yaml',
                'TestParameter',
                DocumentType.YAML,
                '/command/codeAction/track',
                'extractToParameter',
            ]);
        });

        it('should not offer Extract to Parameter when canExtract returns false', () => {
            const range: Range = {
                start: { line: 5, character: 10 },
                end: { line: 5, character: 20 },
            };

            const params: CodeActionParams = {
                textDocument: { uri: 'file:///test.yaml' },
                range,
                context: {
                    diagnostics: [],
                    only: [CodeActionKind.RefactorExtract],
                },
            };

            // Setup mocks
            mockDocumentManager.get.returns(mockDocument);
            (mockDocument.documentType as any) = DocumentType.YAML;
            mockSyntaxTreeManager.getSyntaxTree.returns(mockSyntaxTree);
            mockContextManager.getContext.returns(mockContext);
            mockExtractToParameterProvider.canExtract.returns(false);

            const result = codeActionService.generateCodeActions(params);

            expect(result).toHaveLength(0);
            expect(mockExtractToParameterProvider.generateExtraction.called).toBe(false);
        });

        it('should not offer Extract to Parameter when context is not RefactorExtract', () => {
            const range: Range = {
                start: { line: 5, character: 10 },
                end: { line: 5, character: 20 },
            };

            const params: CodeActionParams = {
                textDocument: { uri: 'file:///test.yaml' },
                range,
                context: {
                    diagnostics: [],
                    only: [CodeActionKind.QuickFix], // Not RefactorExtract
                },
            };

            const result = codeActionService.generateCodeActions(params);

            expect(result).toHaveLength(0);
            expect(mockExtractToParameterProvider.canExtract.called).toBe(false);
        });
    });

    describe('Extract to Parameter code action creation', () => {
        it('should create proper workspace edit for YAML template', () => {
            const range: Range = {
                start: { line: 5, character: 10 },
                end: { line: 5, character: 20 },
            };

            const params: CodeActionParams = {
                textDocument: { uri: 'file:///test.yaml' },
                range,
                context: {
                    diagnostics: [],
                    only: [CodeActionKind.RefactorExtract],
                },
            };

            // Setup mocks
            mockDocumentManager.get.returns(mockDocument);
            (mockDocument.documentType as any) = DocumentType.YAML;
            mockSyntaxTreeManager.getSyntaxTree.returns(mockSyntaxTree);
            mockContextManager.getContext.returns(mockContext);
            mockExtractToParameterProvider.canExtract.returns(true);

            const mockExtractionResult: ExtractToParameterResult = {
                parameterName: 'InstanceTypeParameter',
                parameterDefinition: {
                    Type: 'String',
                    Default: 't2.micro',
                    Description: '',
                },
                replacementEdit: {
                    range,
                    newText: '!Ref InstanceTypeParameter',
                },
                parameterInsertionEdit: {
                    range: { start: { line: 0, character: 0 }, end: { line: 0, character: 0 } },
                    newText:
                        'Parameters:\n  InstanceTypeParameter:\n    Type: String\n    Default: t2.micro\n    Description: ""\n',
                },
            };

            mockExtractToParameterProvider.generateExtraction.returns(mockExtractionResult);

            const result = codeActionService.generateCodeActions(params);

            expect(result).toHaveLength(1);
            const codeAction = result[0];

            expect(codeAction.title).toBe('Extract to Parameter');
            expect(codeAction.kind).toBe(CodeActionKind.RefactorExtract);
            expect(codeAction.edit?.changes?.['file:///test.yaml']).toEqual([
                mockExtractionResult.parameterInsertionEdit,
                mockExtractionResult.replacementEdit,
            ]);
        });

        it('should create proper workspace edit for JSON template', () => {
            const range: Range = {
                start: { line: 5, character: 10 },
                end: { line: 5, character: 20 },
            };

            const params: CodeActionParams = {
                textDocument: { uri: 'file:///test.json' },
                range,
                context: {
                    diagnostics: [],
                    only: [CodeActionKind.RefactorExtract],
                },
            };

            // Setup mocks
            mockDocumentManager.get.returns(mockDocument);
            (mockDocument.documentType as any) = DocumentType.JSON;
            mockSyntaxTreeManager.getSyntaxTree.returns(mockSyntaxTree);
            mockContextManager.getContext.returns(mockContext);
            mockExtractToParameterProvider.canExtract.returns(true);

            const mockExtractionResult: ExtractToParameterResult = {
                parameterName: 'InstanceTypeParameter',
                parameterDefinition: {
                    Type: 'String',
                    Default: 't2.micro',
                    Description: '',
                },
                replacementEdit: {
                    range,
                    newText: '{"Ref": "InstanceTypeParameter"}',
                },
                parameterInsertionEdit: {
                    range: { start: { line: 1, character: 2 }, end: { line: 1, character: 2 } },
                    newText:
                        '  "Parameters": {\n    "InstanceTypeParameter": {\n      "Type": "String",\n      "Default": "t2.micro",\n      "Description": ""\n    }\n  },\n',
                },
            };

            mockExtractToParameterProvider.generateExtraction.returns(mockExtractionResult);

            const result = codeActionService.generateCodeActions(params);

            expect(result).toHaveLength(1);
            const codeAction = result[0];

            expect(codeAction.title).toBe('Extract to Parameter');
            expect(codeAction.kind).toBe(CodeActionKind.RefactorExtract);
            expect(codeAction.edit?.changes?.['file:///test.json']).toEqual([
                mockExtractionResult.parameterInsertionEdit,
                mockExtractionResult.replacementEdit,
            ]);
        });
    });

    describe('ExtractToParameterProvider integration', () => {
        it('should pass correct context and range to ExtractToParameterProvider', () => {
            const range: Range = {
                start: { line: 5, character: 10 },
                end: { line: 5, character: 20 },
            };

            const params: CodeActionParams = {
                textDocument: { uri: 'file:///test.yaml' },
                range,
                context: {
                    diagnostics: [],
                    only: [CodeActionKind.RefactorExtract],
                },
            };

            // Setup mocks
            mockDocumentManager.get.returns(mockDocument);
            (mockDocument.documentType as any) = DocumentType.YAML;
            mockSyntaxTreeManager.getSyntaxTree.returns(mockSyntaxTree);
            mockContextManager.getContext.returns(mockContext);
            mockExtractToParameterProvider.canExtract.returns(true);
            mockExtractToParameterProvider.generateExtraction.returns(undefined);

            codeActionService.generateCodeActions(params);

            expect(
                mockContextManager.getContext.calledWith({
                    textDocument: { uri: 'file:///test.yaml' },
                    position: { line: 5, character: 10 },
                }),
            ).toBe(true);
            expect(mockExtractToParameterProvider.canExtract.calledWith(mockContext)).toBe(true);
        });

        it('should handle ExtractToParameterProvider errors gracefully', () => {
            const range: Range = {
                start: { line: 5, character: 10 },
                end: { line: 5, character: 20 },
            };

            const params: CodeActionParams = {
                textDocument: { uri: 'file:///test.yaml' },
                range,
                context: {
                    diagnostics: [],
                    only: [CodeActionKind.RefactorExtract],
                },
            };

            // Setup mocks
            mockDocumentManager.get.returns(mockDocument);
            (mockDocument.documentType as any) = DocumentType.YAML;
            mockSyntaxTreeManager.getSyntaxTree.returns(mockSyntaxTree);
            mockContextManager.getContext.returns(mockContext);
            mockExtractToParameterProvider.canExtract.throws(new Error('Test error'));

            // Should not throw and should return empty array
            expect(() => {
                const result = codeActionService.generateCodeActions(params);
                expect(result).toHaveLength(0);
            }).not.toThrow();
        });

        it('should handle missing context gracefully', () => {
            const range: Range = {
                start: { line: 5, character: 10 },
                end: { line: 5, character: 20 },
            };

            const params: CodeActionParams = {
                textDocument: { uri: 'file:///test.yaml' },
                range,
                context: {
                    diagnostics: [],
                    only: [CodeActionKind.RefactorExtract],
                },
            };

            // Setup mocks - context manager returns undefined
            mockDocumentManager.get.returns(mockDocument);
            (mockDocument.documentType as any) = DocumentType.YAML;
            mockSyntaxTreeManager.getSyntaxTree.returns(mockSyntaxTree);
            mockContextManager.getContext.returns(undefined);

            const result = codeActionService.generateCodeActions(params);

            expect(result).toHaveLength(0);
            expect(mockExtractToParameterProvider.canExtract.called).toBe(false);
        });

        it('should handle missing document gracefully', () => {
            const range: Range = {
                start: { line: 5, character: 10 },
                end: { line: 5, character: 20 },
            };

            const params: CodeActionParams = {
                textDocument: { uri: 'file:///test.yaml' },
                range,
                context: {
                    diagnostics: [],
                    only: [CodeActionKind.RefactorExtract],
                },
            };

            // Setup mocks - document manager returns undefined
            mockDocumentManager.get.returns(undefined);

            const result = codeActionService.generateCodeActions(params);

            expect(result).toHaveLength(0);
            expect(mockContextManager.getContext.called).toBe(false);
        });
    });
});
