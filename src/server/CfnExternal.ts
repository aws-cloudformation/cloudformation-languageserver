import { FeatureFlagProvider } from '../featureFlag/FeatureFlagProvider';
import { LspComponents } from '../protocol/LspComponents';
import { getRemotePrivateSchemas, getRemotePublicSchemas } from '../schema/GetSchemaTask';
import { GetSchemaTaskManager } from '../schema/GetSchemaTaskManager';
import { SchemaRetriever } from '../schema/SchemaRetriever';
import { SchemaStore } from '../schema/SchemaStore';
import { AwsClient } from '../services/AwsClient';
import { CcapiService } from '../services/CcapiService';
import { CfnLintService } from '../services/cfnLint/CfnLintService';
import { CfnService } from '../services/CfnService';
import { GuardService } from '../services/guard/GuardService';
import { IacGeneratorService } from '../services/IacGeneratorService';
import { OnlineStatus } from '../services/OnlineStatus';
import { Closeable, closeSafely } from '../utils/Closeable';
import { Configurable, Configurables } from '../utils/Configurable';
import { CfnInfraCore } from './CfnInfraCore';

/**
 * AWS Services (external APIs, services, etc.)
 */
export class CfnExternal implements Configurables, Closeable {
    readonly awsClient: AwsClient;

    readonly cfnService: CfnService;
    readonly ccapiService: CcapiService;
    readonly iacGeneratorService: IacGeneratorService;

    readonly schemaStore: SchemaStore;
    readonly schemaTaskManager: GetSchemaTaskManager;
    readonly schemaRetriever: SchemaRetriever;

    readonly cfnLintService: CfnLintService;
    readonly guardService: GuardService;

    readonly onlineStatus: OnlineStatus;
    readonly featureFlags: FeatureFlagProvider;

    constructor(lsp: LspComponents, core: CfnInfraCore, overrides: Partial<CfnExternal> = {}) {
        this.awsClient = overrides.awsClient ?? new AwsClient(core.awsCredentials);

        this.cfnService = overrides.cfnService ?? new CfnService(this.awsClient);
        this.ccapiService = overrides.ccapiService ?? new CcapiService(this.awsClient);
        this.iacGeneratorService = overrides.iacGeneratorService ?? new IacGeneratorService(this.awsClient);

        this.schemaStore = overrides.schemaStore ?? new SchemaStore(core.dataStoreFactory);
        this.schemaTaskManager =
            overrides.schemaTaskManager ??
            new GetSchemaTaskManager(this.schemaStore, getRemotePublicSchemas, () => {
                return getRemotePrivateSchemas(this.cfnService);
            });
        this.schemaRetriever =
            overrides.schemaRetriever ?? new SchemaRetriever(this.schemaTaskManager, this.schemaStore);

        this.cfnLintService =
            overrides.cfnLintService ??
            new CfnLintService(core.documentManager, lsp.workspace, core.diagnosticCoordinator);
        this.guardService =
            overrides.guardService ??
            new GuardService(core.documentManager, core.diagnosticCoordinator, core.syntaxTreeManager);

        this.onlineStatus = overrides.onlineStatus ?? new OnlineStatus(core.clientMessage);
        this.featureFlags = overrides.featureFlags ?? new FeatureFlagProvider();
    }

    configurables(): Configurable[] {
        return [this.schemaTaskManager, this.schemaRetriever, this.awsClient, this.cfnLintService, this.guardService];
    }

    async close() {
        return await closeSafely(
            this.cfnLintService,
            this.guardService,
            this.schemaTaskManager,
            this.schemaRetriever,
            this.onlineStatus,
            this.featureFlags,
        );
    }
}
