import { Connection, RequestHandler } from 'vscode-languageserver';
import {
    CreateValidationRequest,
    CreateDeploymentRequest,
    GetValidationStatusRequest,
    GetCapabilitiesRequest,
    GetParametersRequest,
    GetTemplateArtifactsRequest,
    DescribeValidationStatusRequest,
    DescribeDeploymentStatusRequest,
    GetTemplateResourcesRequest,
    GetDeploymentStatusRequest,
    DeleteChangeSetRequest,
    GetChangeSetDeletionStatusRequest,
    DescribeChangeSetDeletionStatusRequest,
} from '../stacks/actions/StackActionProtocol';
import {
    TemplateUri,
    CreateValidationParams,
    GetStackActionStatusResult,
    GetParametersResult,
    GetTemplateArtifactsResult,
    GetCapabilitiesResult,
    DescribeValidationStatusResult,
    DescribeDeploymentStatusResult,
    GetTemplateResourcesResult,
    CreateStackActionResult,
    CreateDeploymentParams,
    DeleteChangeSetParams,
    DescribeDeletionStatusResult,
} from '../stacks/actions/StackActionRequestType';
import {
    ListStacksParams,
    ListStacksResult,
    ListStacksRequest,
    ListStackResourcesParams,
    ListStackResourcesResult,
    ListStackResourcesRequest,
    GetStackTemplateParams,
    GetStackTemplateResult,
    GetStackTemplateRequest,
    ListChangeSetParams,
    ListChangeSetResult,
    ListChangeSetRequest,
    GetStackEventsParams,
    GetStackEventsResult,
    GetStackEventsRequest,
    ClearStackEventsParams,
    ClearStackEventsRequest,
    DescribeStackParams,
    DescribeStackResult,
    DescribeStackRequest,
    DescribeChangeSetParams,
    DescribeChangeSetResult,
    DescribeChangeSetRequest,
    DescribeEventsParams,
    DescribeEventsResult,
    DescribeEventsRequest,
} from '../stacks/StackRequestType';
import { Identifiable } from './LspTypes';

export class LspStackHandlers {
    constructor(private readonly connection: Connection) {}

    onCreateValidation(handler: RequestHandler<CreateValidationParams, CreateStackActionResult, void>) {
        this.connection.onRequest(CreateValidationRequest.method, handler);
    }

    onCreateDeployment(handler: RequestHandler<CreateDeploymentParams, CreateStackActionResult, void>) {
        this.connection.onRequest(CreateDeploymentRequest.method, handler);
    }

    onGetValidationStatus(handler: RequestHandler<Identifiable, GetStackActionStatusResult, void>) {
        this.connection.onRequest(GetValidationStatusRequest.method, handler);
    }

    onGetDeploymentStatus(handler: RequestHandler<Identifiable, GetStackActionStatusResult, void>) {
        this.connection.onRequest(GetDeploymentStatusRequest.method, handler);
    }

    onDescribeValidationStatus(handler: RequestHandler<Identifiable, DescribeValidationStatusResult, void>) {
        this.connection.onRequest(DescribeValidationStatusRequest.method, handler);
    }

    onDescribeDeploymentStatus(handler: RequestHandler<Identifiable, DescribeDeploymentStatusResult, void>) {
        this.connection.onRequest(DescribeDeploymentStatusRequest.method, handler);
    }

    onGetParameters(handler: RequestHandler<TemplateUri, GetParametersResult, void>) {
        this.connection.onRequest(GetParametersRequest.method, handler);
    }

    onGetTemplateArtifacts(handler: RequestHandler<TemplateUri, GetTemplateArtifactsResult, void>) {
        this.connection.onRequest(GetTemplateArtifactsRequest.method, handler);
    }

    onGetCapabilities(handler: RequestHandler<TemplateUri, GetCapabilitiesResult, void>) {
        this.connection.onRequest(GetCapabilitiesRequest.method, handler);
    }

    onGetTemplateResources(handler: RequestHandler<TemplateUri, GetTemplateResourcesResult, void>) {
        this.connection.onRequest(GetTemplateResourcesRequest.method, handler);
    }

    onListStacks(handler: RequestHandler<ListStacksParams, ListStacksResult, void>) {
        this.connection.onRequest(ListStacksRequest.method, handler);
    }

    onListStackResources(handler: RequestHandler<ListStackResourcesParams, ListStackResourcesResult, void>) {
        this.connection.onRequest(ListStackResourcesRequest.method, handler);
    }

    onGetStackTemplate(handler: RequestHandler<GetStackTemplateParams, GetStackTemplateResult | undefined, void>) {
        this.connection.onRequest(GetStackTemplateRequest.method, handler);
    }

    onListChangeSets(handler: RequestHandler<ListChangeSetParams, ListChangeSetResult, void>) {
        this.connection.onRequest(ListChangeSetRequest.method, handler);
    }

    onDescribeChangeSet(handler: RequestHandler<DescribeChangeSetParams, DescribeChangeSetResult, void>) {
        this.connection.onRequest(DescribeChangeSetRequest.method, handler);
    }

    onDeleteChangeSet(handler: RequestHandler<DeleteChangeSetParams, CreateStackActionResult, void>) {
        this.connection.onRequest(DeleteChangeSetRequest.method, handler);
    }

    onGetChangeSetDeletionStatus(handler: RequestHandler<Identifiable, GetStackActionStatusResult, void>) {
        this.connection.onRequest(GetChangeSetDeletionStatusRequest.method, handler);
    }

    onDescribeChangeSetDeletionStatus(handler: RequestHandler<Identifiable, DescribeDeletionStatusResult, void>) {
        this.connection.onRequest(DescribeChangeSetDeletionStatusRequest.method, handler);
    }

    onGetStackEvents(handler: RequestHandler<GetStackEventsParams, GetStackEventsResult, void>) {
        this.connection.onRequest(GetStackEventsRequest.method, handler);
    }

    onClearStackEvents(handler: RequestHandler<ClearStackEventsParams, void, void>) {
        this.connection.onRequest(ClearStackEventsRequest.method, handler);
    }

    onDescribeStack(handler: RequestHandler<DescribeStackParams, DescribeStackResult, void>) {
        this.connection.onRequest(DescribeStackRequest.method, handler);
    }

    onDescribeEvents(handler: RequestHandler<DescribeEventsParams, DescribeEventsResult, void>) {
        this.connection.onRequest(DescribeEventsRequest.method, handler);
    }
}
