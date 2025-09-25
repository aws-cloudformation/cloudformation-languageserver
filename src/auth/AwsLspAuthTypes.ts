/* eslint-disable @typescript-eslint/no-empty-object-type */

// Must be kept consistent with https://github.com/aws/language-server-runtimes
export type IamCredentials = {
    profile?: string;
    accessKeyId: string;
    secretAccessKey: string;
    sessionToken?: string;
    region?: string;
};

export type BearerCredentials = {
    token: string;
};

export type ConnectionMetadata = {
    sso?: {
        startUrl?: string;
        region?: string;
        accountId?: string;
        roleName?: string;
    };
};

export type UpdateCredentialsParams = {
    data: IamCredentials | BearerCredentials;
    metadata?: ConnectionMetadata;
    encrypted?: boolean;
};

export type ProfileKind =
    | 'Unknown'
    | 'SsoTokenProfile'
    | 'IamCredentialsProfile'
    | 'IamSourceProfileProfile'
    | 'IamCredentialSourceProfile'
    | 'IamCredentialProcessProfile';

export type Profile = {
    kinds: ProfileKind[];
    name: string;
    settings?: {
        region?: string;
        sso_session?: string;
        sso_start_url?: string;
        sso_region?: string;
        aws_access_key_id?: string;
        aws_secret_access_key?: string;
        aws_session_token?: string;
        role_arn?: string;
        role_session_name?: string;
        credential_process?: string;
        credential_source?: string;
        source_profile?: string;
        mfa_serial?: string;
        external_id?: string;
    };
};

export type SsoSession = {
    name: string;
    settings?: {
        sso_start_url?: string;
        sso_region?: string;
        sso_registration_scopes?: string[];
    };
};

export type ListProfilesParams = {
    // Intentionally empty
};

export type ListProfilesResult = {
    profiles: Profile[];
    ssoSessions: SsoSession[];
};

export type UpdateProfileParams = {
    profile: Profile;
    ssoSession?: SsoSession;
    options?: {
        createNonexistentProfile?: boolean;
        createNonexistentSsoSession?: boolean;
        updateSharedSsoSession?: boolean;
    };
};

export type UpdateProfileResult = {
    // Intentionally empty
};

export type GetSsoTokenParams = {
    source: {
        kind: 'IamIdentityCenter' | 'AwsBuilderId';
        profileName?: string;
        ssoRegistrationScopes?: string[];
    };
    clientName: string;
    options?: {
        loginOnInvalidToken?: boolean;
        authorizationFlow?: 'DeviceCode' | 'Pkce';
    };
};

export type SsoToken = {
    id: string;
    accessToken: string;
};

export type GetSsoTokenResult = {
    ssoToken: SsoToken;
    updateCredentialsParams: UpdateCredentialsParams;
};

export type InvalidateSsoTokenParams = {
    ssoTokenId: string;
};

export type InvalidateSsoTokenResult = {
    // Intentionally empty
};

export type SsoTokenChangedParams = {
    kind: 'Refreshed' | 'Expired';
    ssoTokenId: string;
};

export type CredentialsType = 'iam' | 'bearer';
export type Credentials = IamCredentials | BearerCredentials;
export type SsoConnectionType = 'builderId' | 'identityCenter' | 'none';
