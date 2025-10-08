import { InitializeParams } from 'vscode-languageserver/node';
import { InitializedParams } from 'vscode-languageserver-protocol';
import {
    bearerCredentialsDeleteHandler,
    bearerCredentialsUpdateHandler,
    iamCredentialsDeleteHandler,
    iamCredentialsUpdateHandler,
    ssoTokenChangedHandler,
} from '../handlers/AuthHandler';
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
    getStackMgmtInfo,
} from '../handlers/ResourceHandler';
import {
    listStacksHandler,
    createValidationHandler,
    createDeploymentHandler,
    getValidationStatusHandler,
    getDeploymentStatusHandler,
    getParametersHandler,
    getCapabilitiesHandler,
} from '../handlers/StackHandler';
import { LspFeatures } from '../protocol/LspConnection';
import { ServerComponents } from './ServerComponents';

export class CfnServer {
    constructor(
        private readonly features: LspFeatures,
        private readonly initializeParams: InitializeParams,
        private readonly components: ServerComponents = new ServerComponents(features),
    ) {
        this.setupHandlers();
    }

    initialized(_params: InitializedParams) {
        initializedHandler(this.components)();
    }

    private setupHandlers() {
        this.features.documents.onDidOpen(didOpenHandler(this.components));
        this.features.documents.onDidChangeContent(didChangeHandler(this.components));
        this.features.documents.onDidClose(didCloseHandler(this.components));
        this.features.documents.onDidSave(didSaveHandler(this.components));

        this.features.handlers.onCompletion(completionHandler(this.components));
        this.features.handlers.onInlineCompletion(inlineCompletionHandler(this.components));
        this.features.handlers.onHover(hoverHandler(this.components));
        this.features.handlers.onExecuteCommand(executionHandler(this.components));
        this.features.handlers.onCodeAction(codeActionHandler(this.components));
        this.features.handlers.onDefinition(definitionHandler(this.components));
        this.features.handlers.onDocumentSymbol(documentSymbolHandler(this.components));
        this.features.handlers.onDidChangeConfiguration(configurationHandler(this.components));
        this.features.handlers.onCodeLens(codeLensHandler(this.components));

        this.features.authHandlers.onIamCredentialsUpdate(iamCredentialsUpdateHandler(this.components));
        this.features.authHandlers.onBearerCredentialsUpdate(bearerCredentialsUpdateHandler(this.components));
        this.features.authHandlers.onIamCredentialsDelete(iamCredentialsDeleteHandler(this.components));
        this.features.authHandlers.onBearerCredentialsDelete(bearerCredentialsDeleteHandler(this.components));
        this.features.authHandlers.onSsoTokenChanged(ssoTokenChangedHandler(this.components));

        this.features.stackHandlers.onGetParameters(getParametersHandler(this.components));
        this.features.stackHandlers.onCreateValidation(createValidationHandler(this.components));
        this.features.stackHandlers.onGetCapabilities(getCapabilitiesHandler(this.components));
        this.features.stackHandlers.onCreateDeployment(createDeploymentHandler(this.components));
        this.features.stackHandlers.onGetValidationStatus(getValidationStatusHandler(this.components));
        this.features.stackHandlers.onGetDeploymentStatus(getDeploymentStatusHandler(this.components));
        this.features.stackHandlers.onListStacks(listStacksHandler(this.components));
        this.features.stackHandlers.onGetStackTemplate(getManagedResourceStackTemplateHandler(this.components));

        this.features.resourceHandlers.onListResources(listResourcesHandler(this.components));
        this.features.resourceHandlers.onRefreshResourceList(refreshResourceListHandler(this.components));
        this.features.resourceHandlers.onGetResourceTypes(getResourceTypesHandler(this.components));
        this.features.resourceHandlers.onResourceStateImport(importResourceStateHandler(this.components));
        this.features.resourceHandlers.onStackMgmtInfo(getStackMgmtInfo(this.components));
    }

    async close(): Promise<void> {
        await this.components.close();
    }
}
