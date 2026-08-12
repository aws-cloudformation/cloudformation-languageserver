import { RequestType } from 'vscode-languageserver';

export type ListHooksParams = {
    loadMore?: boolean;
};

export type HookSummary = {
    typeName: string;
    typeArn: string;
    defaultVersionId?: string;
    description?: string;
    lastUpdated?: string;
};

export type ListHooksResult = {
    hooks: HookSummary[];
    nextToken?: string;
};

export const ListHooksRequest = new RequestType<ListHooksParams, ListHooksResult, void>('aws/cfn/hooks/list');

export type DetailedHook = HookSummary & {
    configured: boolean;
    configuration?: string;
    failureMode?: string;
    invocationStatus?: string;
    targetOperations?: string[];
    ruleUri?: string;
};

export type ListHooksDetailedResult = {
    hooks: DetailedHook[];
    nextToken?: string;
};

export const ListHooksDetailedRequest = new RequestType<ListHooksParams, ListHooksDetailedResult, void>(
    'aws/cfn/hooks/listDetailed',
);

export type ListPublicHooksParams = {
    typeNamePrefix?: string;
};

export type PublicHookSummary = {
    typeName: string;
    publisherId: string;
    description?: string;
};

export type ListPublicHooksResult = {
    hooks: PublicHookSummary[];
};

export const ListPublicHooksRequest = new RequestType<ListPublicHooksParams, ListPublicHooksResult, void>(
    'aws/cfn/hooks/listPublic',
);

export type DescribeHookParams = {
    typeName?: string;
    arn?: string;
};

export type HookTargetInfo = {
    targetName: string;
    invocationPoint: string;
    failureMode: string;
};

export type DescribeHookResult = {
    typeName: string;
    arn: string;
    description?: string;
    schema?: string;
    configurationSchema?: string;
    visibility: string;
    defaultVersionId?: string;
    lastUpdated?: string;
    targets?: HookTargetInfo[];
};

export const DescribeHookRequest = new RequestType<DescribeHookParams, DescribeHookResult, void>(
    'aws/cfn/hooks/describe',
);

export type ListHookResultsParams = {
    typeArn?: string;
    status?: string;
    targetId?: string;
    targetType?: string;
    nextToken?: string;
};

export type HookResultSummary = {
    hookResultId: string;
    hookTypeArn: string;
    hookTypeName: string;
    invocationPoint: string;
    hookStatus: string;
    failureMode: string;
    targetId?: string;
    targetType?: string;
    timestamp?: string;
};

export type ListHookResultsResult = {
    hookResults: HookResultSummary[];
    nextToken?: string;
};

export const ListHookResultsRequest = new RequestType<ListHookResultsParams, ListHookResultsResult, void>(
    'aws/cfn/hooks/results/list',
);

export type GetHookResultParams = {
    hookResultId: string;
};

export type HookAnnotation = {
    severity: string;
    statusMessage: string;
    remediationLink?: string;
};

export type HookTarget = {
    targetType: string;
    targetName: string;
    targetId?: string;
    action?: string;
};

export type GetHookResultResult = {
    hookResultId: string;
    hookTypeName: string;
    hookStatus: string;
    failureMode: string;
    invocationPoint: string;
    annotations?: HookAnnotation[];
    target?: HookTarget;
    timestamp?: string;
};

export const GetHookResultRequest = new RequestType<GetHookResultParams, GetHookResultResult, void>(
    'aws/cfn/hooks/result/get',
);

export type ConfigureHookParams = {
    typeName: string;
    failureMode: string;
};

export type ConfigureHookResult = {
    configurationArn?: string;
};

export const ConfigureHookRequest = new RequestType<ConfigureHookParams, ConfigureHookResult, void>(
    'aws/cfn/hooks/configure',
);

export type SetInvocationStatusParams = {
    typeName: string;
    invocationStatus: 'ENABLED' | 'DISABLED';
};

export type SetInvocationStatusResult = {
    configurationArn?: string;
    invocationStatus: 'ENABLED' | 'DISABLED';
};

export const SetInvocationStatusRequest = new RequestType<SetInvocationStatusParams, SetInvocationStatusResult, void>(
    'aws/cfn/hooks/setInvocationStatus',
);

export type CreateGuardHookParams = {
    desiredState: string;
};

export type CreateGuardHookResult = {
    operationStatus?: string;
    identifier?: string;
    errorCode?: string;
    statusMessage?: string;
};

export const CreateGuardHookRequest = new RequestType<CreateGuardHookParams, CreateGuardHookResult, void>(
    'aws/cfn/hooks/createGuardHook',
);

export type ListIamRolesParams = Record<string, never>;

export type IamRoleSummary = {
    roleName: string;
    arn: string;
};

export type ListIamRolesResult = {
    roles: IamRoleSummary[];
};

export const ListIamRolesRequest = new RequestType<ListIamRolesParams, ListIamRolesResult, void>(
    'aws/cfn/hooks/listIamRoles',
);

