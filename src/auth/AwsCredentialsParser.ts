import { z } from 'zod';
import {
    UpdateCredentialsParams,
    ListProfilesResult,
    UpdateProfileParams,
    GetSsoTokenParams,
    GetSsoTokenResult,
    InvalidateSsoTokenParams,
    SsoTokenChangedParams,
} from './AwsLspAuthTypes';

const ProfileKindSchema = z.enum([
    'Unknown',
    'SsoTokenProfile',
    'IamCredentialsProfile',
    'IamSourceProfileProfile',
    'IamCredentialSourceProfile',
    'IamCredentialProcessProfile',
]);

const IamCredentialsSchema = z.object({
    profile: z.string().optional(),
    accessKeyId: z.string({ message: 'Access key ID is required' }),
    secretAccessKey: z.string({ message: 'Secret access key is required' }),
    sessionToken: z.string().optional(),
    region: z.string().optional(),
});

const BearerCredentialsSchema = z.object({
    token: z.string({ message: 'Bearer token is required' }).min(1, 'Token cannot be empty'),
});

const ConnectionMetadataSchema = z.object({
    sso: z
        .object({
            startUrl: z.string().optional(),
            region: z.string().optional(),
            accountId: z.string().optional(),
            roleName: z.string().optional(),
        })
        .optional(),
});

const UpdateCredentialsParamsSchema = z.object({
    data: z.union([IamCredentialsSchema, BearerCredentialsSchema]),
    metadata: ConnectionMetadataSchema.optional(),
    encrypted: z.boolean().optional(),
});

const ProfileSchema = z.object({
    kinds: z.array(ProfileKindSchema),
    name: z.string(),
    settings: z
        .object({
            region: z.string().optional(),
            sso_session: z.string().optional(),
            sso_start_url: z.string().optional(),
            sso_region: z.string().optional(),
            aws_access_key_id: z.string().optional(),
            aws_secret_access_key: z.string().optional(),
            aws_session_token: z.string().optional(),
            role_arn: z.string().optional(),
            role_session_name: z.string().optional(),
            credential_process: z.string().optional(),
            credential_source: z.string().optional(),
            source_profile: z.string().optional(),
            mfa_serial: z.string().optional(),
            external_id: z.string().optional(),
        })
        .optional(),
});

const SsoSessionSchema = z.object({
    name: z.string(),
    settings: z
        .object({
            sso_start_url: z.string().optional(),
            sso_region: z.string().optional(),
            sso_registration_scopes: z.array(z.string()).optional(),
        })
        .optional(),
});

const ListProfilesResultSchema = z.object({
    profiles: z.array(ProfileSchema),
    ssoSessions: z.array(SsoSessionSchema),
});

const UpdateProfileParamsSchema = z.object({
    profile: ProfileSchema,
    ssoSession: SsoSessionSchema.optional(),
    options: z
        .object({
            createNonexistentProfile: z.boolean().optional(),
            createNonexistentSsoSession: z.boolean().optional(),
            updateSharedSsoSession: z.boolean().optional(),
        })
        .optional(),
});

const GetSsoTokenParamsSchema = z.object({
    source: z.object({
        kind: z.enum(['IamIdentityCenter', 'AwsBuilderId']),
        profileName: z.string().optional(),
        ssoRegistrationScopes: z.array(z.string()).optional(),
    }),
    clientName: z.string(),
    options: z
        .object({
            loginOnInvalidToken: z.boolean().optional(),
            authorizationFlow: z.enum(['DeviceCode', 'Pkce']).optional(),
        })
        .optional(),
});

const SsoTokenSchema = z.object({
    id: z.string(),
    accessToken: z.string(),
});

const GetSsoTokenResultSchema = z.object({
    ssoToken: SsoTokenSchema,
    updateCredentialsParams: UpdateCredentialsParamsSchema,
});

const InvalidateSsoTokenParamsSchema = z.object({
    ssoTokenId: z.string(),
});

const SsoTokenChangedParamsSchema = z.object({
    kind: z.enum(['Refreshed', 'Expired']),
    ssoTokenId: z.string(),
});

export function parseUpdateCredentialsParams(input: unknown): UpdateCredentialsParams {
    return UpdateCredentialsParamsSchema.parse(input);
}

export function parseListProfilesResult(input: unknown): ListProfilesResult {
    return ListProfilesResultSchema.parse(input);
}

export function parseUpdateProfileParams(input: unknown): UpdateProfileParams {
    return UpdateProfileParamsSchema.parse(input);
}

export function parseGetSsoTokenParams(input: unknown): GetSsoTokenParams {
    return GetSsoTokenParamsSchema.parse(input);
}

export function parseGetSsoTokenResult(input: unknown): GetSsoTokenResult {
    return GetSsoTokenResultSchema.parse(input);
}

export function parseInvalidateSsoTokenParams(input: unknown): InvalidateSsoTokenParams {
    return InvalidateSsoTokenParamsSchema.parse(input);
}

export function parseSsoTokenChangedParams(input: unknown): SsoTokenChangedParams {
    return SsoTokenChangedParamsSchema.parse(input);
}
