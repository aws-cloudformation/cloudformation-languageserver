import { stubInterface } from 'ts-sinon';
import { describe, expect, test } from 'vitest';
import { CodeActionKind, CodeActionParams, Diagnostic, DiagnosticSeverity, TextEdit } from 'vscode-languageserver';
import { TextDocument } from 'vscode-languageserver-textdocument';
import { ContextManager } from '../../../src/context/ContextManager';
import { SyntaxTreeManager } from '../../../src/context/syntaxtree/SyntaxTreeManager';
import { Document, DocumentType } from '../../../src/document/Document';
import { DocumentManager } from '../../../src/document/DocumentManager';
import { METADATA_CONTEXT_KEY } from '../../../src/schema/MetadataContextSchema';
import { CodeActionService } from '../../../src/services/CodeActionService';
import {
    MISSING_METADATA_CONTEXT_DIAGNOSTIC_CODE,
    MISSING_METADATA_CONTEXT_DIAGNOSTIC_SOURCE,
} from '../../../src/services/MetadataContextQuickFix';
import { ExtractToParameterProvider } from '../../../src/services/extractToParameter/ExtractToParameterProvider';
import { applyWorkspaceEdit } from '../../utils/WorkspaceEditUtils';
import { createTree } from '../../utils/TestTree';