export type ListS3BucketsParams = Record<string, never>;

export type ListS3BucketsResult = {
    buckets: string[];
};

export const ListS3BucketsRequest = new RequestType<ListS3BucketsParams, ListS3BucketsResult, void>(
    'aws/cfn/hooks/listS3Buckets',
);

export type ListS3ObjectsParams = {
    bucketName: string;
    prefix?: string;
};

export type ListS3ObjectsResult = {
    keys: string[];
};

export const ListS3ObjectsRequest = new RequestType<ListS3ObjectsParams, ListS3ObjectsResult, void>(
    'aws/cfn/hooks/listS3Objects',
);

export type ListProactiveControlsParams = Record<string, never>;

export type ProactiveControlSummary = {
    controlId: string;
    name: string;
    resource?: string;
};

export type ListProactiveControlsResult = {
    controls: ProactiveControlSummary[];
};

export const ListProactiveControlsRequest = new RequestType<
    ListProactiveControlsParams,
    ListProactiveControlsResult,
    void
>('aws/cfn/hooks/listProactiveControls');

export type CreateS3BucketParams = {
    bucketName: string;
};

export type CreateS3BucketResult = {
    bucketName: string;
};

export const CreateS3BucketRequest = new RequestType<CreateS3BucketParams, CreateS3BucketResult, void>(
    'aws/cfn/hooks/createS3Bucket',
);

export type CreateHookExecutionRoleParams = {
    roleName: string;
    ruleBucket?: string;
};

export type CreateHookExecutionRoleResult = {
    roleName: string;
    arn: string;
};

export const CreateHookExecutionRoleRequest = new RequestType<
    CreateHookExecutionRoleParams,
    CreateHookExecutionRoleResult,
    void
>('aws/cfn/hooks/createExecutionRole');

export type DeactivateHookParams = {
    typeName?: string;
    arn?: string;
};

export type DeactivateHookResult = Record<string, never>;

export const DeactivateHookRequest = new RequestType<DeactivateHookParams, DeactivateHookResult, void>(
    'aws/cfn/hooks/deactivate',
);

export type ActivateHookParams = {
    typeName: string;
    publisherId?: string;
    typeNameAlias?: string;
    executionRoleArn?: string;
};

export type ActivateHookResult = {
    arn?: string;
};

export const ActivateHookRequest = new RequestType<ActivateHookParams, ActivateHookResult, void>(
    'aws/cfn/hooks/activate',
);

export type SetHookConfigurationParams = {
    typeName: string;
    configuration: string;
};

export type SetHookConfigurationResult = {
    configurationArn?: string;
};

export const SetHookConfigurationRequest = new RequestType<
    SetHookConfigurationParams,
    SetHookConfigurationResult,
    void
>('aws/cfn/hooks/setConfiguration');

export type GetHookConfigurationParams = {
    typeName: string;
};

export type GetHookConfigurationResult = {
    configuration: string;
};

export const GetHookConfigurationRequest = new RequestType<
    GetHookConfigurationParams,
    GetHookConfigurationResult,
    void
>('aws/cfn/hooks/getConfiguration');

export type GetRuleContentParams = {
    s3Uri: string;
};

export type GetRuleContentResult = {
    content: string;
};

export const GetRuleContentRequest = new RequestType<GetRuleContentParams, GetRuleContentResult, void>(
    'aws/cfn/hooks/getRuleContent',
);

export type ValidateRuleParams = {
    ruleContent: string;
    sampleTemplate?: string;
};

export type RuleViolation = {
    ruleName: string;
    message: string;
    line: number;
    column: number;
};

export type ValidateRuleResult = {
    valid: boolean;
    parseErrors: string[];
    violations: RuleViolation[];
};

export const ValidateRuleRequest = new RequestType<ValidateRuleParams, ValidateRuleResult, void>(
    'aws/cfn/hooks/validateRule',
);

export type UploadRuleParams = {
    ruleContent: string;
    s3Uri: string;
};

export type UploadRuleResult = {
    s3Uri: string;
};

export const UploadRuleRequest = new RequestType<UploadRuleParams, UploadRuleResult, void>('aws/cfn/hooks/uploadRule');

export type PreviewGuardHooksParams = {
    templateContent: string;
};

export type GuardHookPreviewViolation = {
    ruleName: string;
    message: string;
    line: number;
    column: number;
    path?: string;
};

export type GuardHookPreviewEntry = {
    typeName: string;
    ruleUri: string;
    failureMode?: string;
    valid: boolean;
    violations: GuardHookPreviewViolation[];
    error?: string;
};

export type PreviewGuardHooksResult = {
    hooks: GuardHookPreviewEntry[];
};

export const PreviewGuardHooksRequest = new RequestType<PreviewGuardHooksParams, PreviewGuardHooksResult, void>(
    'aws/cfn/hooks/previewGuard',
);
