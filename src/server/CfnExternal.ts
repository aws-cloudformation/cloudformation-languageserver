import { FeatureFlagProvider, getFromGitHub } from '../featureFlag/FeatureFlagProvider';
import { LspComponents } from '../protocol/LspComponents';
import { getSamSchemas } from '../schema/GetSamSchemaTask';
import { getRemotePrivateSchemas, getRemotePublicSchemas } from '../schema/GetSchemaTask';
import { SchemaRetriever } from '../schema/SchemaRetriever';
import { SchemaStore } from '../schema/SchemaStore';
import { AwsClient } from '../services/AwsClient';
import { CcapiService } from '../services/CcapiService';
import { CfnLintService } from '../services/cfnLint/CfnLintService';
import { CfnService } from '../services/CfnService';
import { GuardService } from '../services/guard/GuardService';
import { IacGeneratorService } from '../services/IacGeneratorService';
import { OnlineStatus } from '../services/OnlineStatus';
import { S3Service } from '../services/S3Service';
import { Closeable, closeSafely } from '../utils/Closeable';
import { Configurable, Configurables } from '../utils/Configurable';
import { OnlineFeatureGuard } from '../utils/OnlineFeatureGuard';
import { CfnInfraCore } from './CfnInfraCore';

/**
 * AWS Services (external APIs, services, etc.)
 */
export class CfnExternal implements Configurables, Closeable {
    readonly awsClient: AwsClient;

    readonly cfnService: CfnService;
    readonly ccapiService: CcapiService;
    readonly iacGeneratorService: IacGeneratorService;
    readonly s3Service: S3Service;

    readonly schemaStore: SchemaStore;
    readonly schemaRetriever: SchemaRetriever;

    readonly cfnLintService: CfnLintService;
    readonly guardService: GuardService;

    readonly onlineStatus: OnlineStatus;
    readonly featureFlags: FeatureFlagProvider;
    readonly onlineFeatureGuard: OnlineFeatureGuard;

    constructor(lsp: LspComponents, core: CfnInfraCore, overrides: Partial<CfnExternal> = {}) {
        this.awsClient = overrides.awsClient ?? new AwsClient(core.awsCredentials, core.cloudformationEndpoint);

        this.cfnService = overrides.cfnService ?? new CfnService(this.awsClient);
        this.ccapiService = overrides.ccapiService ?? new CcapiService(this.awsClient);
        this.iacGeneratorService = overrides.iacGeneratorService ?? new IacGeneratorService(this.awsClient);
        this.s3Service = overrides.s3Service ?? new S3Service(this.awsClient);

        this.schemaStore = overrides.schemaStore ?? new SchemaStore(core.dataStoreFactory);
        this.schemaRetriever =
            overrides.schemaRetriever ??
            new SchemaRetriever(
                this.schemaStore,
                getRemotePublicSchemas,
                () => getRemotePrivateSchemas(core.awsCredentials, this.cfnService),
                getSamSchemas,
            );

        this.cfnLintService =
            overrides.cfnLintService ??
            new CfnLintService(core.documentManager, lsp.workspace, core.diagnosticCoordinator);
        this.guardService =
            overrides.guardService ??
            new GuardService(core.documentManager, core.diagnosticCoordinator, core.syntaxTreeManager);

        this.onlineStatus = overrides.onlineStatus ?? new OnlineStatus();
        this.featureFlags = overrides.featureFlags ?? new FeatureFlagProvider(getFromGitHub);
        this.onlineFeatureGuard = overrides.onlineFeatureGuard ?? new OnlineFeatureGuard(core.awsCredentials);
    }

    configurables(): Configurable[] {
        return [this.schemaRetriever, this.cfnLintService, this.guardService];
    }

    async close() {
        return await closeSafely(
            this.cfnLintService,
            this.guardService,
            this.schemaRetriever,
            this.onlineStatus,
            this.featureFlags,
        );
    }
}
