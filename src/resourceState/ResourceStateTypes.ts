import { CodeAction, CodeActionParams } from 'vscode-languageserver';
import { RequestType } from 'vscode-languageserver-protocol';
import { ResourceStackManagementResult } from './StackManagementInfoProvider';

// eslint-disable-next-line @typescript-eslint/no-empty-object-type
export type ResourceTypesParams = {};

export type ResourceTypesResult = {
    resourceTypes: string[];
};

export const ResourceTypesRequest = new RequestType<ResourceTypesParams, ResourceTypesResult, void>(
    'aws/cfn/resources/types',
);

export type ResourceSelection = {
    resourceType: string;
    resourceIdentifiers: string[];
};

/*
 * Import purpose is to move an existing resource to be managed by a stack
 * Clone purpose is to create a new resource using the configuration of an existing resource as a reference
 */
export enum ResourceStatePurpose {
    IMPORT = 'Import',
    CLONE = 'Clone',
}

export interface ResourceStateParams extends CodeActionParams {
    resourceSelections?: ResourceSelection[];
    purpose: ResourceStatePurpose;
}

export interface ResourceStateResult extends CodeAction {
    successfulImports: Record<ResourceType, ResourceIdentifier[]>;
    failedImports: Record<ResourceType, ResourceIdentifier[]>;
    warning?: string;
}

export const ResourceStateRequest = new RequestType<ResourceStateParams, ResourceStateResult, void>(
    'aws/cfn/resources/state',
);

export type ResourceType = string;

export type ResourceIdentifier = string;

export type ResourceRequest = {
    resourceType: string;
    nextToken?: string;
};

export type ListResourcesParams = {
    resources?: ResourceRequest[];
};

export type ResourceSummary = {
    typeName: string;
    resourceIdentifiers: string[];
    nextToken?: string;
};

export type ListResourcesResult = {
    resources: ResourceSummary[];
};

export const ListResourcesRequest = new RequestType<ListResourcesParams, ListResourcesResult, void>(
    'aws/cfn/resources/list',
);

export type RefreshResourcesParams = {
    resources: ResourceRequest[];
};

export type RefreshResourcesResult = {
    resources: ResourceSummary[];
    refreshFailed: boolean;
};

export type SearchResourceParams = {
    resourceType: string;
    identifier: string;
};

export type SearchResourceResult = {
    found: boolean;
    resource?: ResourceSummary;
};

export const SearchResourceRequest = new RequestType<SearchResourceParams, SearchResourceResult, void>(
    'aws/cfn/resources/search',
);

export const RefreshResourceListRequest = new RequestType<RefreshResourcesParams, RefreshResourcesResult, void>(
    'aws/cfn/resources/refresh',
);

export const DeletionPolicyOnImport = 'Retain';

export interface ResourceTemplateFormat {
    [key: string]: {
        Type: string;
        DeletionPolicy: string | undefined;
        Properties: Record<string, string>;
        Metadata: {
            PrimaryIdentifier: string;
            ManagedByStack?: string;
            StackName?: string;
            StackId?: string;
        };
    };
}

export const StackMgmtInfoRequest = new RequestType<ResourceIdentifier, ResourceStackManagementResult, void>(
    'aws/cfn/resources/stackMgmtInfo',
);
