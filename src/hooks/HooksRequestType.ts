import { RequestType } from 'vscode-languageserver';

// --- List Hooks ---

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

// --- Describe Hook ---

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

// --- List Hook Results ---

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

// --- Get Hook Result ---

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

// --- Configure Hook ---

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

// --- Deactivate Hook ---

export type DeactivateHookParams = {
    typeName?: string;
    arn?: string;
};

export type DeactivateHookResult = Record<string, never>;

export const DeactivateHookRequest = new RequestType<DeactivateHookParams, DeactivateHookResult, void>(
    'aws/cfn/hooks/deactivate',
);