describe('Metadata.Context quick fix', () => {
    function createService(content: string, documentType: DocumentType) {
        const extension = documentType === DocumentType.JSON ? 'json' : 'yaml';
        const uri = `file:///template.${extension}`;
        const syntaxTree = createTree(content, documentType);
        const syntaxTreeManager = stubInterface<SyntaxTreeManager>();
        syntaxTreeManager.getSyntaxTree.withArgs(uri).returns(syntaxTree);

        const textDocument = TextDocument.create(uri, 'cloudformation', 1, content);
        const document = new Document(textDocument, false, 2);
        const documentManager = stubInterface<DocumentManager>();
        documentManager.get.withArgs(uri).returns(document);

        const contextManager = new ContextManager(syntaxTreeManager);
        const extractToParameterProvider = stubInterface<ExtractToParameterProvider>();
        const service = new CodeActionService(
            syntaxTreeManager,
            documentManager,
            contextManager,
            extractToParameterProvider,
        );

        return { service, uri };
    }

    function createDiagnostic(line: number, character: number, data?: Record<string, unknown>): Diagnostic {
        return {
            range: {
                start: { line, character },
                end: { line, character: character + 1 },
            },
            message: 'Metadata.Context is missing',
            severity: DiagnosticSeverity.Information,
            source: MISSING_METADATA_CONTEXT_DIAGNOSTIC_SOURCE,
            code: MISSING_METADATA_CONTEXT_DIAGNOSTIC_CODE,
            data,
        };
    }

    function getCodeActions(service: CodeActionService, uri: string, diagnostic: Diagnostic) {
        const params: CodeActionParams = {
            textDocument: { uri },
            range: diagnostic.range,
            context: {
                diagnostics: [diagnostic],
                only: [CodeActionKind.QuickFix],
            },
        };
        return service.generateCodeActions(params);
    }

    function getEdit(service: CodeActionService, uri: string, diagnostic: Diagnostic): TextEdit | undefined {
        const actions = getCodeActions(service, uri, diagnostic);

        expect(actions).toHaveLength(1);
        expect(actions[0]).toMatchObject({
            title: 'Add Metadata.Context',
            kind: CodeActionKind.QuickFix,
            diagnostics: [diagnostic],
            command: {
                command: '/command/codeAction/track',
                arguments: ['addMetadataContext'],
            },
        });
        return actions[0].edit?.changes?.[uri]?.[0];
    }

    test('inserts a resource Context skeleton into YAML without Metadata', () => {
        const content = `Resources:\n  OrderQueue:\n    Type: AWS::SQS::Queue\n    Properties:\n      VisibilityTimeout: 180\n`;
        const { service, uri } = createService(content, DocumentType.YAML);
        const edit = getEdit(service, uri, createDiagnostic(1, 2));

        expect(edit).toBeDefined();
        expect(applyWorkspaceEdit(content, [edit!])).toBe(
            `Resources:\n  OrderQueue:\n    Metadata:\n      com.aws.cloudformation.Context:\n        why: ""\n        must: []\n        mutable: review-required\n    Type: AWS::SQS::Queue\n    Properties:\n      VisibilityTimeout: 180\n`,
        );
    });

    test('adds Context under existing YAML Metadata without replacing custom metadata', () => {
        const content = `Resources:\n  OrderQueue:\n    Type: AWS::SQS::Queue\n    Metadata:\n      CustomKey: custom-value\n`;
        const { service, uri } = createService(content, DocumentType.YAML);
        const edit = getEdit(service, uri, createDiagnostic(1, 2));

        expect(edit).toBeDefined();
        expect(applyWorkspaceEdit(content, [edit!])).toBe(
            `Resources:\n  OrderQueue:\n    Type: AWS::SQS::Queue\n    Metadata:\n      com.aws.cloudformation.Context:\n        why: ""\n        must: []\n        mutable: review-required\n      CustomKey: custom-value\n`,
        );
    });

    test('inserts a template Context skeleton into YAML', () => {
        const content = `AWSTemplateFormatVersion: '2010-09-09'\nResources:\n  OrderQueue:\n    Type: AWS::SQS::Queue\n`;
        const { service, uri } = createService(content, DocumentType.YAML);
        const diagnostic = createDiagnostic(0, 0, { scope: 'template' });
        const edit = getEdit(service, uri, diagnostic);

        expect(edit).toBeDefined();
        expect(applyWorkspaceEdit(content, [edit!])).toBe(
            `Metadata:\n  com.aws.cloudformation.Context:\n    arch: ""\nAWSTemplateFormatVersion: '2010-09-09'\nResources:\n  OrderQueue:\n    Type: AWS::SQS::Queue\n`,
        );
    });

    test('inserts a resource Context skeleton into JSON', () => {
        const content = JSON.stringify(
            {
                Resources: {
                    OrderQueue: {
                        Type: 'AWS::SQS::Queue',
                        Properties: { VisibilityTimeout: 180 },
                    },
                },
            },
            undefined,
            2,
        );
        const { service, uri } = createService(content, DocumentType.JSON);
        const edit = getEdit(service, uri, createDiagnostic(2, 4));

        expect(edit).toBeDefined();
        const updated = JSON.parse(applyWorkspaceEdit(content, [edit!]));
        expect(updated.Resources.OrderQueue.Metadata).toEqual({
            'com.aws.cloudformation.Context': {
                why: '',
                must: [],
                mutable: 'review-required',
            },
        });
        expect(updated.Resources.OrderQueue.Type).toBe('AWS::SQS::Queue');
    });

    test('adds Context under existing JSON Metadata without replacing custom metadata', () => {
        const content = JSON.stringify(
            {
                Resources: {
                    OrderQueue: {
                        Type: 'AWS::SQS::Queue',
                        Metadata: { CustomKey: 'custom-value' },
                    },
                },
            },
            undefined,
            2,
        );
        const { service, uri } = createService(content, DocumentType.JSON);
        const edit = getEdit(service, uri, createDiagnostic(2, 4));

        expect(edit).toBeDefined();
        const updated = JSON.parse(applyWorkspaceEdit(content, [edit!]));
        expect(updated.Resources.OrderQueue.Metadata.CustomKey).toBe('custom-value');
        expect(updated.Resources.OrderQueue.Metadata[METADATA_CONTEXT_KEY]).toEqual({
            why: '',
            must: [],
            mutable: 'review-required',
        });
    });

    test('inserts a template Context skeleton into JSON', () => {
        const content = JSON.stringify(
            {
                AWSTemplateFormatVersion: '2010-09-09',
                Resources: {},
            },
            undefined,
            2,
        );
        const { service, uri } = createService(content, DocumentType.JSON);
        const edit = getEdit(service, uri, createDiagnostic(1, 2, { scope: 'template' }));

        expect(edit).toBeDefined();
        const updated = JSON.parse(applyWorkspaceEdit(content, [edit!]));
        expect(updated.Metadata).toEqual({
            [METADATA_CONTEXT_KEY]: { arch: '' },
        });
        expect(updated.AWSTemplateFormatVersion).toBe('2010-09-09');
    });

    test('inserts JSON Context correctly after multibyte document text', () => {
        const content = JSON.stringify(
            {
                Description: 'café ☕',
                Resources: {
                    OrderQueue: {
                        Type: 'AWS::SQS::Queue',
                    },
                },
            },
            undefined,
            2,
        );
        const { service, uri } = createService(content, DocumentType.JSON);
        const edit = getEdit(service, uri, createDiagnostic(3, 4));

        expect(edit).toBeDefined();
        const updated = JSON.parse(applyWorkspaceEdit(content, [edit!]));
        expect(updated.Description).toBe('café ☕');
        expect(updated.Resources.OrderQueue.Metadata[METADATA_CONTEXT_KEY]).toBeDefined();
    });

    test('does not offer an unsafe edit for malformed YAML without a resolvable mapping', () => {
        const content = `BrokenTopLevel
Resources:
  OrderQueue:
    Type: AWS::SQS::Queue
`;
        const { service, uri } = createService(content, DocumentType.YAML);
        const diagnostic = createDiagnostic(2, 2, { scope: 'resource', logicalId: 'OrderQueue' });

        expect(getCodeActions(service, uri, diagnostic)).toEqual([]);
    });

    test('does not offer an unsafe edit when JSON closing braces are missing', () => {
        const content = `{
  "Resources": {
    "OrderQueue": {
      "Type": "AWS::SQS::Queue"`;
        const { service, uri } = createService(content, DocumentType.JSON);
        const diagnostic = createDiagnostic(2, 4, { scope: 'resource', logicalId: 'OrderQueue' });

        expect(getCodeActions(service, uri, diagnostic)).toEqual([]);
    });

    test('recognizes cfn-lint required-property diagnostics for the full Context key', () => {
        const content = `Resources:\n  OrderQueue:\n    Type: AWS::SQS::Queue\n`;
        const { service, uri } = createService(content, DocumentType.YAML);
        const diagnostic = createDiagnostic(1, 2);
        diagnostic.source = 'cfn-lint';
        diagnostic.code = 'E3028';
        diagnostic.message = `'com.aws.cloudformation.Context' is a required property`;
        const edit = getEdit(service, uri, diagnostic);

        expect(edit).toBeDefined();
        expect(applyWorkspaceEdit(content, [edit!])).toContain('com.aws.cloudformation.Context:');
    });

    test('does not offer a duplicate fix when Context already exists', () => {
        const content = `Resources:\n  OrderQueue:\n    Type: AWS::SQS::Queue\n    Metadata:\n      com.aws.cloudformation.Context:\n        why: buffer work\n`;
        const { service, uri } = createService(content, DocumentType.YAML);
        const diagnostic = createDiagnostic(1, 2);
        const params: CodeActionParams = {
            textDocument: { uri },
            range: diagnostic.range,
            context: { diagnostics: [diagnostic], only: [CodeActionKind.QuickFix] },
        };

        expect(service.generateCodeActions(params)).toEqual([]);
    });
});
