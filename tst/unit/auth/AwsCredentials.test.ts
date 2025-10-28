import { beforeEach, describe, expect, test, vi } from 'vitest';
import { AwsCredentials } from '../../../src/auth/AwsCredentials';
import {
    ConnectionMetadata,
    ListProfilesResult,
    SsoTokenChangedParams,
    UpdateCredentialsParams,
    UpdateProfileParams,
} from '../../../src/auth/AwsLspAuthTypes';
import { createMockAuthHandlers, createMockSettingsManager } from '../../utils/MockServerComponents';

describe('AwsCredentials', () => {
    const token = {
        token: 'bearer-token-123',
    };

    let awsCredentials: AwsCredentials;
    let mockAwsHandlers: ReturnType<typeof createMockAuthHandlers>;
    let mockSettingsManager: any;

    beforeEach(() => {
        vi.clearAllMocks();
        mockAwsHandlers = createMockAuthHandlers();
        mockSettingsManager = createMockSettingsManager();
        awsCredentials = new AwsCredentials(mockAwsHandlers, mockSettingsManager);
    });

    describe('connection metadata', () => {
        test('should return undefined when no connection metadata exists', () => {
            expect(awsCredentials.getConnectionMetadata()).toBeUndefined();
        });

        test('should return connection metadata when bearer credentials are updated with metadata', () => {
            const metadata: ConnectionMetadata = {
                sso: {
                    startUrl: 'https://test.awsapps.com/start',
                    region: 'us-east-1',
                    accountId: '123456789012',
                    roleName: 'TestRole',
                },
            };

            const credentialsWithMetadata: UpdateCredentialsParams = {
                data: {
                    token: 'bearer-token-123',
                },
                metadata,
            };

            awsCredentials.handleBearerCredentialsUpdate(credentialsWithMetadata);

            const result = awsCredentials.getConnectionMetadata();
            expect(result).toBeDefined();
            expect(result?.sso?.startUrl).toBe('https://test.awsapps.com/start');
            expect(result?.sso?.accountId).toBe('123456789012');
        });
    });

    describe('connection type detection', () => {
        test('should return "none" when no connection metadata exists', () => {
            expect(awsCredentials.getConnectionType()).toBe('none');
        });

        test('should return "builderId" for Builder ID URLs', () => {
            const credentialsWithBuilderIdMetadata: UpdateCredentialsParams = {
                data: { token: 'token' },
                metadata: {
                    sso: {
                        startUrl: 'https://view.awsapps.com/start#/test',
                    },
                },
            };

            awsCredentials.handleBearerCredentialsUpdate(credentialsWithBuilderIdMetadata);

            expect(awsCredentials.getConnectionType()).toBe('builderId');
        });

        test('should return "identityCenter" for Identity Center URLs', () => {
            const credentialsWithIdCenterMetadata: UpdateCredentialsParams = {
                data: { token: 'token' },
                metadata: {
                    sso: {
                        startUrl: 'https://mycompany.awsapps.com/start',
                    },
                },
            };

            awsCredentials.handleBearerCredentialsUpdate(credentialsWithIdCenterMetadata);

            expect(awsCredentials.getConnectionType()).toBe('identityCenter');
        });
    });

    describe('profile management', () => {
        test('should call awsHandlers.sendListProfiles and return result', async () => {
            const mockProfiles: ListProfilesResult = {
                profiles: [
                    { name: 'default', kinds: ['IamCredentialsProfile' as const] },
                    { name: 'test', kinds: ['SsoTokenProfile' as const] },
                ],
                ssoSessions: [],
            };
            mockAwsHandlers.sendListProfiles.resolves(mockProfiles);

            const result = await awsCredentials.listProfiles();

            expect(mockAwsHandlers.sendListProfiles.calledOnce).toBe(true);
            expect(result).toEqual(mockProfiles);
            expect(result?.profiles).toHaveLength(2);
            expect(result?.profiles?.[0].name).toBe('default');
        });

        test('should handle listProfiles errors gracefully and return undefined', async () => {
            mockAwsHandlers.sendListProfiles.rejects(new Error('Network error'));

            const result = await awsCredentials.listProfiles();

            expect(result).toBeUndefined();
        });

        test('should call awsHandlers.sendUpdateProfile with correct params and return result', async () => {
            const updateParams: UpdateProfileParams = {
                profile: {
                    name: 'test-profile',
                    kinds: ['IamCredentialsProfile' as const],
                    settings: {
                        region: 'us-west-2',
                    },
                },
            };
            const mockResult = { success: true };
            mockAwsHandlers.sendUpdateProfile.resolves(mockResult);

            const result = await awsCredentials.updateProfile(updateParams);

            expect(mockAwsHandlers.sendUpdateProfile.calledWith(updateParams)).toBe(true);
            expect(result).toEqual(mockResult);
        });

        test('should handle updateProfile errors gracefully and return undefined', async () => {
            const updateParams: UpdateProfileParams = {
                profile: { name: 'test-profile', kinds: ['IamCredentialsProfile' as const] },
            };
            mockAwsHandlers.sendUpdateProfile.rejects(new Error('Update failed'));

            const result = await awsCredentials.updateProfile(updateParams);

            expect(result).toBeUndefined();
        });
    });

    describe('credential handlers', () => {
        test('should update bearer credentials and metadata when valid data is received', () => {
            const validCredentials: UpdateCredentialsParams = {
                data: token,
                metadata: {
                    sso: {
                        startUrl: 'https://test.awsapps.com/start',
                        accountId: '123456789012',
                    },
                },
            };

            awsCredentials.handleBearerCredentialsUpdate(validCredentials);

            expect(awsCredentials.getBearer()).toStrictEqual(token);

            const metadata = awsCredentials.getConnectionMetadata();
            expect(metadata?.sso?.startUrl).toBe('https://test.awsapps.com/start');
            expect(metadata?.sso?.accountId).toBe('123456789012');
        });

        test('should delete bearer credentials and metadata when delete handler is called', () => {
            // First set credentials

            awsCredentials.handleBearerCredentialsUpdate({
                data: { token: 'bearer-token-123' },
                metadata: { sso: { startUrl: 'https://test.com' } },
            });
            expect(awsCredentials.getBearer()).toBeDefined();
            // Then delete them

            awsCredentials.handleBearerCredentialsDelete();

            expect((awsCredentials as any).bearerCredentials).toBeUndefined();
            expect(awsCredentials.getConnectionMetadata()).toBeUndefined();
        });
    });

    describe('SSO token handling', () => {
        test('should clear bearer credentials when SSO token expires', () => {
            // First set bearer credentials

            awsCredentials.handleBearerCredentialsUpdate({
                data: { token: 'bearer-token-123' },
                metadata: { sso: { startUrl: 'https://test.com' } },
            });
            expect(awsCredentials.getBearer()).toBeDefined();
            // Then simulate token expiration

            const expiredTokenParams: SsoTokenChangedParams = {
                kind: 'Expired',
                ssoTokenId: 'token-id-123',
            };

            awsCredentials.handleSsoTokenChanged(expiredTokenParams);

            expect((awsCredentials as any).bearerCredentials).toBeUndefined();
            expect(awsCredentials.getConnectionMetadata()).toBeUndefined();
        });

        test('should handle SSO token refresh without clearing credentials', () => {
            // First set bearer credentials

            awsCredentials.handleBearerCredentialsUpdate({
                data: { token: 'bearer-token-123' },
            });
            expect(awsCredentials.getBearer()).toBeDefined();
            // Then simulate token refresh

            const refreshedTokenParams: SsoTokenChangedParams = {
                kind: 'Refreshed',
                ssoTokenId: 'token-id-123',
            };

            awsCredentials.handleSsoTokenChanged(refreshedTokenParams);

            // Credentials should still exist (they'll be updated via credential update handler)
            expect(awsCredentials.getBearer()).toBeDefined();
        });
    });

    describe('error handling', () => {
        test('should handle errors in bearer credential update handler gracefully', () => {
            // This should not throw even with malformed data
            expect(() => {
                awsCredentials.handleBearerCredentialsUpdate({ data: 'invalid-data' as any });
            }).not.toThrow();

            expect((awsCredentials as any).bearerCredentials).toBeUndefined();
        });
    });
});
