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
import {
    activateHookHandler,
    deactivateHookHandler,
    configureHookHandler,
    setInvocationStatusHandler,
    createGuardHookHandler,
    listIamRolesHandler,
    listS3BucketsHandler,
    listS3ObjectsHandler,
    listProactiveControlsHandler,
    createHookExecutionRoleHandler,
    createS3BucketHandler,
    describeHookHandler,
    getHookResultHandler,
    listHookResultsHandler,
    listHooksHandler,
    listHooksDetailedHandler,
    listPublicHooksHandler,
    setHookConfigurationHandler,
    getHookConfigurationHandler,
    getRuleContentHandler,
    validateRuleHandler,
    uploadRuleHandler,
    previewGuardHooksHandler,
} from '../handlers/HooksHandler';
import { hoverHandler } from '../handlers/HoverHandler';
import { initializedHandler } from '../handlers/Initialize';
import {
    getAuthoredResourceTypesHandler,
    getAuthoredResourceTypesHandlerV2,
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
    describeEventsHandler,
} from '../handlers/StackHandler';
import { getSystemStatusHandler } from '../handlers/SystemHandler';
import { LspComponents } from '../protocol/LspComponents';
import { LoggerFactory } from '../telemetry/LoggerFactory';
import { withTelemetryContext } from '../telemetry/TelemetryContext';
import { closeSafely } from '../utils/Closeable';
import { withOnlineGuard } from '../utils/OnlineFeatureWrapper';
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
        this.lsp.handlers.onExecuteCommand(withTelemetryContext('Execution', executionHandler(this.components)));
        this.lsp.handlers.onCodeAction(withTelemetryContext('CodeAction', codeActionHandler(this.components)));
        this.lsp.handlers.onDefinition(withTelemetryContext('Definition', definitionHandler(this.components)));
        this.lsp.handlers.onDocumentSymbol(
            withTelemetryContext('Document.Symbol', documentSymbolHandler(this.components)),
        );
        this.lsp.handlers.onDidChangeConfiguration(
            withTelemetryContext('Configuration', configurationHandler(this.components)),
        );
        this.lsp.handlers.onCodeLens(withTelemetryContext('CodeLens', codeLensHandler(this.components)));

        this.lsp.systemHandlers.onGetSystemStatus(
            withTelemetryContext('SystemStatus', getSystemStatusHandler(this.components)),
        );

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
            withTelemetryContext(
                'Stack.Create.Validate',
                withOnlineGuard(this.components.onlineFeatureGuard, createValidationHandler(this.components)),
            ),
        );
        this.lsp.stackHandlers.onGetCapabilities(
            withTelemetryContext(
                'Stack.Capabilities',
                withOnlineGuard(this.components.onlineFeatureGuard, getCapabilitiesHandler(this.components)),
            ),
        );
        this.lsp.stackHandlers.onGetTemplateResources(
            withTelemetryContext('Stack.Template.Resources', getTemplateResourcesHandler(this.components)),
        );
        this.lsp.stackHandlers.onCreateDeployment(
            withTelemetryContext(
                'Stack.Create.Deployment',
                withOnlineGuard(this.components.onlineFeatureGuard, createDeploymentHandler(this.components)),
            ),
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
            withTelemetryContext(
                'Stack.Delete.ChangeSet',
                withOnlineGuard(this.components.onlineFeatureGuard, deleteChangeSetHandler(this.components)),
            ),
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
        this.lsp.stackHandlers.onListStacks(
            withTelemetryContext(
                'Stack.List',
                withOnlineGuard(this.components.onlineFeatureGuard, listStacksHandler(this.components)),
            ),
        );
        this.lsp.stackHandlers.onListChangeSets(
            withTelemetryContext(
                'Stack.List.ChangeSets',
                withOnlineGuard(this.components.onlineFeatureGuard, listChangeSetsHandler(this.components)),
            ),
        );
        this.lsp.stackHandlers.onListStackResources(
            withTelemetryContext(
                'Stack.List.Resources',
                withOnlineGuard(this.components.onlineFeatureGuard, listStackResourcesHandler(this.components)),
            ),
        );
        this.lsp.stackHandlers.onDescribeChangeSet(
            withTelemetryContext(
                'Stack.Describe.ChangeSet',
                withOnlineGuard(this.components.onlineFeatureGuard, describeChangeSetHandler(this.components)),
            ),
        );
        this.lsp.stackHandlers.onGetStackTemplate(
            withTelemetryContext(
                'Stack.Get.Template',
                withOnlineGuard(
                    this.components.onlineFeatureGuard,
                    getManagedResourceStackTemplateHandler(this.components),
                ),
            ),
        );
        this.lsp.stackHandlers.onGetStackEvents(
            withTelemetryContext(
                'Stack.Get.Events',
                withOnlineGuard(this.components.onlineFeatureGuard, getStackEventsHandler(this.components)),
            ),
        );
        this.lsp.stackHandlers.onClearStackEvents(
            withTelemetryContext('Stack.Clear.Events', clearStackEventsHandler(this.components)),
        );
        this.lsp.stackHandlers.onDescribeStack(
            withTelemetryContext(
                'Stack.Describe',
                withOnlineGuard(this.components.onlineFeatureGuard, describeStackHandler(this.components)),
            ),
        );
        this.lsp.stackHandlers.onDescribeEvents(
            withTelemetryContext(
                'Stack.Describe.Events',
                withOnlineGuard(this.components.onlineFeatureGuard, describeEventsHandler(this.components)),
            ),
        );

        this.lsp.cfnEnvironmentHandlers.onParseCfnEnvironmentFiles(
            withTelemetryContext('Cfn.Environment.Parse', parseCfnEnvironmentFilesHandler()),
        );

        this.lsp.relatedResourcesHandlers.onGetAuthoredResourceTypes(
            withTelemetryContext('Related.Resources.Get.Authored', getAuthoredResourceTypesHandler(this.components)),
        );
        this.lsp.relatedResourcesHandlers.onGetAuthoredResourceTypesV2(
            withTelemetryContext(
                'Related.Resources.Get.Authored.V2',
                getAuthoredResourceTypesHandlerV2(this.components),
            ),
        );
        this.lsp.relatedResourcesHandlers.onGetRelatedResourceTypes(
            withTelemetryContext('Related.Resources.Get.Related', getRelatedResourceTypesHandler(this.components)),
        );
        this.lsp.relatedResourcesHandlers.onInsertRelatedResources(
            withTelemetryContext('Related.Resources.Insert', insertRelatedResourcesHandler(this.components)),
        );

        this.lsp.resourceHandlers.onListResources(
            withTelemetryContext(
                'Resource.List',
                withOnlineGuard(this.components.onlineFeatureGuard, listResourcesHandler(this.components)),
            ),
        );
        this.lsp.resourceHandlers.onRefreshResourceList(
            withTelemetryContext(
                'Resource.Refresh.List',
                withOnlineGuard(this.components.onlineFeatureGuard, refreshResourceListHandler(this.components)),
            ),
        );
        this.lsp.resourceHandlers.onSearchResource(
            withTelemetryContext(
                'Resource.Search',
                withOnlineGuard(this.components.onlineFeatureGuard, searchResourceHandler(this.components)),
            ),
        );
        this.lsp.resourceHandlers.onGetResourceTypes(
            withTelemetryContext('Resource.Get.Types', getResourceTypesHandler(this.components)),
        );
        this.lsp.resourceHandlers.onRemoveResourceType(
            withTelemetryContext('Resource.Remove.Type', removeResourceTypeHandler(this.components)),
        );
        this.lsp.resourceHandlers.onResourceStateImport(
            withTelemetryContext(
                'Resource.State.Import',
                withOnlineGuard(this.components.onlineFeatureGuard, importResourceStateHandler(this.components)),
            ),
        );
        this.lsp.resourceHandlers.onStackMgmtInfo(
            withTelemetryContext(
                'Resource.Stack.Mgmt.Info',
                withOnlineGuard(this.components.onlineFeatureGuard, getStackMgmtInfo(this.components)),
            ),
        );

        this.lsp.s3Handlers.onUploadFile(
            withTelemetryContext(
                'S3.Upload.File',
                withOnlineGuard(this.components.onlineFeatureGuard, uploadFileToS3Handler(this.components)),
            ),
        );

        // Hooks
        this.lsp.hooksHandlers.onListHooks(
            withTelemetryContext(
                'Hooks.List',
                withOnlineGuard(this.components.onlineFeatureGuard, listHooksHandler(this.components)),
            ),
        );
        this.lsp.hooksHandlers.onListHooksDetailed(
            withTelemetryContext(
                'Hooks.ListDetailed',
                withOnlineGuard(this.components.onlineFeatureGuard, listHooksDetailedHandler(this.components)),
            ),
        );
        this.lsp.hooksHandlers.onListPublicHooks(
            withTelemetryContext(
                'Hooks.ListPublic',
                withOnlineGuard(this.components.onlineFeatureGuard, listPublicHooksHandler(this.components)),
            ),
        );
        this.lsp.hooksHandlers.onDescribeHook(
            withTelemetryContext(
                'Hooks.Describe',
                withOnlineGuard(this.components.onlineFeatureGuard, describeHookHandler(this.components)),
            ),
        );
        this.lsp.hooksHandlers.onListHookResults(
            withTelemetryContext(
                'Hooks.Results.List',
                withOnlineGuard(this.components.onlineFeatureGuard, listHookResultsHandler(this.components)),
            ),
        );
        this.lsp.hooksHandlers.onGetHookResult(
            withTelemetryContext(
                'Hooks.Result.Get',
                withOnlineGuard(this.components.onlineFeatureGuard, getHookResultHandler(this.components)),
            ),
        );
        this.lsp.hooksHandlers.onConfigureHook(
            withTelemetryContext(
                'Hooks.Configure',
                withOnlineGuard(this.components.onlineFeatureGuard, configureHookHandler(this.components)),
            ),
        );
        this.lsp.hooksHandlers.onSetInvocationStatus(
            withTelemetryContext(
                'Hooks.SetInvocationStatus',
                withOnlineGuard(this.components.onlineFeatureGuard, setInvocationStatusHandler(this.components)),
            ),
        );
        this.lsp.hooksHandlers.onCreateGuardHook(
            withTelemetryContext(
                'Hooks.CreateGuardHook',
                withOnlineGuard(this.components.onlineFeatureGuard, createGuardHookHandler(this.components)),
            ),
        );
        this.lsp.hooksHandlers.onListIamRoles(
            withTelemetryContext(
                'Hooks.ListIamRoles',
                withOnlineGuard(this.components.onlineFeatureGuard, listIamRolesHandler(this.components)),
            ),
        );
        this.lsp.hooksHandlers.onListS3Buckets(
            withTelemetryContext(
                'Hooks.ListS3Buckets',
                withOnlineGuard(this.components.onlineFeatureGuard, listS3BucketsHandler(this.components)),
            ),
        );
        this.lsp.hooksHandlers.onListS3Objects(
            withTelemetryContext(
                'Hooks.ListS3Objects',
                withOnlineGuard(this.components.onlineFeatureGuard, listS3ObjectsHandler(this.components)),
            ),
        );
        this.lsp.hooksHandlers.onListProactiveControls(
            withTelemetryContext(
                'Hooks.ListProactiveControls',
                withOnlineGuard(this.components.onlineFeatureGuard, listProactiveControlsHandler(this.components)),
            ),
        );
        this.lsp.hooksHandlers.onCreateS3Bucket(
            withTelemetryContext(
                'Hooks.CreateS3Bucket',
                withOnlineGuard(this.components.onlineFeatureGuard, createS3BucketHandler(this.components)),
            ),
        );
        this.lsp.hooksHandlers.onCreateHookExecutionRole(
            withTelemetryContext(
                'Hooks.CreateHookExecutionRole',
                withOnlineGuard(this.components.onlineFeatureGuard, createHookExecutionRoleHandler(this.components)),
            ),
        );
        this.lsp.hooksHandlers.onActivateHook(
            withTelemetryContext(
                'Hooks.Activate',
                withOnlineGuard(this.components.onlineFeatureGuard, activateHookHandler(this.components)),
            ),
        );
        this.lsp.hooksHandlers.onDeactivateHook(
            withTelemetryContext(
                'Hooks.Deactivate',
                withOnlineGuard(this.components.onlineFeatureGuard, deactivateHookHandler(this.components)),
            ),
        );
        this.lsp.hooksHandlers.onSetHookConfiguration(
            withTelemetryContext(
                'Hooks.SetConfiguration',
                withOnlineGuard(this.components.onlineFeatureGuard, setHookConfigurationHandler(this.components)),
            ),
        );
        this.lsp.hooksHandlers.onGetHookConfiguration(
            withTelemetryContext(
                'Hooks.GetConfiguration',
                withOnlineGuard(this.components.onlineFeatureGuard, getHookConfigurationHandler(this.components)),
            ),
        );
        this.lsp.hooksHandlers.onGetRuleContent(
            withTelemetryContext(
                'Hooks.GetRuleContent',
                withOnlineGuard(this.components.onlineFeatureGuard, getRuleContentHandler(this.components)),
            ),
        );
        this.lsp.hooksHandlers.onValidateRule(withTelemetryContext('Hooks.ValidateRule', validateRuleHandler()));
        this.lsp.hooksHandlers.onUploadRule(
            withTelemetryContext(
                'Hooks.UploadRule',
                withOnlineGuard(this.components.onlineFeatureGuard, uploadRuleHandler(this.components)),
            ),
        );
        this.lsp.hooksHandlers.onPreviewGuardHooks(
            withTelemetryContext(
                'Hooks.PreviewGuardHooks',
                withOnlineGuard(this.components.onlineFeatureGuard, previewGuardHooksHandler(this.components)),
            ),
        );
    }

    async close(): Promise<void> {
        await closeSafely(this.providers, this.external, this.core);
    }
}
