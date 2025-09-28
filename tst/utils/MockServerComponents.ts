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
import { ContextManager } from '../../src/context/ContextManager';
import { SyntaxTreeManager } from '../../src/context/syntaxtree/SyntaxTreeManager';
import { DataStoreFactoryProvider, MemoryDataStoreFactoryProvider } from '../../src/datastore/DataStore';
import { DefinitionProvider } from '../../src/definition/DefinitionProvider';
import { DocumentManager } from '../../src/document/DocumentManager';
import { DocumentSymbolRouter } from '../../src/documentSymbol/DocumentSymbolRouter';
import { HoverRouter } from '../../src/hover/HoverRouter';
import { LspAuthHandlers } from '../../src/protocol/LspAuthHandlers';
import { LspCommunication } from '../../src/protocol/LspCommunication';
import { LspDiagnostics } from '../../src/protocol/LspDiagnostics';
import { LspDocuments } from '../../src/protocol/LspDocuments';
import { LspHandlers } from '../../src/protocol/LspHandlers';
import { LspResourceHandlers } from '../../src/protocol/LspResourceHandlers';
import { LspStackHandlers } from '../../src/protocol/LspStackHandlers';
import { LspTemplateHandlers } from '../../src/protocol/LspTemplateHandlers';
import { LspWorkspace } from '../../src/protocol/LspWorkspace';
import { ResourceStateImporter } from '../../src/resourceState/ResourceStateImporter';
import { ResourceStateManager } from '../../src/resourceState/ResourceStateManager';
import { StackManagementInfoProvider } from '../../src/resourceState/StackManagementInfoProvider';
import { CombinedSchemas } from '../../src/schema/CombinedSchemas';
import { GetSchemaTaskManager } from '../../src/schema/GetSchemaTaskManager';
import { SchemaRetriever } from '../../src/schema/SchemaRetriever';
import { ServerComponents } from '../../src/server/ServerComponents';
import { AwsClient } from '../../src/services/AwsClient';
import { CcapiService } from '../../src/services/CcapiService';
import { CfnLintService } from '../../src/services/cfnLint/CfnLintService';
import { CfnService } from '../../src/services/CfnService';
import { CodeActionService } from '../../src/services/CodeActionService';
import { DiagnosticCoordinator } from '../../src/services/DiagnosticCoordinator';
import { GuardService } from '../../src/services/guard/GuardService';
import { IacGeneratorService } from '../../src/services/IacGeneratorService';
import { DefaultSettings, Settings } from '../../src/settings/Settings';
import { SettingsManager } from '../../src/settings/SettingsManager';
import { ClientMessage } from '../../src/telemetry/ClientMessage';
import { DeploymentWorkflow } from '../../src/templates/DeploymentWorkflow';
import { ValidationWorkflow } from '../../src/templates/ValidationWorkflow';

export class MockedServerComponents extends ServerComponents {
    declare readonly diagnostics: StubbedInstance<LspDiagnostics>;
    declare readonly diagnosticCoordinator: StubbedInstance<DiagnosticCoordinator>;
    declare readonly workspace: StubbedInstance<LspWorkspace>;
    declare readonly documents: StubbedInstance<LspDocuments>;
    declare readonly communication: StubbedInstance<LspCommunication>;
    declare readonly authHandlers: StubbedInstance<LspAuthHandlers>;

    declare readonly dataStoreFactory: DataStoreFactoryProvider;
    declare readonly clientMessage: StubbedInstance<ClientMessage>;

    declare readonly settingsManager: StubbedInstance<SettingsManager>;
    declare readonly syntaxTreeManager: StubbedInstance<SyntaxTreeManager>;
    declare readonly documentManager: StubbedInstance<DocumentManager>;
    declare readonly contextManager: StubbedInstance<ContextManager>;

    declare readonly awsCredentials: StubbedInstance<AwsCredentials>;
    declare readonly awsClient: StubbedInstance<AwsClient>;
    declare readonly cfnService: StubbedInstance<CfnService>;
    declare readonly ccapiService: StubbedInstance<CcapiService>;
    declare readonly stackManagementInfoProvider: StubbedInstance<StackManagementInfoProvider>;
    declare readonly iacGeneratorService: StubbedInstance<IacGeneratorService>;

    declare readonly schemaTaskManager: StubbedInstance<GetSchemaTaskManager>;
    declare readonly schemaRetriever: StubbedInstance<SchemaRetriever>;
    declare readonly cfnLintService: StubbedInstance<CfnLintService>;
    declare readonly guardService: StubbedInstance<GuardService>;
    declare readonly resourceStateManager: StubbedInstance<ResourceStateManager>;
    declare readonly resourceStateImporter: StubbedInstance<ResourceStateImporter>;

