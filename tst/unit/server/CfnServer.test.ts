import { beforeEach, describe, expect, test, vi } from 'vitest';
import { InitializeParams } from 'vscode-languageserver';
import { CfnServer } from '../../../src/server/CfnServer';
import {
    createMockLspHandlers,
    createMockAuthHandlers,
    createMockLspCommunication,
    createMockLspDocuments,
    createMockLspWorkspace,
    createMockLspDiagnostics,
    createMockLspStackHandlers,
    createMockLspResourceHandlers,
} from '../../utils/MockServerComponents';

vi.mock('../../../src/services/cfnLint/CfnLintService');
vi.mock('../../../src/schema/SchemaRetriever');
vi.mock('../../../src/datastore/LMDB');
vi.mock('../../../src/handlers/Initialize');

describe('CfnServer', () => {
    let mockFeatures: any;
    let mockInitializeParams: InitializeParams;
    let server: CfnServer;

    beforeEach(() => {
        vi.clearAllMocks();
        mockFeatures = {
            diagnostics: createMockLspDiagnostics(),
            workspace: createMockLspWorkspace(),
            documents: createMockLspDocuments(),
            communication: createMockLspCommunication(),
            handlers: createMockLspHandlers(),
            authHandlers: createMockAuthHandlers(),
            stackHandlers: createMockLspStackHandlers(),
            resourceHandlers: createMockLspResourceHandlers(),
        };

        mockInitializeParams = {
            processId: 1234,
            capabilities: {},
            rootUri: 'file:///test',
        } as InitializeParams;

        server = new CfnServer(mockFeatures, mockInitializeParams);
    });

    describe('constructor', () => {
        test('should create server with provided features', () => {
            expect(server).toBeDefined();
        });

        test('should register handlers', () => {
            expect(mockFeatures.documents.onDidOpen.calledOnce).toBe(true);
            expect(mockFeatures.documents.onDidChangeContent.calledOnce).toBe(true);
            expect(mockFeatures.documents.onDidClose.calledOnce).toBe(true);
            expect(mockFeatures.documents.onDidSave.calledOnce).toBe(true);

            expect(mockFeatures.handlers.onCompletion.calledOnce).toBe(true);
            expect(mockFeatures.handlers.onHover.calledOnce).toBe(true);
            expect(mockFeatures.handlers.onExecuteCommand.calledOnce).toBe(true);
            expect(mockFeatures.handlers.onCodeAction.calledOnce).toBe(true);
            expect(mockFeatures.handlers.onDefinition.calledOnce).toBe(true);
            expect(mockFeatures.handlers.onDocumentSymbol.calledOnce).toBe(true);
            expect(mockFeatures.handlers.onDidChangeConfiguration.calledOnce).toBe(true);

            expect(mockFeatures.authHandlers.onIamCredentialsUpdate.calledOnce).toBe(true);
            expect(mockFeatures.authHandlers.onBearerCredentialsUpdate.calledOnce).toBe(true);
            expect(mockFeatures.authHandlers.onIamCredentialsDelete.calledOnce).toBe(true);
            expect(mockFeatures.authHandlers.onBearerCredentialsDelete.calledOnce).toBe(true);
            expect(mockFeatures.authHandlers.onSsoTokenChanged.calledOnce).toBe(true);

            expect(mockFeatures.stackHandlers.onGetParameters.calledOnce).toBe(true);
            expect(mockFeatures.stackHandlers.onCreateValidation.calledOnce).toBe(true);
            expect(mockFeatures.stackHandlers.onCreateDeployment.calledOnce).toBe(true);
            expect(mockFeatures.stackHandlers.onGetValidationStatus.calledOnce).toBe(true);
            expect(mockFeatures.stackHandlers.onGetDeploymentStatus.calledOnce).toBe(true);
            expect(mockFeatures.stackHandlers.onListStacks.calledOnce).toBe(true);
        });
    });

    describe('close', () => {
        test('should close server components', async () => {
            // Mock the close method on the internal components
            const closeSpy = vi.fn().mockResolvedValue(undefined);
            (server as any).components.close = closeSpy;

            await server.close();

            expect(closeSpy).toHaveBeenCalledOnce();
        });
    });
});
