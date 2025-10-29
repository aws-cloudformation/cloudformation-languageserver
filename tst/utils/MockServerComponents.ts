import { Logger } from 'pino';
import { StubbedInstance, stubInterface } from 'ts-sinon';
import { RemoteConsole } from 'vscode-languageserver/node';
import { CfnAI } from '../../src/ai/CfnAI';
import { AwsCredentials } from '../../src/auth/AwsCredentials';
import { CompletionRouter } from '../../src/autocomplete/CompletionRouter';
import { InlineCompletionRouter } from '../../src/autocomplete/InlineCompletionRouter';
import { ResourceEntityCompletionProvider } from '../../src/autocomplete/ResourceEntityCompletionProvider';
import { ResourceStateCompletionProvider } from '../../src/autocomplete/ResourceStateCompletionProvider';
import { TopLevelSectionCompletionProvider } from '../../src/autocomplete/TopLevelSectionCompletionProvider';
import { CodeLensProvider } from '../../src/codeLens/CodeLensProvider';
import { ManagedResourceCodeLens } from '../../src/codeLens/ManagedResourceCodeLens';
import { ContextManager } from '../../src/context/ContextManager';
import { FileContextManager } from '../../src/context/FileContextManager';
import { SyntaxTreeManager } from '../../src/context/syntaxtree/SyntaxTreeManager';
import { DataStoreFactoryProvider, MemoryDataStoreFactoryProvider } from '../../src/datastore/DataStore';
import { DefinitionProvider } from '../../src/definition/DefinitionProvider';
import { DocumentManager } from '../../src/document/DocumentManager';
import { DocumentSymbolRouter } from '../../src/documentSymbol/DocumentSymbolRouter';
import { FeatureFlagProvider } from '../../src/featureFlag/FeatureFlagProvider';
import { HoverRouter } from '../../src/hover/HoverRouter';
import { LspAuthHandlers } from '../../src/protocol/LspAuthHandlers';
import { LspCommunication } from '../../src/protocol/LspCommunication';
import { LspComponents } from '../../src/protocol/LspComponents';
import { LspDiagnostics } from '../../src/protocol/LspDiagnostics';
import { LspDocuments } from '../../src/protocol/LspDocuments';
import { LspHandlers } from '../../src/protocol/LspHandlers';
import { LspResourceHandlers } from '../../src/protocol/LspResourceHandlers';
import { LspStackHandlers } from '../../src/protocol/LspStackHandlers';
import { LspWorkspace } from '../../src/protocol/LspWorkspace';
import { ResourceStateImporter } from '../../src/resourceState/ResourceStateImporter';
import { ResourceStateManager } from '../../src/resourceState/ResourceStateManager';
import { StackManagementInfoProvider } from '../../src/resourceState/StackManagementInfoProvider';
import { CombinedSchemas } from '../../src/schema/CombinedSchemas';
import { GetSchemaTaskManager } from '../../src/schema/GetSchemaTaskManager';
import { SchemaRetriever } from '../../src/schema/SchemaRetriever';
import { SchemaStore } from '../../src/schema/SchemaStore';
import {
    CfnExternalType,
    CfnInfraCoreType,
    CfnLspProvidersType,
    CfnLspServerComponentsType,
} from '../../src/server/ServerComponents';
import { AwsClient } from '../../src/services/AwsClient';
import { CcapiService } from '../../src/services/CcapiService';
import { CfnLintService } from '../../src/services/cfnLint/CfnLintService';
import { CfnService } from '../../src/services/CfnService';
import { CodeActionService } from '../../src/services/CodeActionService';
import { DiagnosticCoordinator } from '../../src/services/DiagnosticCoordinator';
import { GuardService } from '../../src/services/guard/GuardService';
import { IacGeneratorService } from '../../src/services/IacGeneratorService';
import { OnlineStatus } from '../../src/services/OnlineStatus';
import { RelationshipSchemaService } from '../../src/services/RelationshipSchemaService';
import { DefaultSettings, Settings } from '../../src/settings/Settings';
import { SettingsManager } from '../../src/settings/SettingsManager';
import { ChangeSetDeletionWorkflow } from '../../src/stacks/actions/ChangeSetDeletionWorkflow';
import { DeploymentWorkflow } from '../../src/stacks/actions/DeploymentWorkflow';
import { ValidationWorkflow } from '../../src/stacks/actions/ValidationWorkflow';
import { StackEventManager } from '../../src/stacks/StackEventManager';
import { StackManager } from '../../src/stacks/StackManager';
import { ClientMessage } from '../../src/telemetry/ClientMessage';
import { Closeable } from '../../src/utils/Closeable';
import { Configurables } from '../../src/utils/Configurable';

