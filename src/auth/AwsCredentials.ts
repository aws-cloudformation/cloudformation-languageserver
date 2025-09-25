import { AwsCredentialIdentity } from '@aws-sdk/types';
import { DeepReadonly } from 'ts-essentials';
import { MessageType } from 'vscode-languageserver-protocol/lib/common/protocol';
import { LspAuthHandlers } from '../protocol/LspAuthHandlers';
import { ServerComponents } from '../server/ServerComponents';
import { DefaultSettings } from '../settings/Settings';
import { SettingsManager } from '../settings/SettingsManager';
import { parseProfile } from '../settings/SettingsParser';
import { ClientMessage } from '../telemetry/ClientMessage';
import { LoggerFactory } from '../telemetry/LoggerFactory';
import { extractErrorMessage } from '../utils/Errors';
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
} from './AwsLspAuthTypes';
import { sdkIAMCredentials } from './AwsSdkCredentialsProvider';

export class AwsCredentials {
    private readonly logger = LoggerFactory.getLogger(AwsCredentials);
    private profileName = DefaultSettings.profile.profile;

    private bearerCredentials?: BearerCredentials;
    private connectionMetadata?: ConnectionMetadata;

    constructor(
        private readonly awsHandlers: LspAuthHandlers,
        private readonly settingsManager: SettingsManager,
        private readonly clientMessage: ClientMessage,
        private readonly getIAMFromSdk: (profile: string) => Promise<DeepReadonly<AwsCredentialIdentity>>,
    ) {}

    getIAM(): Promise<DeepReadonly<AwsCredentialIdentity>> {
        return this.getIAMFromSdk(this.profileName);
    }

    getBearer(): DeepReadonly<BearerCredentials | undefined> {
        return this.bearerCredentials;
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

    handleIamCredentialsUpdate(params: UpdateCredentialsParams) {
        let newProfileName = DefaultSettings.profile.profile;
        let newRegion = DefaultSettings.profile.region;
        try {
            const { data } = parseWithPrettyError(parseUpdateCredentialsParams, params);
            if ('accessKeyId' in data) {
                const profile = parseWithPrettyError(
                    parseProfile,
                    {
                        profile: data.profile,
                        region: data.region,
                    },
                    DefaultSettings.profile,
                );

                newProfileName = profile.profile;
                newRegion = profile.region;
            }
        } catch (error) {
            void this.clientMessage.showMessageNotification(
                MessageType.Error,
                `Failed to update IAM profile: ${extractErrorMessage(error)}`,
            );
        } finally {
            this.profileName = newProfileName;
            this.settingsManager.updateProfileSettings(newProfileName, newRegion);
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
            void this.clientMessage.showMessageNotification(
                MessageType.Error,
                `Failed to update Bearer token: ${extractErrorMessage(error)}`,
            );
            this.bearerCredentials = undefined;
            this.connectionMetadata = undefined;
        }
    }

    handleIamCredentialsDelete() {
        this.logger.info('IAM credentials deleted');
        this.profileName = DefaultSettings.profile.profile;
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

    static create(components: ServerComponents) {
        return new AwsCredentials(
            components.authHandlers,
            components.settingsManager,
            components.clientMessage,
            sdkIAMCredentials,
        );
    }
}
