import { StackSummary, StackStatus } from '@aws-sdk/client-cloudformation';
import { RequestType } from 'vscode-languageserver-protocol';

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
