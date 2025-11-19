import { CfnAI } from '../ai/CfnAI';
import { CompletionRouter } from '../autocomplete/CompletionRouter';
import { CodeLensProvider } from '../codeLens/CodeLensProvider';
import { DefinitionProvider } from '../definition/DefinitionProvider';
import { DocumentSymbolRouter } from '../documentSymbol/DocumentSymbolRouter';
import { HoverRouter } from '../hover/HoverRouter';
import { RelatedResourcesSnippetProvider } from '../relatedResources/RelatedResourcesSnippetProvider';
import { ResourceStateImporter } from '../resourceState/ResourceStateImporter';
import { ResourceStateManager } from '../resourceState/ResourceStateManager';
import { StackManagementInfoProvider } from '../resourceState/StackManagementInfoProvider';
import { CodeActionService } from '../services/CodeActionService';
import { RelationshipSchemaService } from '../services/RelationshipSchemaService';
import { S3Service } from '../services/S3Service';
import { ChangeSetDeletionWorkflow } from '../stacks/actions/ChangeSetDeletionWorkflow';
import { DeploymentWorkflow } from '../stacks/actions/DeploymentWorkflow';
import {
    CreateDeploymentParams,
    CreateValidationParams,
    DeleteChangeSetParams,
    DescribeDeletionStatusResult,
    DescribeDeploymentStatusResult,
    DescribeValidationStatusResult,
} from '../stacks/actions/StackActionRequestType';
import { StackActionWorkflow } from '../stacks/actions/StackActionWorkflowType';
import { ValidationWorkflow } from '../stacks/actions/ValidationWorkflow';
import { StackEventManager } from '../stacks/StackEventManager';
import { StackManager } from '../stacks/StackManager';
import { Closeable, closeSafely } from '../utils/Closeable';
import { Configurable, Configurables } from '../utils/Configurable';
import { CfnExternal } from './CfnExternal';
import { CfnInfraCore } from './CfnInfraCore';

export class CfnLspProviders implements Configurables, Closeable {
    // Business logic
    readonly stackManagementInfoProvider: StackManagementInfoProvider;
    readonly validationWorkflowService: StackActionWorkflow<CreateValidationParams, DescribeValidationStatusResult>;
    readonly deploymentWorkflowService: StackActionWorkflow<CreateDeploymentParams, DescribeDeploymentStatusResult>;
    readonly changeSetDeletionWorkflowService: StackActionWorkflow<DeleteChangeSetParams, DescribeDeletionStatusResult>;
    readonly stackManager: StackManager;
    readonly stackEventManager: StackEventManager;
    readonly resourceStateManager: ResourceStateManager;
    readonly resourceStateImporter: ResourceStateImporter;
    readonly relationshipSchemaService: RelationshipSchemaService;
    readonly relatedResourcesSnippetProvider: RelatedResourcesSnippetProvider;
    readonly s3Service: S3Service;

    // LSP feature providers
    readonly hoverRouter: HoverRouter;
    readonly completionRouter: CompletionRouter;
    readonly definitionProvider: DefinitionProvider;
    readonly codeActionService: CodeActionService;
    readonly documentSymbolRouter: DocumentSymbolRouter;
    readonly codeLensProvider: CodeLensProvider;

    // AI
    readonly cfnAI: CfnAI;

    constructor(core: CfnInfraCore, external: CfnExternal, overrides: Partial<CfnLspProviders> = {}) {
        this.stackManagementInfoProvider =
            overrides.stackManagementInfoProvider ?? new StackManagementInfoProvider(external.cfnService);
        this.stackManager = overrides.stackManager ?? new StackManager(external.cfnService);
        this.stackEventManager = overrides.stackEventManager ?? new StackEventManager(external.cfnService);
        this.validationWorkflowService =
            overrides.validationWorkflowService ?? ValidationWorkflow.create(core, external, core.validationManager);
        this.deploymentWorkflowService =
            overrides.deploymentWorkflowService ?? DeploymentWorkflow.create(core, external);
        this.changeSetDeletionWorkflowService =
            overrides.deploymentWorkflowService ?? ChangeSetDeletionWorkflow.create(core, external);
        this.resourceStateManager = overrides.resourceStateManager ?? ResourceStateManager.create(external);
        this.resourceStateImporter =
            overrides.resourceStateImporter ?? ResourceStateImporter.create(core, external, this);
        this.relationshipSchemaService = overrides.relationshipSchemaService ?? new RelationshipSchemaService();
        this.relatedResourcesSnippetProvider =
            overrides.relatedResourcesSnippetProvider ??
            new RelatedResourcesSnippetProvider(core.documentManager, core.syntaxTreeManager, external.schemaRetriever);
        this.s3Service = overrides.s3Service ?? new S3Service(external.awsClient);

        this.hoverRouter =
            overrides.hoverRouter ??
            new HoverRouter(core.contextManager, external.schemaRetriever, external.featureFlags.get('Constants'));
        this.completionRouter = overrides.completionRouter ?? CompletionRouter.create(core, external, this);

        this.definitionProvider = overrides.definitionProvider ?? new DefinitionProvider(core.contextManager);
        this.codeActionService = overrides.codeActionService ?? CodeActionService.create(core);
        this.documentSymbolRouter = overrides.documentSymbolRouter ?? new DocumentSymbolRouter(core.syntaxTreeManager);
        this.codeLensProvider =
            overrides.codeLensProvider ?? new CodeLensProvider(core.syntaxTreeManager, core.documentManager);

        this.cfnAI =
            overrides.cfnAI ?? new CfnAI(core.documentManager, external.awsClient, this.relationshipSchemaService);
    }

    configurables(): Configurable[] {
        return [this.resourceStateManager, this.hoverRouter, this.completionRouter, this.cfnAI];
    }

    async close() {
        return await closeSafely(this.cfnAI, this.resourceStateManager, this.hoverRouter, this.completionRouter);
    }
}
