import { CfnAI } from '../ai/CfnAI';
import { AwsCredentials } from '../auth/AwsCredentials';
import { CompletionRouter } from '../autocomplete/CompletionRouter';
import { InlineCompletionRouter } from '../autocomplete/InlineCompletionRouter';
import { ContextManager } from '../context/ContextManager';
import { SyntaxTreeManager } from '../context/syntaxtree/SyntaxTreeManager';
import { DataStoreFactoryProvider, MultiDataStoreFactoryProvider } from '../datastore/DataStore';
import { DefinitionProvider } from '../definition/DefinitionProvider';
import { DocumentManager } from '../document/DocumentManager';
import { DocumentSymbolRouter } from '../documentSymbol/DocumentSymbolRouter';
import { HoverRouter } from '../hover/HoverRouter';
import { LspAuthHandlers } from '../protocol/LspAuthHandlers';
import { LspCommunication } from '../protocol/LspCommunication';
import { LspFeatures } from '../protocol/LspConnection';
import { LspDiagnostics } from '../protocol/LspDiagnostics';
import { LspDocuments } from '../protocol/LspDocuments';
import { LspWorkspace } from '../protocol/LspWorkspace';
import { ResourceStateImporter } from '../resourceState/ResourceStateImporter';
import { ResourceStateManager } from '../resourceState/ResourceStateManager';
import { StackManagementInfoProvider } from '../resourceState/StackManagementInfoProvider';
import { GetSchemaTaskManager } from '../schema/GetSchemaTaskManager';
import { SchemaRetriever } from '../schema/SchemaRetriever';
import { SchemaStore } from '../schema/SchemaStore';
import { AwsClient } from '../services/AwsClient';
import { CcapiService } from '../services/CcapiService';
import { CfnLintService } from '../services/cfnLint/CfnLintService';
import { CfnService } from '../services/CfnService';
import { CodeActionService } from '../services/CodeActionService';
import { DiagnosticCoordinator } from '../services/DiagnosticCoordinator';
import { GuardService } from '../services/guard/GuardService';
import { IacGeneratorService } from '../services/IacGeneratorService';
import { SettingsManager } from '../settings/SettingsManager';
import { DeploymentWorkflow } from '../stacks/actions/DeploymentWorkflow';
import { ValidationManager } from '../stacks/actions/ValidationManager';
import { ValidationWorkflow } from '../stacks/actions/ValidationWorkflow';
import { ClientMessage } from '../telemetry/ClientMessage';
import { StdOutLogger, LoggerFactory } from '../telemetry/LoggerFactory';
import { TelemetryService } from '../telemetry/TelemetryService';

export interface Configurable {
    configure(settingsManager: SettingsManager): void | Promise<void>;
}

export interface Closeable {
    close(): void | Promise<void>;
}

export class ServerComponents {
    // LSP Protocol Components
    readonly diagnostics: LspDiagnostics;
    readonly workspace: LspWorkspace;
    readonly documents: LspDocuments;
    readonly communication: LspCommunication;
    readonly authHandlers: LspAuthHandlers;

    // Core Infrastructure (no dependencies)
    readonly dataStoreFactory: DataStoreFactoryProvider;
    readonly clientMessage: ClientMessage;

    // Settings, Document & Context Management
    readonly settingsManager: SettingsManager;
    readonly syntaxTreeManager: SyntaxTreeManager;
    readonly documentManager: DocumentManager;
    readonly contextManager: ContextManager;

    // Authentication & AWS Services (depends on settings/communication)
    readonly awsCredentials: AwsCredentials;
    readonly awsClient: AwsClient;
    readonly cfnService: CfnService;
    readonly ccapiService: CcapiService;
    readonly stackManagementInfoProvider: StackManagementInfoProvider;
    readonly iacGeneratorService: IacGeneratorService;
    readonly validationManager: ValidationManager;
    readonly validationWorkflowService: ValidationWorkflow;
    readonly deploymentWorkflowService: DeploymentWorkflow;
    readonly diagnosticCoordinator: DiagnosticCoordinator;

    // Schema & Linting Services (depends on AWS services)
    readonly schemaStore: SchemaStore;
    readonly schemaTaskManager: GetSchemaTaskManager;
    readonly schemaRetriever: SchemaRetriever;
    readonly cfnLintService: CfnLintService;
    readonly resourceStateManager: ResourceStateManager;
    readonly resourceStateImporter: ResourceStateImporter;

    readonly guardService: GuardService;

    // LSP Feature Providers (depends on context/schema)
    readonly hoverRouter: HoverRouter;
    readonly completionRouter: CompletionRouter;
    readonly inlineCompletionRouter: InlineCompletionRouter;
    readonly definitionProvider: DefinitionProvider;
    readonly codeActionService: CodeActionService;
    readonly documentSymbolRouter: DocumentSymbolRouter;

    // AI
    readonly cfnAI: CfnAI;

    // Component Management
    private configurableComponents: Configurable[] = [];
    private closeableComponents: Closeable[] = [];

