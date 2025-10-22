import { DeepReadonly } from 'ts-essentials';
import { LspAuthHandlers } from '../protocol/LspAuthHandlers';
import { DefaultSettings } from '../settings/Settings';
import { SettingsManager } from '../settings/SettingsManager';
import { LoggerFactory } from '../telemetry/LoggerFactory';
import { extractErrorMessage } from '../utils/Errors';
import { getRegion } from '../utils/Region';
import { parseWithPrettyError } from '../utils/ZodErrorWrapper';
import {
    parseListProfilesResult,
    parseUpdateCredentialsParams,
    parseSsoTokenChangedParams,
    parseInvalidateSsoTokenParams,
    parseGetSsoTokenParams,
    parseUpdateProfileParams,
    parseGetSsoTokenResult,
} from './AwsCredentialsParser';
import {
    SsoConnectionType,
    BearerCredentials,
    ConnectionMetadata,
    UpdateCredentialsParams,
    ListProfilesResult,
    UpdateProfileParams,
    UpdateProfileResult,
    GetSsoTokenParams,
    GetSsoTokenResult,
    InvalidateSsoTokenParams,
    InvalidateSsoTokenResult,
    SsoTokenChangedParams,
    IamCredentials,
} from './AwsLspAuthTypes';

export class AwsCredentials {
    private readonly logger = LoggerFactory.getLogger(AwsCredentials);

    private iamCredentials?: IamCredentials;
    private bearerCredentials?: BearerCredentials;
    private connectionMetadata?: ConnectionMetadata;

    constructor(
        private readonly awsHandlers: LspAuthHandlers,
        private readonly settingsManager: SettingsManager,
    ) {}

    getIAM(): DeepReadonly<IamCredentials> {
        if (!this.iamCredentials) {
            throw new Error('IAM credentials not configured');
        }
        return structuredClone(this.iamCredentials);
    }

    getBearer(): DeepReadonly<BearerCredentials> {
        if (!this.bearerCredentials) {
            throw new Error('Bearer credentials not configured');
        }
        return structuredClone(this.bearerCredentials);
    }

    getConnectionMetadata(): ConnectionMetadata | undefined {
        return this.connectionMetadata;
    }

    getConnectionType(): SsoConnectionType {
        const startUrl = this.connectionMetadata?.sso?.startUrl;
        if (!startUrl) return 'none';

        return startUrl.includes('view.awsapps.com/start') ? 'builderId' : 'identityCenter';
    }

    async listProfiles(): Promise<ListProfilesResult | undefined> {
        try {
            const result = await this.awsHandlers.sendListProfiles({});
            if (!result) return undefined;

            const parsedResult = parseListProfilesResult(result);

            this.logger.info(`Found ${parsedResult.profiles.length} profiles`);
            return parsedResult;
        } catch (error) {
            this.logger.error({ error }, 'Failed to list profiles');
            return undefined;
        }
    }

    async updateProfile(params: UpdateProfileParams): Promise<UpdateProfileResult | undefined> {
        try {
            const parsedParams = parseUpdateProfileParams(params);
            const result = await this.awsHandlers.sendUpdateProfile(parsedParams);

            this.logger.info(`Profile updated: ${parsedParams.profile.name}`);
            return result ?? undefined;
        } catch (error) {
            this.logger.error({ error }, 'Failed to update profile');
            return undefined;
        }
    }

    async getSsoToken(params: GetSsoTokenParams): Promise<GetSsoTokenResult | undefined> {
        try {
            const parsedParams = parseGetSsoTokenParams(params);
            const result = await this.awsHandlers.sendGetSsoToken(parsedParams);

            if (!result?.ssoToken) return result ?? undefined;

            const parsedResult = parseGetSsoTokenResult(result);
            this.logger.info('Retrieved SSO token');

            const { data, metadata } = parsedResult.updateCredentialsParams;
            if (data && 'token' in data) {
                this.bearerCredentials = data;
                if (metadata) {
                    this.connectionMetadata = metadata;
                }
            }

            return parsedResult;
        } catch (error) {
            this.logger.error({ error }, 'Failed to get SSO token');
            return undefined;
        }
    }

    async invalidateSsoToken(params: InvalidateSsoTokenParams): Promise<InvalidateSsoTokenResult | undefined> {
        try {
            const parsedParams = parseInvalidateSsoTokenParams(params);
            const result = await this.awsHandlers.sendInvalidateSsoToken(parsedParams);

            this.bearerCredentials = undefined;
            this.connectionMetadata = undefined;

            this.logger.info('SSO token invalidated');
            return result ?? undefined;
        } catch (error) {
            this.logger.error({ error }, 'Failed to invalidate SSO token');
            return undefined;
        }
    }

    handleIamCredentialsUpdate(params: UpdateCredentialsParams): boolean {
        try {
            const { data } = parseWithPrettyError(parseUpdateCredentialsParams, params);
            if ('accessKeyId' in data) {
                const region = getRegion(data.region);

                this.iamCredentials = {
                    ...data,
                    region,
                };

                this.settingsManager.updateProfileSettings(data.profile, region);
                return true;
            }

            throw new Error('Not an IAM credential');
        } catch (error) {
            this.iamCredentials = undefined;

            this.logger.error(`Failed to update IAM credentials: ${extractErrorMessage(error)}`);
            this.settingsManager.updateProfileSettings(DefaultSettings.profile.profile, DefaultSettings.profile.region);
            return false;
        }
    }

    handleBearerCredentialsUpdate(params: UpdateCredentialsParams) {
        try {
            const { data, metadata } = parseWithPrettyError(parseUpdateCredentialsParams, params);

            if ('token' in data) {
                this.bearerCredentials = data;
                if (metadata) {
                    this.connectionMetadata = metadata;
                }
                this.logger.info('Updated bearer credentials');
            }
        } catch (error) {
            this.logger.error(`Failed to update Bearer token: ${extractErrorMessage(error)}`);
            this.bearerCredentials = undefined;
            this.connectionMetadata = undefined;
        }
    }

    handleIamCredentialsDelete() {
        this.logger.info('IAM credentials deleted');
        this.iamCredentials = undefined;
    }

    handleBearerCredentialsDelete() {
        this.logger.info('Bearer credentials deleted');
        this.bearerCredentials = undefined;
        this.connectionMetadata = undefined;
    }

    handleSsoTokenChanged(params: SsoTokenChangedParams) {
        try {
            const { kind } = parseSsoTokenChangedParams(params);
            if (kind === 'Expired') {
                this.bearerCredentials = undefined;
                this.connectionMetadata = undefined;
            } else if (kind === 'Refreshed') {
                this.logger.info('SSO token refreshed');
            }
        } catch (error) {
            this.logger.error({ error }, 'Error handling SSO token change');
        }
    }
}
