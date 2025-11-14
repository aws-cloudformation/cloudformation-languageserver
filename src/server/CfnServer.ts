import { InitializedParams } from 'vscode-languageserver-protocol';
import { iamCredentialsDeleteHandler, iamCredentialsUpdateHandler } from '../handlers/AuthHandler';
import { parseCfnEnvironmentFilesHandler } from '../handlers/CfnEnvironmentHandler';
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
import {
    getAuthoredResourceTypesHandler,
    getRelatedResourceTypesHandler,
    insertRelatedResourcesHandler,
} from '../handlers/RelatedResourcesHandler';
import {
    getManagedResourceStackTemplateHandler,
    listResourcesHandler,
    getResourceTypesHandler,
    importResourceStateHandler,
    refreshResourceListHandler,
    searchResourceHandler,
    getStackMgmtInfo,
    removeResourceTypeHandler,
} from '../handlers/ResourceHandler';
import { uploadFileToS3Handler } from '../handlers/S3Handler';
import {
    listStacksHandler,
    listChangeSetsHandler,
    listStackResourcesHandler,
    createValidationHandler,
    createDeploymentHandler,
    getValidationStatusHandler,
    getDeploymentStatusHandler,
    getParametersHandler,
    getTemplateArtifactsHandler,
    getCapabilitiesHandler,
    describeValidationStatusHandler,
    describeDeploymentStatusHandler,
    getTemplateResourcesHandler,
    deleteChangeSetHandler,
    getChangeSetDeletionStatusHandler,
    describeChangeSetDeletionStatusHandler,
    getStackEventsHandler,
    clearStackEventsHandler,
    describeStackHandler,
    describeChangeSetHandler,
} from '../handlers/StackHandler';
import { LspComponents } from '../protocol/LspComponents';
import { LoggerFactory } from '../telemetry/LoggerFactory';
import { withTelemetryContext } from '../telemetry/TelemetryContext';
import { closeSafely } from '../utils/Closeable';
import { CfnExternal } from './CfnExternal';
import { CfnInfraCore } from './CfnInfraCore';
import { CfnLspProviders } from './CfnLspProviders';
import { ServerComponents } from './ServerComponents';

const log = LoggerFactory.getLogger('CfnServer');
export class CfnServer {
    private readonly components: ServerComponents;