export function createMockDocumentManager(customSettings?: Settings) {
    const mock = stubInterface<DocumentManager>();
    const settings = customSettings ?? DefaultSettings;
    mock.getEditorSettingsForDocument.returns(settings.editor);
    return mock;
}

export function createMockSyntaxTreeManager() {
    return stubInterface<SyntaxTreeManager>();
}

export function createMockAuthHandlers() {
    return stubInterface<LspAuthHandlers>();
}

export function createMockLspResourceHandlers() {
    return stubInterface<LspResourceHandlers>();
}

export function createMockLspStackHandlers() {
    return stubInterface<LspStackHandlers>();
}

export function createMockLspCommunication() {
    const mock = stubInterface<LspCommunication>();
    (mock as any).console = stubInterface<RemoteConsole>();
    return mock;
}

export function createMockLspDiagnostics() {
    return stubInterface<LspDiagnostics>();
}

export function createMockDiagnosticCoordinator() {
    const mock = stubInterface<DiagnosticCoordinator>();
    mock.publishDiagnostics.returns(Promise.resolve());
    mock.clearDiagnosticsForUri.returns(Promise.resolve());
    mock.getDiagnostics.returns([]);
    mock.getSources.returns([]);
    mock.getKeyRangeFromPath.returns(undefined);
    return mock;
}

export function createMockLspDocuments() {
    return stubInterface<LspDocuments>();
}

export function createMockLspHandlers() {
    return stubInterface<LspHandlers>();
}

export function createMockLspWorkspace() {
    return stubInterface<LspWorkspace>();
}

export function createMockCfnLintService() {
    const mock = stubInterface<CfnLintService>();
    mock.initialize.returns(Promise.resolve());
    mock.mountFolder.returns(Promise.resolve());
    mock.lint.returns(Promise.resolve());
    mock.lintDelayed.returns(Promise.resolve());
    return mock;
}

export function createMockGuardService() {
    const mock = stubInterface<GuardService>();
    mock.validate.returns(Promise.resolve());
    mock.validateDelayed.returns(Promise.resolve());
    mock.cancelDelayedValidation.returns();
    mock.cancelAllDelayedValidation.returns();
    mock.getPendingValidationCount.returns(0);
    mock.getQueuedValidationCount.returns(0);
    mock.getActiveValidationCount.returns(0);
    mock.isReady.returns(true);
    return mock;
}

export function createMockCodeActionService() {
    return stubInterface<CodeActionService>();
}

function createMockClientMessage() {
    return stubInterface<ClientMessage>();
}

export function createMockContextManager() {
    return stubInterface<ContextManager>();
}

export function createMockFileContextManager() {
    return stubInterface<FileContextManager>();
}

export function createMockSchemaTaskManager() {
    return stubInterface<GetSchemaTaskManager>();
}

export function createMockSchemaRetriever(schemas?: CombinedSchemas) {
    const mock = stubInterface<SchemaRetriever>();
    if (schemas) {
        mock.getDefault.returns(schemas);
    }
    return mock;
}

export function createMockRelationshipSchemaService() {
    const mock = stubInterface<RelationshipSchemaService>();
    mock.extractResourceTypesFromTemplate.returns([]);
    mock.getAllRelatedResourceTypes.returns(new Set<string>());
    mock.getRelationshipsForResourceType.returns(undefined);
    mock.getRelationshipContext.returns('');
    return mock;
}

export function createMockCfnService() {
    return stubInterface<CfnService>();
}

export function createMockCcapiService() {
    return stubInterface<CcapiService>();
}

export function createMockStackManagementInfoProvider() {
    return stubInterface<StackManagementInfoProvider>();
}

export function createMockIacGeneratorService() {
    return stubInterface<IacGeneratorService>();
}

export function createMockResourceStateManager() {
    return stubInterface<ResourceStateManager>();
}

export function createMockResourceStateImporter() {
    return stubInterface<ResourceStateImporter>();
}