    constructor(
        features: Omit<LspFeatures, 'handlers' | 'stackHandlers' | 'resourceHandlers'>,
        overrides: Partial<ServerComponents> = {},
    ) {
        this.diagnostics = features.diagnostics;
        this.workspace = features.workspace;
        this.documents = features.documents;
        this.communication = features.communication;
        this.authHandlers = features.authHandlers;

        this.dataStoreFactory = overrides.dataStoreFactory ?? new MultiDataStoreFactoryProvider();
        this.clientMessage = overrides.clientMessage ?? new ClientMessage(features.communication);

        this.settingsManager = overrides.settingsManager ?? SettingsManager.create(this);
        this.syntaxTreeManager = overrides.syntaxTreeManager ?? SyntaxTreeManager.create(this);
        this.documentManager = overrides.documentManager ?? DocumentManager.create(this);
        this.contextManager = overrides.contextManager ?? ContextManager.create(this);

        this.awsCredentials = overrides.awsCredentials ?? AwsCredentials.create(this);
        this.awsClient = overrides.awsClient ?? AwsClient.create(this);
        this.cfnService = overrides.cfnService ?? CfnService.create(this);
        this.ccapiService = overrides.ccapiService ?? CcapiService.create(this);
        this.stackManagementInfoProvider =
            overrides.stackManagementInfoProvider ?? new StackManagementInfoProvider(this.cfnService);
        this.iacGeneratorService = overrides.iacGeneratorService ?? IacGeneratorService.create(this);
        this.validationManager = overrides.validationManager ?? new ValidationManager();
        this.diagnosticCoordinator = overrides.diagnosticCoordinator ?? new DiagnosticCoordinator(features.diagnostics);
        this.validationWorkflowService = overrides.validationWorkflowService ?? ValidationWorkflow.create(this);
        this.deploymentWorkflowService = overrides.deploymentWorkflowService ?? DeploymentWorkflow.create(this);

        this.schemaStore = overrides.schemaStore ?? SchemaStore.create(this);
        this.schemaTaskManager = overrides.schemaTaskManager ?? GetSchemaTaskManager.create(this);
        this.schemaRetriever = overrides.schemaRetriever ?? SchemaRetriever.create(this);
        this.cfnLintService = overrides.cfnLintService ?? CfnLintService.create(this);
        this.resourceStateManager = overrides.resourceStateManager ?? ResourceStateManager.create(this);
        this.resourceStateImporter = overrides.resourceStateImporter ?? ResourceStateImporter.create(this);

        this.guardService = overrides.guardService ?? GuardService.create(this);

        this.hoverRouter = overrides.hoverRouter ?? HoverRouter.create(this);
        this.completionRouter = overrides.completionRouter ?? CompletionRouter.create(this);
        this.inlineCompletionRouter = overrides.inlineCompletionRouter ?? InlineCompletionRouter.create(this);
        this.definitionProvider = overrides.definitionProvider ?? DefinitionProvider.create(this);
        this.codeActionService = overrides.codeActionService ?? CodeActionService.create(this);
        this.documentSymbolRouter = overrides.documentSymbolRouter ?? DocumentSymbolRouter.create(this);

        this.cfnAI = overrides.cfnAI ?? CfnAI.create(this);

        // Register components for configuration and close in dependency order
        this.registerComponents();

        // Configure all components with SettingsManager (synchronous subscription setup)
        this.configure();
    }

    /**
     * Register components in separate arrays based on their capabilities
     */
    private registerComponents(): void {
        this.configurableComponents = [
            LoggerFactory.instance,
            TelemetryService.instance,
            this.documentManager,
            this.cfnAI,
            this.schemaTaskManager,
            this.schemaRetriever,
            this.hoverRouter,
            this.completionRouter,
            this.inlineCompletionRouter,
            this.cfnLintService,
            this.guardService,
            this.clientMessage,
            this.awsClient,
            this.resourceStateManager,
        ];

        // Components that can be closed (components will be closed in the order specified here)
        this.closeableComponents = [
            this.resourceStateManager,
            this.hoverRouter,
            this.completionRouter,
            this.inlineCompletionRouter,
            this.schemaTaskManager,
            this.cfnLintService,
            this.guardService,
            this.cfnAI,
            this.dataStoreFactory,
            this.clientMessage,
            TelemetryService.instance,
            LoggerFactory.instance,
        ];

        StdOutLogger.info(
            `Registered ${this.configurableComponents.length} configurable and ${this.closeableComponents.length} closeable components`,
        );
    }

    private configure(): void {
        // Configure each component with SettingsManager (sets up subscriptions)
        for (const component of this.configurableComponents) {
            try {
                const configResult = component.configure(this.settingsManager);

                // Handle both sync and async configure methods
                if (configResult instanceof Promise) {
                    // Log async configure calls but don't await them in constructor
                    configResult.catch((error: unknown) => {
                        StdOutLogger.error({ error }, 'Failed to configure component asynchronously');
                    });
                }
            } catch (error: unknown) {
                StdOutLogger.error({ error }, 'Failed to configure component');
            }
        }
    }

    async close(): Promise<void> {
        // Close each component
        for (const component of this.closeableComponents) {
            try {
                const closeResult = component.close();

                // Handle both sync and async close methods
                if (closeResult instanceof Promise) {
                    await closeResult;
                }
            } catch (error) {
                StdOutLogger.error({ error }, 'Failed to close component');
            }
        }
    }
}
