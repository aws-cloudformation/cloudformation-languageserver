import { CodeAction, CodeActionParams } from 'vscode-languageserver';
import { RequestType } from 'vscode-languageserver-protocol';

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

export interface ResourceStateParams extends CodeActionParams {
    resourceSelections?: ResourceSelection[];
}

export interface ResourceStateResult extends CodeAction {
    successfulImports: Record<ResourceType, ResourceIdentifier[]>;
    failedImports: Record<ResourceType, ResourceIdentifier[]>;
}

export const ResourceStateRequest = new RequestType<ResourceStateParams, ResourceStateResult, void>(
    'aws/cfn/resources/state',
);

export type ResourceType = string;

export type ResourceIdentifier = string;

export type ListResourcesParams = {
    resourceTypes?: string[];
};

export type ResourceSummary = {
    typeName: string;
    resourceIdentifiers: string[];
};

export type ListResourcesResult = {
    resources: ResourceSummary[];
};

export const ListResourcesRequest = new RequestType<ListResourcesParams, ListResourcesResult, void>(
    'aws/cfn/resources/list',
);

export type RefreshResourcesParams = {
    resourceTypes: string[];
};

export type RefreshResourcesResult = {
    resources: ResourceSummary[];
    refreshFailed: boolean;
};

export const RefreshResourceListRequest = new RequestType<RefreshResourcesParams, RefreshResourcesResult, void>(
    'aws/cfn/resources/refresh',
);

export interface ResourceTemplateFormat {
    [key: string]: {
        Type: string;
        Properties: Record<string, string>;
        Metadata: {
            PrimaryIdentifier: string;
            ManagedByStack?: string;
            StackName?: string;
            StackId?: string;
        };
    };
}
