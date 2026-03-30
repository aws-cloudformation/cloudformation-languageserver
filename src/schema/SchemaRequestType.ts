import { RequestType } from 'vscode-languageserver-protocol';
import { AwsRegion } from '../utils/Region';

export interface GetSchemaReadinessRequest {
    region: AwsRegion;
}

export interface GetSchemaReadinessResponse {
    region: AwsRegion;
    schemasReady: boolean;
}

export const GetSchemaReadinessRequestType = new RequestType<
    GetSchemaReadinessRequest,
    GetSchemaReadinessResponse,
    void
>('aws/cfn/schema/readiness');
