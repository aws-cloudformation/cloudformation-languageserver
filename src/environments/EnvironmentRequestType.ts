import { OnStackFailure } from '@aws-sdk/client-cloudformation';
import { RequestType } from 'vscode-languageserver';
import { DocumentType } from '../document/Document';

export type DocumentInfo = {
    type: DocumentType;
    content: string;
    fileName: string;
};

export type DeploymentConfig = {
    templateFilePath?: string;
    parameters?: Record<string, string>;
    tags?: Record<string, string>;
    includeNestedStacks?: boolean;
    importExistingResources?: boolean;
    onStackFailure?: OnStackFailure;
};

export type ParsedEnvironmentFile = {
    deploymentConfig: DeploymentConfig;
    fileName: string;
};

export type ParseEnvironmentFilesParams = {
    documents: DocumentInfo[];
};

export type ParseEnvironmentFilesResult = {
    parsedFiles: ParsedEnvironmentFile[];
};

export const ParseEnvironmentFilesRequest = new RequestType<
    ParseEnvironmentFilesParams,
    ParseEnvironmentFilesResult,
    void
>('aws/cfn/environment/files/parse');