export function createMockSettingsManager(customSettings?: Settings) {
    const mock = stubInterface<SettingsManager>();
    mock.getCurrentSettings.returns(customSettings ?? DefaultSettings);
    mock.syncConfiguration.returns(Promise.resolve());
    return mock;
}

export function createMockHoverRouter() {
    return stubInterface<HoverRouter>();
}

export function createMockCompletionRouter() {
    return stubInterface<CompletionRouter>();
}

export function createMockInlineCompletionRouter() {
    return stubInterface<InlineCompletionRouter>();
}

export function createMockDocumentSymbolRouter() {
    return stubInterface<DocumentSymbolRouter>();
}

export function createMockManagedResourceCodeLens() {
    return stubInterface<ManagedResourceCodeLens>();
}

export function createMockTopLevelSectionCompletionProvider(
    syntaxTreeManager?: SyntaxTreeManager,
    documentManager?: DocumentManager,
) {
    if (syntaxTreeManager && documentManager) {
        return new TopLevelSectionCompletionProvider(syntaxTreeManager, documentManager);
    }
    return stubInterface<TopLevelSectionCompletionProvider>();
}

export function createMockResourceEntityCompletionProvider(
    schemaRetriever?: SchemaRetriever,
    documentManager?: DocumentManager,
) {
    if (schemaRetriever && documentManager) {
        return new ResourceEntityCompletionProvider(schemaRetriever, documentManager);
    }
    return stubInterface<ResourceEntityCompletionProvider>();
}

export function createMockResourceStateCompletionProvider(
    resourceStateManager?: ResourceStateManager,
    documentManager?: DocumentManager,
    schemaRetriever?: SchemaRetriever,
) {
    if (resourceStateManager && documentManager && schemaRetriever) {
        return new ResourceStateCompletionProvider(resourceStateManager, documentManager, schemaRetriever);
    }
    return stubInterface<ResourceStateCompletionProvider>();
}

export function createMockValidationWorkflowService() {
    return stubInterface<ValidationWorkflow>();
}

export function createMockDeploymentWorkflowService() {
    return stubInterface<DeploymentWorkflow>();
}

export function createMockChangeSetDeletionWorkflowService() {
    return stubInterface<ChangeSetDeletionWorkflow>();
}

export function createMockAwsCredentials() {
    return stubInterface<AwsCredentials>();
}

export function createMockDefinitionProvider() {
    return stubInterface<DefinitionProvider>();
}

export function createMockAwsApiClientComponent() {
    return stubInterface<AwsClient>();
}

export function createMockDataStore(): DataStoreFactoryProvider {
    return new MemoryDataStoreFactoryProvider();
}

export function mockViClientMessage() {
    return stubInterface<ClientMessage>();
}

export function mockLogger() {
    return stubInterface<Logger>();
}

export function mockCfnAi() {
    return stubInterface<CfnAI>();
}

type StubbedInstanceProps<T, Exclude extends keyof T = never> = Omit<
    {
        [P in keyof T]: T[P] extends object ? StubbedInstance<T[P]> : T[P];
    },
    Exclude
>;

type MockLspComponents = StubbedInstanceProps<LspComponents>;
type MockInfraCoreComponents = StubbedInstanceProps<CfnInfraCoreType, 'dataStoreFactory'> & {
    dataStoreFactory: DataStoreFactoryProvider;
} & Closeable<Promise<void>> &
    Configurables;
type MockExternalComponents = StubbedInstanceProps<CfnExternalType> & Closeable<Promise<void>> & Configurables;
type MockLspProviders = StubbedInstanceProps<CfnLspProvidersType> & Closeable<Promise<void>> & Configurables;
export type MockedServerComponents = {
    lsp: MockLspComponents;
    core: MockInfraCoreComponents;
    external: MockExternalComponents;
    providers: MockLspProviders;
} & MockLspComponents &
    MockInfraCoreComponents &
    MockExternalComponents &
    MockLspProviders;

