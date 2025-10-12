import { CfnAI } from '../ai/CfnAI';
import { CompletionRouter } from '../autocomplete/CompletionRouter';
import { InlineCompletionRouter } from '../autocomplete/InlineCompletionRouter';
import { ManagedResourceCodeLens } from '../codeLens/ManagedResourceCodeLens';
import { DefinitionProvider } from '../definition/DefinitionProvider';
import { DocumentSymbolRouter } from '../documentSymbol/DocumentSymbolRouter';
import { HoverRouter } from '../hover/HoverRouter';
import { ResourceStateImporter } from '../resourceState/ResourceStateImporter';
import { ResourceStateManager } from '../resourceState/ResourceStateManager';
import { StackManagementInfoProvider } from '../resourceState/StackManagementInfoProvider';
import { CodeActionService } from '../services/CodeActionService';
import { DeploymentWorkflow } from '../stacks/actions/DeploymentWorkflow';
import { ValidationWorkflow } from '../stacks/actions/ValidationWorkflow';
import { Closeable, closeSafely } from '../utils/Closeable';
import { Configurable, Configurables } from '../utils/Configurable';
import { CfnExternal } from './CfnExternal';
import { CfnInfraCore } from './CfnInfraCore';

export class CfnLspProviders implements Configurables, Closeable {
    // Business logic
    readonly stackManagementInfoProvider: StackManagementInfoProvider;
    readonly validationWorkflowService: ValidationWorkflow;
    readonly deploymentWorkflowService: DeploymentWorkflow;
    readonly resourceStateManager: ResourceStateManager;
    readonly resourceStateImporter: ResourceStateImporter;

    // LSP feature providers
    readonly hoverRouter: HoverRouter;
    readonly completionRouter: CompletionRouter;
    readonly inlineCompletionRouter: InlineCompletionRouter;
    readonly definitionProvider: DefinitionProvider;
    readonly codeActionService: CodeActionService;
    readonly documentSymbolRouter: DocumentSymbolRouter;
    readonly managedResourceCodeLens: ManagedResourceCodeLens;

    // AI
    readonly cfnAI: CfnAI;

    constructor(core: CfnInfraCore, external: CfnExternal, overrides: Partial<CfnLspProviders> = {}) {
        this.stackManagementInfoProvider =
            overrides.stackManagementInfoProvider ?? new StackManagementInfoProvider(external.cfnService);
        this.validationWorkflowService =
            overrides.validationWorkflowService ?? ValidationWorkflow.create(core, external);
        this.deploymentWorkflowService =
            overrides.deploymentWorkflowService ?? DeploymentWorkflow.create(core, external);
        this.resourceStateManager = overrides.resourceStateManager ?? ResourceStateManager.create(external);
        this.resourceStateImporter =
            overrides.resourceStateImporter ?? ResourceStateImporter.create(core, external, this);

        this.hoverRouter = overrides.hoverRouter ?? HoverRouter.create(core, external);
        this.completionRouter = overrides.completionRouter ?? CompletionRouter.create(core, external, this);

        this.inlineCompletionRouter = overrides.inlineCompletionRouter ?? InlineCompletionRouter.create(core);
        this.definitionProvider = overrides.definitionProvider ?? DefinitionProvider.create(core);
        this.codeActionService = overrides.codeActionService ?? CodeActionService.create(core);
        this.documentSymbolRouter = overrides.documentSymbolRouter ?? DocumentSymbolRouter.create(core);
        this.managedResourceCodeLens = overrides.managedResourceCodeLens ?? ManagedResourceCodeLens.create(core);

        this.cfnAI = overrides.cfnAI ?? CfnAI.create(core, external);
    }

    configurables(): Configurable[] {
        return [
            this.resourceStateManager,
            this.hoverRouter,
            this.completionRouter,
            this.inlineCompletionRouter,
            this.cfnAI,
        ];
    }

    async close() {
        return await closeSafely(
            this.cfnAI,
            this.resourceStateManager,
            this.hoverRouter,
            this.completionRouter,
            this.inlineCompletionRouter,
        );
    }
}
