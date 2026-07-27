import { Connection, RequestHandler } from 'vscode-languageserver';
import {
    ListHooksParams,
    ListHooksResult,
    ListHooksRequest,
    ListHooksDetailedResult,
    ListHooksDetailedRequest,
    ListPublicHooksParams,
    ListPublicHooksResult,
    ListPublicHooksRequest,
    DescribeHookParams,
    DescribeHookResult,
    DescribeHookRequest,
    ListHookResultsParams,
    ListHookResultsResult,
    ListHookResultsRequest,
    GetHookResultParams,
    GetHookResultResult,
    GetHookResultRequest,
    ConfigureHookParams,
    ConfigureHookResult,
    ConfigureHookRequest,
    SetInvocationStatusParams,
    SetInvocationStatusResult,
    SetInvocationStatusRequest,
    CreateGuardHookParams,
    CreateGuardHookResult,
    CreateGuardHookRequest,
    ListIamRolesParams,
    ListIamRolesResult,
    ListIamRolesRequest,
    ListS3BucketsParams,
    ListS3BucketsResult,
    ListS3BucketsRequest,
    ListS3ObjectsParams,
    ListS3ObjectsResult,
    ListS3ObjectsRequest,
    ListProactiveControlsParams,
    ListProactiveControlsResult,
    ListProactiveControlsRequest,
    CreateS3BucketParams,
    CreateS3BucketResult,
    CreateS3BucketRequest,
    CreateHookExecutionRoleParams,
    CreateHookExecutionRoleResult,
    CreateHookExecutionRoleRequest,
    DeactivateHookParams,
    DeactivateHookResult,
    DeactivateHookRequest,
    ActivateHookParams,
    ActivateHookResult,
    ActivateHookRequest,
    SetHookConfigurationParams,
    SetHookConfigurationResult,
    SetHookConfigurationRequest,
    GetHookConfigurationParams,
    GetHookConfigurationResult,
    GetHookConfigurationRequest,
    GetRuleContentParams,
    GetRuleContentResult,
    GetRuleContentRequest,
    ValidateRuleParams,
    ValidateRuleResult,
    ValidateRuleRequest,
    UploadRuleParams,
    UploadRuleResult,
    UploadRuleRequest,
    PreviewGuardHooksParams,
    PreviewGuardHooksResult,
    PreviewGuardHooksRequest,
} from '../hooks/HooksRequestType';

export class LspHooksHandlers {
    constructor(private readonly connection: Connection) {}

    onListHooks(handler: RequestHandler<ListHooksParams, ListHooksResult, void>) {
        this.connection.onRequest(ListHooksRequest.method, handler);
    }

    onListHooksDetailed(handler: RequestHandler<ListHooksParams, ListHooksDetailedResult, void>) {
        this.connection.onRequest(ListHooksDetailedRequest.method, handler);
    }

    onListPublicHooks(handler: RequestHandler<ListPublicHooksParams, ListPublicHooksResult, void>) {
        this.connection.onRequest(ListPublicHooksRequest.method, handler);
    }

    onDescribeHook(handler: RequestHandler<DescribeHookParams, DescribeHookResult, void>) {
        this.connection.onRequest(DescribeHookRequest.method, handler);
    }

    onListHookResults(handler: RequestHandler<ListHookResultsParams, ListHookResultsResult, void>) {
        this.connection.onRequest(ListHookResultsRequest.method, handler);
    }

    onGetHookResult(handler: RequestHandler<GetHookResultParams, GetHookResultResult, void>) {
        this.connection.onRequest(GetHookResultRequest.method, handler);
    }

    onConfigureHook(handler: RequestHandler<ConfigureHookParams, ConfigureHookResult, void>) {
        this.connection.onRequest(ConfigureHookRequest.method, handler);
    }

    onSetInvocationStatus(handler: RequestHandler<SetInvocationStatusParams, SetInvocationStatusResult, void>) {
        this.connection.onRequest(SetInvocationStatusRequest.method, handler);
    }

    onCreateGuardHook(handler: RequestHandler<CreateGuardHookParams, CreateGuardHookResult, void>) {
        this.connection.onRequest(CreateGuardHookRequest.method, handler);
    }

    onListIamRoles(handler: RequestHandler<ListIamRolesParams, ListIamRolesResult, void>) {
        this.connection.onRequest(ListIamRolesRequest.method, handler);
    }

    onListS3Buckets(handler: RequestHandler<ListS3BucketsParams, ListS3BucketsResult, void>) {
        this.connection.onRequest(ListS3BucketsRequest.method, handler);
    }

    onListS3Objects(handler: RequestHandler<ListS3ObjectsParams, ListS3ObjectsResult, void>) {
        this.connection.onRequest(ListS3ObjectsRequest.method, handler);
    }

    onListProactiveControls(handler: RequestHandler<ListProactiveControlsParams, ListProactiveControlsResult, void>) {
        this.connection.onRequest(ListProactiveControlsRequest.method, handler);
    }

    onCreateS3Bucket(handler: RequestHandler<CreateS3BucketParams, CreateS3BucketResult, void>) {
        this.connection.onRequest(CreateS3BucketRequest.method, handler);
    }

    onCreateHookExecutionRole(
        handler: RequestHandler<CreateHookExecutionRoleParams, CreateHookExecutionRoleResult, void>,
    ) {
        this.connection.onRequest(CreateHookExecutionRoleRequest.method, handler);
    }

    onDeactivateHook(handler: RequestHandler<DeactivateHookParams, DeactivateHookResult, void>) {
        this.connection.onRequest(DeactivateHookRequest.method, handler);
    }

    onActivateHook(handler: RequestHandler<ActivateHookParams, ActivateHookResult, void>) {
        this.connection.onRequest(ActivateHookRequest.method, handler);
    }

    onSetHookConfiguration(handler: RequestHandler<SetHookConfigurationParams, SetHookConfigurationResult, void>) {
        this.connection.onRequest(SetHookConfigurationRequest.method, handler);
    }

    onGetHookConfiguration(handler: RequestHandler<GetHookConfigurationParams, GetHookConfigurationResult, void>) {
        this.connection.onRequest(GetHookConfigurationRequest.method, handler);
    }

    onGetRuleContent(handler: RequestHandler<GetRuleContentParams, GetRuleContentResult, void>) {
        this.connection.onRequest(GetRuleContentRequest.method, handler);
    }

    onValidateRule(handler: RequestHandler<ValidateRuleParams, ValidateRuleResult, void>) {
        this.connection.onRequest(ValidateRuleRequest.method, handler);
    }

    onUploadRule(handler: RequestHandler<UploadRuleParams, UploadRuleResult, void>) {
        this.connection.onRequest(UploadRuleRequest.method, handler);
    }

    onPreviewGuardHooks(handler: RequestHandler<PreviewGuardHooksParams, PreviewGuardHooksResult, void>) {
        this.connection.onRequest(PreviewGuardHooksRequest.method, handler);
    }
}
