import { AwsCredentialIdentity } from '@aws-sdk/types';

export type IamCredentials = AwsCredentialIdentity & {
    profile: string;
    region: string;
};

export type UpdateCredentialsParams = {
    data: string;
    encrypted?: boolean;
};

export type UpdateCredentialsResult = {
    success: boolean;
};
