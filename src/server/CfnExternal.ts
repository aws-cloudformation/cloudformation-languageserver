import { FeatureFlagProvider } from '../featureFlag/FeatureFlagProvider';
import { LspComponents } from '../protocol/LspComponents';
import { getSamSchemas } from '../schema/GetSamSchemaTask';
import { getRemotePrivateSchemas, getRemotePublicSchemas } from '../schema/GetSchemaTask';
import { SchemaReadiness } from '../schema/SchemaReadiness';
import { SchemaRetriever } from '../schema/SchemaRetriever';
import { SchemaStore } from '../schema/SchemaStore';
import { AwsClient } from '../services/AwsClient';
import { CcapiService } from '../services/CcapiService';
import { CfnLintService } from '../services/cfnLint/CfnLintService';
import { CfnService } from '../services/CfnService';
import { GuardService } from '../services/guard/GuardService';
import { MemoryMonitor } from '../services/MemoryMonitor';
import { OnlineStatus } from '../services/OnlineStatus';
import { S3Service } from '../services/S3Service';
import { Closeable, closeSafely } from '../utils/Closeable';
import { Configurable, Configurables } from '../utils/Configurable';
import { validatePositiveOrUndefined } from '../utils/Number';
import { OnlineFeatureGuard } from '../utils/OnlineFeatureGuard';
import { CfnInfraCore } from './CfnInfraCore';

/**
 * AWS Services (external APIs, services, etc.)
 */
export class CfnExternal implements Configurables, Closeable {
    readonly awsClient: AwsClient;

    readonly cfnService: CfnService;
    readonly ccapiService: CcapiService;
    readonly s3Service: S3Service;

    readonly schemaStore: SchemaStore;
    readonly schemaRetriever: SchemaRetriever;
    readonly schemaReadiness: SchemaReadiness;

    readonly cfnLintService: CfnLintService;
    readonly guardService: GuardService;

    readonly onlineStatus: OnlineStatus;
    readonly featureFlags: FeatureFlagProvider;
    readonly onlineFeatureGuard: OnlineFeatureGuard;
    readonly memoryMonitor: MemoryMonitor;

    constructor(lsp: LspComponents, core: CfnInfraCore, overrides: Omit<Partial<CfnExternal>, 'featureFlags'> = {}) {
        this.awsClient =
            overrides.awsClient ?? new AwsClient(core.awsCredentials, core.awsMetadata?.cloudformation?.endpoint);

        this.cfnService = overrides.cfnService ?? new CfnService(this.awsClient);
        this.ccapiService = overrides.ccapiService ?? new CcapiService(this.awsClient);
        this.s3Service = overrides.s3Service ?? new S3Service(this.awsClient);

        this.schemaStore = overrides.schemaStore ?? new SchemaStore(core.dataStoreFactory);
        this.schemaRetriever =
            overrides.schemaRetriever ??
            new SchemaRetriever(
                this.schemaStore,
                getRemotePublicSchemas,
                () => getRemotePrivateSchemas(core.awsCredentials, this.cfnService),
                getSamSchemas,
                undefined,
                validatePositiveOrUndefined(core.awsMetadata?.schema?.staleDaysThreshold),
            );
        this.schemaReadiness = overrides.schemaReadiness ?? new SchemaReadiness(this.schemaStore);

        this.cfnLintService =
            overrides.cfnLintService ??
            new CfnLintService(core.documentManager, lsp.workspace, core.diagnosticCoordinator);
        this.guardService =
            overrides.guardService ??
            new GuardService(core.documentManager, core.diagnosticCoordinator, core.syntaxTreeManager);

        this.onlineStatus = overrides.onlineStatus ?? new OnlineStatus();
        this.featureFlags = core.featureFlags;
        this.onlineFeatureGuard = overrides.onlineFeatureGuard ?? new OnlineFeatureGuard(core.awsCredentials);
        // RSS watchdog — restarts the Pyodide worker (or exits) on runaway
        // memory growth, and guards the main V8 heap (non-Pyodide pool) by
        // dropping rebuildable caches / exiting gracefully before V8 aborts.
        // Started from the initialized handler.
        this.memoryMonitor =
            overrides.memoryMonitor ??
            new MemoryMonitor(
                (reason) => this.cfnLintService.restartWorker(reason),
                {},
                (): Promise<void> => {
                    // Combined schema cache rebuilds on the next schema lookup
                    this.schemaStore.invalidate();
                    return Promise.resolve();
                },
            );
    }

    configurables(): Configurable[] {
        return [this.schemaRetriever, this.schemaReadiness, this.cfnLintService, this.guardService, this.cfnService];
    }

    async close() {
        return await closeSafely(
            this.memoryMonitor,
            this.cfnLintService,
            this.guardService,
            this.schemaRetriever,
            this.onlineStatus,
        );
    }
}
