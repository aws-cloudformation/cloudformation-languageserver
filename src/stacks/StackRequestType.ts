import {
    StackSummary,
    StackStatus,
    StackResourceSummary,
    StackEvent,
    Stack,
    OperationEvent,
} from '@aws-sdk/client-cloudformation';
import { RequestType } from 'vscode-languageserver-protocol';
import { ChangeSetReference, DeploymentMode, StackChange } from './actions/StackActionRequestType';

export type ListStacksParams = {
    statusToInclude?: StackStatus[];
    statusToExclude?: StackStatus[];
    loadMore?: boolean;
};

export type ListStacksResult = {
    stacks: StackSummary[];
    nextToken?: string;
};

export const ListStacksRequest = new RequestType<ListStacksParams, ListStacksResult, void>('aws/cfn/stacks');

export type GetStackTemplateParams = {
    stackName: string;
    primaryIdentifier?: string;
};

export type GetStackTemplateResult = {
    templateBody: string;
    lineNumber?: number;
};

export const GetStackTemplateRequest = new RequestType<GetStackTemplateParams, GetStackTemplateResult, void>(
    'aws/cfn/stack/template',
);

export type ListChangeSetParams = {
    stackName: string;
    nextToken?: string;
};

export type DescribeChangeSetParams = ChangeSetReference;

export type ChangeSetSummary = {
    changeSetName: string;
    status: string;
    creationTime?: string;
    description?: string;
};

export type ListChangeSetResult = {
    changeSets: Array<ChangeSetSummary>;
    nextToken?: string;
};

export type DescribeChangeSetResult = ChangeSetSummary & {
    stackName: string;
    changes?: StackChange[];
    deploymentMode?: DeploymentMode;
};

export const ListChangeSetRequest = new RequestType<ListChangeSetParams, ListChangeSetResult, void>(
    'aws/cfn/stack/changeSet/list',
);

export type ListStackResourcesParams = {
    stackName: string;
    nextToken?: string;
};

export type ListStackResourcesResult = {
    resources: StackResourceSummary[];
    nextToken?: string;
};

export const ListStackResourcesRequest = new RequestType<ListStackResourcesParams, ListStackResourcesResult, void>(
    'aws/cfn/stack/resources',
);

export type GetStackEventsParams = {
    stackName: string;
    nextToken?: string;
    refresh?: boolean;
};

export type GetStackEventsResult = {
    events: StackEvent[];
    nextToken?: string;
    gapDetected?: boolean;
};

export const GetStackEventsRequest = new RequestType<GetStackEventsParams, GetStackEventsResult, void>(
    'aws/cfn/stack/events',
);

export type ClearStackEventsParams = {
    stackName: string;
};

export const ClearStackEventsRequest = new RequestType<ClearStackEventsParams, void, void>(
    'aws/cfn/stack/events/clear',
);

export type DescribeStackParams = {
    stackName: string;
};

export type DescribeStackResult = {
    stack?: Stack;
};

export const DescribeStackRequest = new RequestType<DescribeStackParams, DescribeStackResult, void>(
    'aws/cfn/stack/describe',
);

export const DescribeChangeSetRequest = new RequestType<DescribeChangeSetParams, DescribeChangeSetResult, void>(
    'aws/cfn/stack/changeSet/describe',
);

export type DescribeEventsParams = {
    stackName?: string;
    changeSetName?: string;
    operationId?: string;
    failedEventsOnly?: boolean;
    nextToken?: string;
    refresh?: boolean;
};

export type StackOperationGroup = {
    operationId: string;
    events: OperationEvent[];
};

export type DescribeEventsResult = {
    operations: StackOperationGroup[];
    nextToken?: string;
    gapDetected?: boolean;
};

export const DescribeEventsRequest = new RequestType<DescribeEventsParams, DescribeEventsResult, void>(
    'aws/cfn/stack/events/describe',
);