export function createMockComponents(o: Partial<CfnLspServerComponentsType> = {}): MockedServerComponents {
    const overrides = o as Partial<MockedServerComponents>;
    const dataStoreFactory = overrides.dataStoreFactory ?? createMockDataStore();

    const lsp: MockLspComponents = {
        diagnostics: overrides.diagnostics ?? createMockLspDiagnostics(),
        workspace: overrides.workspace ?? createMockLspWorkspace(),
        documents: overrides.documents ?? createMockLspDocuments(),
        communication: overrides.communication ?? createMockLspCommunication(),
        handlers: overrides.handlers ?? stubInterface<LspHandlers>(),
        authHandlers: overrides.authHandlers ?? createMockAuthHandlers(),
        stackHandlers: overrides.stackHandlers ?? stubInterface<LspStackHandlers>(),
        resourceHandlers: overrides.resourceHandlers ?? stubInterface<LspResourceHandlers>(),
    };

    const core: MockInfraCoreComponents = {
        dataStoreFactory,
        clientMessage: overrides.clientMessage ?? createMockClientMessage(),
        settingsManager: overrides.settingsManager ?? createMockSettingsManager(),
        syntaxTreeManager: overrides.syntaxTreeManager ?? createMockSyntaxTreeManager(),
        documentManager: overrides.documentManager ?? createMockDocumentManager(),
        fileContextManager: overrides.fileContextManager ?? createMockFileContextManager(),
        contextManager: overrides.contextManager ?? createMockContextManager(),
        awsCredentials: overrides.awsCredentials ?? createMockAwsCredentials(),
        diagnosticCoordinator: overrides.diagnosticCoordinator ?? createMockDiagnosticCoordinator(),
        close: () => Promise.resolve(),
        configurables: () => [],
    };

    const external: MockExternalComponents = {
        awsClient: overrides.awsClient ?? createMockAwsApiClientComponent(),
        cfnService: overrides.cfnService ?? createMockCfnService(),
        ccapiService: overrides.ccapiService ?? createMockCcapiService(),
        iacGeneratorService: overrides.iacGeneratorService ?? createMockIacGeneratorService(),
        schemaStore: overrides.schemaStore ?? new SchemaStore(dataStoreFactory),
        schemaTaskManager: overrides.schemaTaskManager ?? createMockSchemaTaskManager(),
        schemaRetriever: overrides.schemaRetriever ?? createMockSchemaRetriever(),
        cfnLintService: overrides.cfnLintService ?? createMockCfnLintService(),
        guardService: overrides.guardService ?? createMockGuardService(),
        onlineStatus: overrides.onlineStatus ?? stubInterface<OnlineStatus>(),
        featureFlags: overrides.featureFlags ?? stubInterface<FeatureFlagProvider>(),
        close: () => Promise.resolve(),
        configurables: () => [],
    };

    const providers: MockLspProviders = {
        stackManagementInfoProvider:
            overrides.stackManagementInfoProvider ?? stubInterface<StackManagementInfoProvider>(),
        stackManager: overrides.stackManager ?? stubInterface<StackManager>(),
        stackEventManager: overrides.stackEventManager ?? stubInterface<StackEventManager>(),
        validationWorkflowService: overrides.validationWorkflowService ?? createMockValidationWorkflowService(),
        deploymentWorkflowService: overrides.deploymentWorkflowService ?? createMockDeploymentWorkflowService(),
        changeSetDeletionWorkflowService:
            overrides.changeSetDeletionWorkflowService ?? createMockChangeSetDeletionWorkflowService(),
        resourceStateManager: overrides.resourceStateManager ?? createMockResourceStateManager(),
        resourceStateImporter: overrides.resourceStateImporter ?? createMockResourceStateImporter(),
        relationshipSchemaService: overrides.relationshipSchemaService ?? stubInterface<RelationshipSchemaService>(),
        hoverRouter: overrides.hoverRouter ?? createMockHoverRouter(),
        completionRouter: overrides.completionRouter ?? createMockCompletionRouter(),
        inlineCompletionRouter: overrides.inlineCompletionRouter ?? createMockInlineCompletionRouter(),
        definitionProvider: overrides.definitionProvider ?? createMockDefinitionProvider(),
        codeActionService: overrides.codeActionService ?? createMockCodeActionService(),
        documentSymbolRouter: overrides.documentSymbolRouter ?? createMockDocumentSymbolRouter(),
        codeLensProvider: overrides.codeLensProvider ?? stubInterface<CodeLensProvider>(),
        cfnAI: overrides.cfnAI ?? mockCfnAi(),
        close: () => Promise.resolve(),
        configurables: () => [],
    };

    return {
        lsp,
        core,
        external,
        providers,
        ...lsp,
        ...core,
        ...external,
        ...providers,
    };
}
