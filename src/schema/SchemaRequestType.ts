import { RequestType } from 'vscode-languageserver-protocol';
import { AwsRegion } from '../utils/Region';

export interface SchemaReadinessRequest {
    region: AwsRegion;
}

export interface SchemaReadinessResponse {
    region: AwsRegion;
    schemasReady: boolean;
}

export const SchemaReadinessRequestType = new RequestType<SchemaReadinessRequest, SchemaReadinessResponse, void>(
    'aws/cfn/schema/readiness',
);
