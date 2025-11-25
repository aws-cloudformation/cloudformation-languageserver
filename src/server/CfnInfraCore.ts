import { AwsCredentials } from '../auth/AwsCredentials';
import { ContextManager } from '../context/ContextManager';
import { FileContextManager } from '../context/FileContextManager';
import { SyntaxTreeManager } from '../context/syntaxtree/SyntaxTreeManager';
import { DataStoreFactoryProvider, MultiDataStoreFactoryProvider } from '../datastore/DataStore';
import { DocumentManager } from '../document/DocumentManager';
import { DocumentMetadata } from '../document/DocumentProtocol';
import { LspComponents } from '../protocol/LspComponents';
import { DiagnosticCoordinator } from '../services/DiagnosticCoordinator';
import { SettingsManager } from '../settings/SettingsManager';
import { ValidationManager } from '../stacks/actions/ValidationManager';
import { ClientMessage } from '../telemetry/ClientMessage';
import { TelemetryService } from '../telemetry/TelemetryService';
import { UsageTracker } from '../usageTracker/UsageTracker';
import { UsageTrackerMetrics } from '../usageTracker/UsageTrackerMetrics';
import { Closeable, closeSafely } from '../utils/Closeable';
import { Configurable, Configurables } from '../utils/Configurable';
import { ExtendedInitializeParams } from './InitParams';

/**
 * Core Infrastructure
 * Only depends on LSP level components (or itself)
 * LSP cannot function without these components
 */
export class CfnInfraCore implements Configurables, Closeable {
    readonly dataStoreFactory: DataStoreFactoryProvider;
    readonly clientMessage: ClientMessage;
    readonly settingsManager: SettingsManager;

    readonly syntaxTreeManager: SyntaxTreeManager;
    readonly documentManager: DocumentManager;
    readonly contextManager: ContextManager;
    readonly fileContextManager: FileContextManager;

    readonly awsCredentials: AwsCredentials;
    readonly validationManager: ValidationManager;
    readonly diagnosticCoordinator: DiagnosticCoordinator;
    readonly cloudformationEndpoint?: string;
    readonly usageTracker: UsageTracker;
    readonly usageTrackerMetrics: UsageTrackerMetrics;

    constructor(
        lspComponents: LspComponents,
        initializeParams: ExtendedInitializeParams,
        overrides: Partial<CfnInfraCore> = {},
    ) {
        this.dataStoreFactory = overrides.dataStoreFactory ?? new MultiDataStoreFactoryProvider();
        this.clientMessage = overrides.clientMessage ?? new ClientMessage(lspComponents.communication);
        this.settingsManager = overrides.settingsManager ?? new SettingsManager(lspComponents.workspace);

        this.syntaxTreeManager = overrides.syntaxTreeManager ?? new SyntaxTreeManager();
        this.documentManager =
            overrides.documentManager ??
            new DocumentManager(lspComponents.documents.documents, (docs: DocumentMetadata[]) => {
                return lspComponents.documents.sendDocumentsMetadata(docs);
            });
        this.contextManager = overrides.contextManager ?? new ContextManager(this.syntaxTreeManager);
        this.fileContextManager = overrides.fileContextManager ?? new FileContextManager(this.documentManager);

        this.cloudformationEndpoint = initializeParams.initializationOptions?.aws?.cloudformation?.endpoint;

        this.awsCredentials =
            overrides.awsCredentials ??
            new AwsCredentials(
                lspComponents.authHandlers,
                this.settingsManager,
                initializeParams.initializationOptions?.aws?.encryption?.key,
            );

        this.validationManager = overrides.validationManager ?? new ValidationManager();

        this.diagnosticCoordinator =
            overrides.diagnosticCoordinator ??
            new DiagnosticCoordinator(lspComponents.diagnostics, this.syntaxTreeManager, this.validationManager);

        this.usageTracker = overrides.usageTracker ?? new UsageTracker();
        this.usageTrackerMetrics = overrides.usageTrackerMetrics ?? new UsageTrackerMetrics(this.usageTracker);
    }

    configurables(): Configurable[] {
        return [this.documentManager];
    }

    async close() {
        return await closeSafely(this.documentManager, this.dataStoreFactory, TelemetryService.instance);
    }
}
