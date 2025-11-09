import { OnStackFailure } from '@aws-sdk/client-cloudformation';
import { RequestType } from 'vscode-languageserver';
import { DocumentType } from '../document/Document';
import { DeploymentMode } from '../stacks/actions/StackActionRequestType';

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
    deploymentMode?: DeploymentMode;
};

export type ParsedCfnEnvironmentFile = {
    deploymentConfig: DeploymentConfig;
    fileName: string;
};

export type ParseCfnEnvironmentFilesParams = {
    documents: DocumentInfo[];
};

export type ParseCfnEnvironmentFilesResult = {
    parsedFiles: ParsedCfnEnvironmentFile[];
};

export const ParseEnvironmentFilesRequest = new RequestType<
    ParseCfnEnvironmentFilesParams,
    ParseCfnEnvironmentFilesResult,
    void
>('aws/cfn/environment/files/parse');
