import { beforeEach, describe, expect, test, vi } from 'vitest';
import { CfnServer } from '../../../src/server/CfnServer';
import { createMockComponents } from '../../utils/MockServerComponents';

vi.mock('../../../src/services/cfnLint/CfnLintService');
vi.mock('../../../src/schema/SchemaRetriever');
vi.mock('../../../src/datastore/LMDB');
vi.mock('../../../src/handlers/Initialize');

describe('CfnServer', () => {
    let mockFeatures: any;
    let server: CfnServer;

    beforeEach(() => {
        vi.clearAllMocks();
        mockFeatures = createMockComponents();
        server = new CfnServer(mockFeatures.lsp, mockFeatures.core, mockFeatures.external, mockFeatures.providers);
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
            expect(mockFeatures.authHandlers.onIamCredentialsDelete.calledOnce).toBe(true);

            expect(mockFeatures.stackHandlers.onGetParameters.calledOnce).toBe(true);
            expect(mockFeatures.stackHandlers.onCreateValidation.calledOnce).toBe(true);
            expect(mockFeatures.stackHandlers.onCreateDeployment.calledOnce).toBe(true);
            expect(mockFeatures.stackHandlers.onGetValidationStatus.calledOnce).toBe(true);
            expect(mockFeatures.stackHandlers.onGetDeploymentStatus.calledOnce).toBe(true);
            expect(mockFeatures.stackHandlers.onListStacks.calledOnce).toBe(true);
            expect(mockFeatures.stackHandlers.onListStackResources.calledOnce).toBe(true);

            expect(mockFeatures.relatedResourcesHandlers.onGetAuthoredResourceTypes.calledOnce).toBe(true);
            expect(mockFeatures.relatedResourcesHandlers.onGetRelatedResourceTypes.calledOnce).toBe(true);
            expect(mockFeatures.relatedResourcesHandlers.onInsertRelatedResources.calledOnce).toBe(true);
        });
    });

    describe('close', () => {
        test('should close server components', async () => {
            // Mock the close method on the internal components
            const providerSpy = vi.fn().mockResolvedValue(undefined);
            const externalSpy = vi.fn().mockResolvedValue(undefined);
            const coreSpy = vi.fn().mockResolvedValue(undefined);

            (server as any).providers.close = providerSpy;
            (server as any).external.close = externalSpy;
            (server as any).core.close = coreSpy;

            await server.close();

            expect(providerSpy).toHaveBeenCalledOnce();
            expect(externalSpy).toHaveBeenCalledOnce();
            expect(coreSpy).toHaveBeenCalledOnce();
        });
    });
});