    declare readonly hoverRouter: StubbedInstance<HoverRouter>;
    declare readonly completionRouter: StubbedInstance<CompletionRouter>;
    declare readonly inlineCompletionRouter: StubbedInstance<InlineCompletionRouter>;
    declare readonly definitionProvider: StubbedInstance<DefinitionProvider>;
    declare readonly codeActionService: StubbedInstance<CodeActionService>;
    declare readonly documentSymbolRouter: StubbedInstance<DocumentSymbolRouter>;

    declare readonly topLevelSectionCompletionProvider: StubbedInstance<TopLevelSectionCompletionProvider>;
    declare readonly resourceEntityCompletionProvider: StubbedInstance<ResourceEntityCompletionProvider>;
    declare readonly resourceStateCompletionProvider: StubbedInstance<ResourceStateCompletionProvider>;

    declare readonly validationWorkflowService: StubbedInstance<ValidationWorkflow>;
    declare readonly deploymentWorkflowService: StubbedInstance<DeploymentWorkflow>;
}

export function createMockDocumentManager() {
    return stubInterface<DocumentManager>();
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

export function createMockLspTemplateHandlers() {
    return stubInterface<LspTemplateHandlers>();
}

export function createMockStackHandlers() {
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

export function createMockClientMessage() {
    return stubInterface<ClientMessage>();
}

export function createMockContextManager() {
    return stubInterface<ContextManager>();
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

export function createMockComponents(overrides: Partial<ServerComponents> = {}): MockedServerComponents {
    const syntaxTreeManager = overrides.syntaxTreeManager ?? createMockSyntaxTreeManager();
    const documentManager = overrides.documentManager ?? createMockDocumentManager();
    const schemaRetriever = overrides.schemaRetriever ?? createMockSchemaRetriever();
    const resourceStateManager = overrides.resourceStateManager ?? createMockResourceStateManager();

    return new MockedServerComponents(
        {
            diagnostics: overrides.diagnostics ?? createMockLspDiagnostics(),
            workspace: overrides.workspace ?? createMockLspWorkspace(),
            documents: overrides.documents ?? createMockLspDocuments(),
            communication: overrides.communication ?? createMockLspCommunication(),
            authHandlers: overrides.authHandlers ?? createMockAuthHandlers(),
        },
        {
            dataStoreFactory: overrides.dataStoreFactory ?? createMockDataStore(),
            clientMessage: overrides.clientMessage ?? createMockClientMessage(),
            diagnosticCoordinator: overrides.diagnosticCoordinator ?? createMockDiagnosticCoordinator(),
            settingsManager: overrides.settingsManager ?? createMockSettingsManager(),
            syntaxTreeManager,
            documentManager,
            contextManager: overrides.contextManager ?? createMockContextManager(),
            awsCredentials: overrides.awsCredentials ?? createMockAwsCredentials(),
            awsClient: overrides.awsClient ?? createMockAwsApiClientComponent(),
            cfnService: overrides.cfnService ?? createMockCfnService(),
            ccapiService: overrides.ccapiService ?? createMockCcapiService(),
            iacGeneratorService: overrides.iacGeneratorService ?? createMockIacGeneratorService(),
            resourceStateManager,
            resourceStateImporter: overrides.resourceStateImporter ?? createMockResourceStateImporter(),
            schemaTaskManager: overrides.schemaTaskManager ?? createMockSchemaTaskManager(),
            schemaRetriever,
            cfnLintService: overrides.cfnLintService ?? createMockCfnLintService(),
            guardService: overrides.guardService ?? createMockGuardService(),
            hoverRouter: overrides.hoverRouter ?? createMockHoverRouter(),
            completionRouter: overrides.completionRouter ?? createMockCompletionRouter(),
            inlineCompletionRouter: overrides.inlineCompletionRouter ?? createMockInlineCompletionRouter(),
            definitionProvider: overrides.definitionProvider ?? createMockDefinitionProvider(),
            codeActionService: overrides.codeActionService ?? createMockCodeActionService(),
            documentSymbolRouter: overrides.documentSymbolRouter ?? createMockDocumentSymbolRouter(),
            topLevelSectionCompletionProvider:
                overrides.topLevelSectionCompletionProvider ??
                createMockTopLevelSectionCompletionProvider(syntaxTreeManager, documentManager),
            resourceEntityCompletionProvider:
                overrides.resourceEntityCompletionProvider ??
                createMockResourceEntityCompletionProvider(schemaRetriever, documentManager),
            resourceStateCompletionProvider:
                overrides.resourceStateCompletionProvider ??
                createMockResourceStateCompletionProvider(resourceStateManager, documentManager, schemaRetriever),
            validationWorkflowService: overrides.validationWorkflowService ?? createMockValidationWorkflowService(),
            deploymentWorkflowService: overrides.deploymentWorkflowService ?? createMockDeploymentWorkflowService(),
            cfnAI: overrides.cfnAI ?? mockCfnAi(),
        },
    );
}
