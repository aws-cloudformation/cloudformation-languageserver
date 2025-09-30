import { CodeAction, CodeActionParams } from 'vscode-languageserver';
import { RequestType } from 'vscode-languageserver-protocol';

// eslint-disable-next-line @typescript-eslint/no-empty-object-type
export type GetResourceTypesParams = {};

export type GetResourceTypesResult = {
    resourceTypes: string[];
};

export const GetResourceTypesRequest = new RequestType<GetResourceTypesParams, GetResourceTypesResult, void>(
    'aws/cfn/resourceTypes',
);

export type ResourceSelection = {
    resourceType: string;
    resourceIdentifiers: string[];
};

export interface ResourceStateImportParams extends CodeActionParams {
    resourceSelections?: ResourceSelection[];
}

export interface ResourceStateImportResult extends CodeAction {
    successfulImports: Record<ResourceType, ResourceIdentifier[]>;
    failedImports: Record<ResourceType, ResourceIdentifier[]>;
}

export const ResourceStateImportRequest = new RequestType<ResourceStateImportParams, ResourceStateImportResult, void>(
    'aws/cfn/resourceStateImport',
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
    'aws/cfn/resources',
);

export type RefreshResourceListParams = {
    resourceTypes: string[];
};

export type RefreshResourceListResult = {
    resources: ResourceSummary[];
    refreshFailed: boolean;
};

export const RefreshResourceListRequest = new RequestType<RefreshResourceListParams, RefreshResourceListResult, void>(
    'aws/cfn/refreshResourceList',
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
