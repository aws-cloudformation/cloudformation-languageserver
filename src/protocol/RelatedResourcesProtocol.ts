import { RequestType, CodeAction, Position } from 'vscode-languageserver-protocol';

export type TemplateUri = string;

export type ResourceTypeRequest = {
    resourceType: string;
};

export type InsertRelatedResourcesRequest = {
    templateUri: string;
    resourceTypes: string[];
    selectedResourceType: string;
};

export interface RelatedResourcesCodeAction extends CodeAction {
    data?: {
        scrollToPosition?: Position;
        firstLogicalId?: string;
    };
}

export const GetAuthoredResourceTypesRequest = new RequestType<TemplateUri, string[], void>(
    'aws/cfn/template/resources/authored',
);

export const GetRelatedResourceTypesRequest = new RequestType<ResourceTypeRequest, string[], void>(
    'aws/cfn/template/resources/related',
);

export const InsertRelatedResourcesRequest = new RequestType<
    InsertRelatedResourcesRequest,
    RelatedResourcesCodeAction,
    void
>('aws/cfn/template/resources/insert');
