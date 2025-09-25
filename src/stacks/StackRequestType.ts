import { StackSummary, StackStatus } from '@aws-sdk/client-cloudformation';
import { RequestType } from 'vscode-languageserver-protocol';

export type ListStacksParams = {
    statusToInclude?: StackStatus[];
    statusToExclude?: StackStatus[];
};

export type ListStacksResult = {
    stacks: StackSummary[];
};

export const ListStacksRequest = new RequestType<ListStacksParams, ListStacksResult, void>('aws/cfn/stacks');