    constructor(
        private readonly lsp: LspComponents,
        private readonly core: CfnInfraCore,
        private readonly external = new CfnExternal(lsp, core),
        private readonly providers = new CfnLspProviders(core, external),
    ) {
        log.info(`Setting up LSP handlers...`);
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
        this.lsp.documents.onDidOpen(withTelemetryContext('Document.Open', didOpenHandler(this.components)));
        this.lsp.documents.onDidChangeContent(
            withTelemetryContext('Document.Change', didChangeHandler(this.lsp.documents, this.components)),
        );
        this.lsp.documents.onDidClose(withTelemetryContext('Document.Close', didCloseHandler(this.components)));
        this.lsp.documents.onDidSave(withTelemetryContext('Document.Save', didSaveHandler(this.components)));

        this.lsp.handlers.onCompletion(withTelemetryContext('Completion', completionHandler(this.components)));
        this.lsp.handlers.onHover(withTelemetryContext('Hover', hoverHandler(this.components)));
        this.lsp.handlers.onExecuteCommand(
            withTelemetryContext('Execution', executionHandler(this.lsp.documents, this.components)),
        );
        this.lsp.handlers.onCodeAction(withTelemetryContext('CodeAction', codeActionHandler(this.components)));
        this.lsp.handlers.onDefinition(withTelemetryContext('Definition', definitionHandler(this.components)));
        this.lsp.handlers.onDocumentSymbol(
            withTelemetryContext('Document.Symbol', documentSymbolHandler(this.components)),
        );
        this.lsp.handlers.onDidChangeConfiguration(
            withTelemetryContext('Configuration', configurationHandler(this.components)),
        );
        this.lsp.handlers.onCodeLens(withTelemetryContext('CodeLens', codeLensHandler(this.components)));

        this.lsp.authHandlers.onIamCredentialsUpdate(
            withTelemetryContext('Auth.Update', iamCredentialsUpdateHandler(this.components)),
        );
        this.lsp.authHandlers.onIamCredentialsDelete(
            withTelemetryContext('Auth.Delete', iamCredentialsDeleteHandler(this.components)),
        );

        this.lsp.stackHandlers.onGetParameters(
            withTelemetryContext('Stack.Get.Params', getParametersHandler(this.components)),
        );
        this.lsp.stackHandlers.onGetTemplateArtifacts(
            withTelemetryContext('Stack.Template.Artifacts', getTemplateArtifactsHandler(this.components)),
        );
        this.lsp.stackHandlers.onCreateValidation(
            withTelemetryContext('Stack.Create.Validate', createValidationHandler(this.components)),
        );
        this.lsp.stackHandlers.onGetCapabilities(
            withTelemetryContext('Stack.Capabilities', getCapabilitiesHandler(this.components)),
        );
        this.lsp.stackHandlers.onGetTemplateResources(
            withTelemetryContext('Stack.Template.Resources', getTemplateResourcesHandler(this.components)),
        );
        this.lsp.stackHandlers.onCreateDeployment(
            withTelemetryContext('Stack.Create.Deployment', createDeploymentHandler(this.components)),
        );
        this.lsp.stackHandlers.onGetValidationStatus(
            withTelemetryContext('Stack.Validation.Status', getValidationStatusHandler(this.components)),
        );
        this.lsp.stackHandlers.onGetDeploymentStatus(
            withTelemetryContext('Stack.Deployment.Status', getDeploymentStatusHandler(this.components)),
        );
        this.lsp.stackHandlers.onDescribeValidationStatus(
            withTelemetryContext('Stack.Describe.Validation.Status', describeValidationStatusHandler(this.components)),
        );
        this.lsp.stackHandlers.onDescribeDeploymentStatus(
            withTelemetryContext('Stack.Describe.Deployment.Status', describeDeploymentStatusHandler(this.components)),
        );
        this.lsp.stackHandlers.onDeleteChangeSet(
            withTelemetryContext('Stack.Delete.ChangeSet', deleteChangeSetHandler(this.components)),
        );
        this.lsp.stackHandlers.onGetChangeSetDeletionStatus(
            withTelemetryContext(
                'Stack.Get.ChangeSet.Deletion.Status',
                getChangeSetDeletionStatusHandler(this.components),
            ),
        );
        this.lsp.stackHandlers.onDescribeChangeSetDeletionStatus(
            withTelemetryContext(
                'Stack.Describe.ChangeSet.Deletion.Status',
                describeChangeSetDeletionStatusHandler(this.components),
            ),
        );
        this.lsp.stackHandlers.onListStacks(withTelemetryContext('Stack.List', listStacksHandler(this.components)));
        this.lsp.stackHandlers.onListChangeSets(
            withTelemetryContext('Stack.List.ChangeSets', listChangeSetsHandler(this.components)),
        );
        this.lsp.stackHandlers.onListStackResources(
            withTelemetryContext('Stack.List.Resources', listStackResourcesHandler(this.components)),
        );
        this.lsp.stackHandlers.onDescribeChangeSet(
            withTelemetryContext('Stack.Describe.ChangeSet', describeChangeSetHandler(this.components)),
        );
        this.lsp.stackHandlers.onGetStackTemplate(
            withTelemetryContext('Stack.Get.Template', getManagedResourceStackTemplateHandler(this.components)),
        );
        this.lsp.stackHandlers.onGetStackEvents(
            withTelemetryContext('Stack.Get.Events', getStackEventsHandler(this.components)),
        );
        this.lsp.stackHandlers.onClearStackEvents(
            withTelemetryContext('Stack.Clear.Events', clearStackEventsHandler(this.components)),
        );
        this.lsp.stackHandlers.onDescribeStack(
            withTelemetryContext('Stack.Describe', describeStackHandler(this.components)),
        );

        this.lsp.cfnEnvironmentHandlers.onParseCfnEnvironmentFiles(
            withTelemetryContext('Cfn.Environment.Parse', parseCfnEnvironmentFilesHandler()),
        );

        this.lsp.relatedResourcesHandlers.onGetAuthoredResourceTypes(
            withTelemetryContext('Related.Resources.Get.Authored', getAuthoredResourceTypesHandler(this.components)),
        );
        this.lsp.relatedResourcesHandlers.onGetRelatedResourceTypes(
            withTelemetryContext('Related.Resources.Get.Related', getRelatedResourceTypesHandler(this.components)),
        );
        this.lsp.relatedResourcesHandlers.onInsertRelatedResources(
            withTelemetryContext('Related.Resources.Insert', insertRelatedResourcesHandler(this.components)),
        );

        this.lsp.resourceHandlers.onListResources(
            withTelemetryContext('Resource.List', listResourcesHandler(this.components)),
        );
        this.lsp.resourceHandlers.onRefreshResourceList(
            withTelemetryContext('Resource.Refresh.List', refreshResourceListHandler(this.components)),
        );
        this.lsp.resourceHandlers.onSearchResource(
            withTelemetryContext('Resource.Search', searchResourceHandler(this.components)),
        );
        this.lsp.resourceHandlers.onGetResourceTypes(
            withTelemetryContext('Resource.Get.Types', getResourceTypesHandler(this.components)),
        );
        this.lsp.resourceHandlers.onRemoveResourceType(
            withTelemetryContext('Resource.Remove.Type', removeResourceTypeHandler(this.components)),
        );
        this.lsp.resourceHandlers.onResourceStateImport(
            withTelemetryContext('Resource.State.Import', importResourceStateHandler(this.components)),
        );
        this.lsp.resourceHandlers.onStackMgmtInfo(
            withTelemetryContext('Resource.Stack.Mgmt.Info', getStackMgmtInfo(this.components)),
        );

        this.lsp.s3Handlers.onUploadFile(
            withTelemetryContext('S3.Upload.File', uploadFileToS3Handler(this.components)),
        );
    }

    async close(): Promise<void> {
        await closeSafely(this.providers, this.external, this.core);
    }
}
