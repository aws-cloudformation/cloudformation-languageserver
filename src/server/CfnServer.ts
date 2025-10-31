import { InitializedParams } from 'vscode-languageserver-protocol';
import { iamCredentialsDeleteHandler, iamCredentialsUpdateHandler } from '../handlers/AuthHandler';
import { codeActionHandler } from '../handlers/CodeActionHandler';
import { codeLensHandler } from '../handlers/CodeLensHandler';
import { completionHandler } from '../handlers/CompletionHandler';
import { configurationHandler } from '../handlers/ConfigurationHandler';
import { definitionHandler } from '../handlers/DefinitionHandler';
import { didChangeHandler, didCloseHandler, didOpenHandler, didSaveHandler } from '../handlers/DocumentHandler';
import { documentSymbolHandler } from '../handlers/DocumentSymbolHandler';
import { executionHandler } from '../handlers/ExecutionHandler';
import { hoverHandler } from '../handlers/HoverHandler';
import { initializedHandler } from '../handlers/Initialize';
import { inlineCompletionHandler } from '../handlers/InlineCompletionHandler';
import {
    getManagedResourceStackTemplateHandler,
    listResourcesHandler,
    getResourceTypesHandler,
    importResourceStateHandler,
    refreshResourceListHandler,
    searchResourceHandler,
    getStackMgmtInfo,
} from '../handlers/ResourceHandler';
import {
    listStacksHandler,
    listChangeSetsHandler,
    listStackResourcesHandler,
    createValidationHandler,
    createDeploymentHandler,
    getValidationStatusHandler,
    getDeploymentStatusHandler,
    getParametersHandler,
    getCapabilitiesHandler,
    describeValidationStatusHandler,
    describeDeploymentStatusHandler,
    getTemplateResourcesHandler,
    deleteChangeSetHandler,
    getChangeSetDeletionStatusHandler,
    describeChangeSetDeletionStatusHandler,
    getStackEventsHandler,
    clearStackEventsHandler,
    getStackOutputsHandler,
    describeChangeSetHandler,
} from '../handlers/StackHandler';
import { LspComponents } from '../protocol/LspComponents';
import { closeSafely } from '../utils/Closeable';
import { CfnExternal } from './CfnExternal';
import { CfnInfraCore } from './CfnInfraCore';
import { CfnLspProviders } from './CfnLspProviders';
import { ServerComponents } from './ServerComponents';

export class CfnServer {
    private readonly components: ServerComponents;

    constructor(
        private readonly lsp: LspComponents,
        private readonly core: CfnInfraCore,
        private readonly external = new CfnExternal(lsp, core),
        private readonly providers = new CfnLspProviders(core, external),
    ) {
        this.components = {
            ...core,
            ...external,
            ...providers,
        };

        this.setupHandlers();
    }

    initialized(_params: InitializedParams) {
        const configurables = [
            ...this.core.configurables(),
            ...this.external.configurables(),
            ...this.providers.configurables(),
        ];

        for (const configurable of configurables) {
            configurable.configure(this.core.settingsManager);
        }

        initializedHandler(this.lsp.workspace, this.components)();
    }

    private setupHandlers() {
        this.lsp.documents.onDidOpen(didOpenHandler(this.components));
        this.lsp.documents.onDidChangeContent(didChangeHandler(this.lsp.documents, this.components));
        this.lsp.documents.onDidClose(didCloseHandler(this.components));
        this.lsp.documents.onDidSave(didSaveHandler(this.components));

        this.lsp.handlers.onCompletion(completionHandler(this.components));
        this.lsp.handlers.onInlineCompletion(inlineCompletionHandler(this.components));
        this.lsp.handlers.onHover(hoverHandler(this.components));
        this.lsp.handlers.onExecuteCommand(executionHandler(this.lsp.documents, this.components));
        this.lsp.handlers.onCodeAction(codeActionHandler(this.components));
        this.lsp.handlers.onDefinition(definitionHandler(this.components));
        this.lsp.handlers.onDocumentSymbol(documentSymbolHandler(this.components));
        this.lsp.handlers.onDidChangeConfiguration(configurationHandler(this.components));
        this.lsp.handlers.onCodeLens(codeLensHandler(this.components));

        this.lsp.authHandlers.onIamCredentialsUpdate(iamCredentialsUpdateHandler(this.components));
        this.lsp.authHandlers.onIamCredentialsDelete(iamCredentialsDeleteHandler(this.components));

        this.lsp.stackHandlers.onGetParameters(getParametersHandler(this.components));
        this.lsp.stackHandlers.onCreateValidation(createValidationHandler(this.components));
        this.lsp.stackHandlers.onGetCapabilities(getCapabilitiesHandler(this.components));
        this.lsp.stackHandlers.onGetTemplateResources(getTemplateResourcesHandler(this.components));
        this.lsp.stackHandlers.onCreateDeployment(createDeploymentHandler(this.components));
        this.lsp.stackHandlers.onGetValidationStatus(getValidationStatusHandler(this.components));
        this.lsp.stackHandlers.onGetDeploymentStatus(getDeploymentStatusHandler(this.components));
        this.lsp.stackHandlers.onDescribeValidationStatus(describeValidationStatusHandler(this.components));
        this.lsp.stackHandlers.onDescribeDeploymentStatus(describeDeploymentStatusHandler(this.components));
        this.lsp.stackHandlers.onDeleteChangeSet(deleteChangeSetHandler(this.components));
        this.lsp.stackHandlers.onGetChangeSetDeletionStatus(getChangeSetDeletionStatusHandler(this.components));
        this.lsp.stackHandlers.onDescribeChangeSetDeletionStatus(
            describeChangeSetDeletionStatusHandler(this.components),
        );
        this.lsp.stackHandlers.onListStacks(listStacksHandler(this.components));
        this.lsp.stackHandlers.onListChangeSets(listChangeSetsHandler(this.components));
        this.lsp.stackHandlers.onListStackResources(listStackResourcesHandler(this.components));
        this.lsp.stackHandlers.onDescribeChangeSet(describeChangeSetHandler(this.components));
        this.lsp.stackHandlers.onGetStackTemplate(getManagedResourceStackTemplateHandler(this.components));
        this.lsp.stackHandlers.onGetStackEvents(getStackEventsHandler(this.components));
        this.lsp.stackHandlers.onClearStackEvents(clearStackEventsHandler(this.components));
        this.lsp.stackHandlers.onGetStackOutputs(getStackOutputsHandler(this.components));

        this.lsp.resourceHandlers.onListResources(listResourcesHandler(this.components));
        this.lsp.resourceHandlers.onRefreshResourceList(refreshResourceListHandler(this.components));
        this.lsp.resourceHandlers.onSearchResource(searchResourceHandler(this.components));
        this.lsp.resourceHandlers.onGetResourceTypes(getResourceTypesHandler(this.components));
        this.lsp.resourceHandlers.onResourceStateImport(importResourceStateHandler(this.components));
        this.lsp.resourceHandlers.onStackMgmtInfo(getStackMgmtInfo(this.components));
    }

    async close(): Promise<void> {
        await closeSafely(this.providers, this.external, this.core);
    }
}
