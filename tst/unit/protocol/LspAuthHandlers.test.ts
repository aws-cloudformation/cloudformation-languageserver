import { StubbedInstance, stubInterface } from 'ts-sinon';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { Connection } from 'vscode-languageserver/node';
import {
    IamCredentialsUpdateRequest,
    BearerCredentialsUpdateRequest,
    IamCredentialsDeleteNotification,
    BearerCredentialsDeleteNotification,
    GetConnectionMetadataRequest,
    ListProfilesRequest,
    UpdateProfileRequest,
    GetSsoTokenRequest,
    InvalidateSsoTokenRequest,
    SsoTokenChangedNotification,
} from '../../../src/auth/AuthProtocol';
import {
    ListProfilesParams,
    ListProfilesResult,
    UpdateProfileParams,
    UpdateProfileResult,
    GetSsoTokenParams,
    GetSsoTokenResult,
    InvalidateSsoTokenParams,
    InvalidateSsoTokenResult,
    SsoTokenChangedParams,
    ConnectionMetadata,
} from '../../../src/auth/AwsLspAuthTypes';
import { LspAuthHandlers } from '../../../src/protocol/LspAuthHandlers';

describe('LspAuthHandlers', () => {
    let lspAwsHandlers: LspAuthHandlers;
    let mockConnection: StubbedInstance<Connection>;

    beforeEach(() => {
        vi.clearAllMocks();
        mockConnection = stubInterface<Connection>();
        lspAwsHandlers = new LspAuthHandlers(mockConnection);
    });

    describe('constructor', () => {
        it('should initialize with connection', () => {
            expect(lspAwsHandlers).toBeDefined();
        });
    });

    describe('credential handlers - receive from client', () => {
        it('should register IAM credentials update handler', () => {
            const mockHandler = vi.fn();

            lspAwsHandlers.onIamCredentialsUpdate(mockHandler);

            expect(mockConnection.onRequest.calledOnce).toBe(true);
            expect(mockConnection.onRequest.firstCall.args[0]).toBe(IamCredentialsUpdateRequest.type);
        });

        it('should register bearer credentials update handler', () => {
            const mockHandler = vi.fn();

            lspAwsHandlers.onBearerCredentialsUpdate(mockHandler);

            expect(mockConnection.onRequest.calledOnce).toBe(true);
            expect(mockConnection.onRequest.firstCall.args[0]).toBe(BearerCredentialsUpdateRequest.type);
        });

        it('should register IAM credentials delete handler', () => {
            const mockHandler = vi.fn();

            lspAwsHandlers.onIamCredentialsDelete(mockHandler);

            expect(mockConnection.onNotification.calledOnce).toBe(true);
            expect(mockConnection.onNotification.firstCall.args[0]).toBe(IamCredentialsDeleteNotification.type);
        });

        it('should register bearer credentials delete handler', () => {
            const mockHandler = vi.fn();

            lspAwsHandlers.onBearerCredentialsDelete(mockHandler);

            expect(mockConnection.onNotification.calledOnce).toBe(true);
            expect(mockConnection.onNotification.firstCall.args[0]).toBe(BearerCredentialsDeleteNotification.type);
        });
    });

    describe('requests - send to client', () => {
        it('should send get connection metadata request', async () => {
            const mockMetadata: ConnectionMetadata = {
                sso: {
                    startUrl: 'https://test.awsapps.com/start',
                    region: 'us-east-1',
                },
            };

            mockConnection.sendRequest.resolves(mockMetadata);

            const result = await lspAwsHandlers.sendGetConnectionMetadata();

            expect(mockConnection.sendRequest.calledOnce).toBe(true);
            expect(mockConnection.sendRequest.firstCall.args[0]).toBe(GetConnectionMetadataRequest.type);
            expect(result).toEqual(mockMetadata);
        });

        it('should send list profiles request', async () => {
            const params: ListProfilesParams = {};
            const mockResult: ListProfilesResult = {
                profiles: [
                    {
                        kinds: ['IamCredentialsProfile'],
                        name: 'default',
                    },
                ],
                ssoSessions: [],
            };

            mockConnection.sendRequest.resolves(mockResult);

            const result = await lspAwsHandlers.sendListProfiles(params);

            expect(mockConnection.sendRequest.calledOnce).toBe(true);
            expect(mockConnection.sendRequest.firstCall.args[0]).toBe(ListProfilesRequest.type);
            expect(mockConnection.sendRequest.firstCall.args[1]).toBe(params);
            expect(result).toEqual(mockResult);
        });

        it('should send update profile request', async () => {
            const params: UpdateProfileParams = {
                profile: {
                    kinds: ['IamCredentialsProfile'],
                    name: 'test-profile',
                },
            };
            const mockResult: UpdateProfileResult = {};

            mockConnection.sendRequest.resolves(mockResult);

            const result = await lspAwsHandlers.sendUpdateProfile(params);

            expect(mockConnection.sendRequest.calledOnce).toBe(true);
            expect(mockConnection.sendRequest.firstCall.args[0]).toBe(UpdateProfileRequest.type);
            expect(mockConnection.sendRequest.firstCall.args[1]).toBe(params);
            expect(result).toEqual(mockResult);
        });

        it('should send get SSO token request', async () => {
            const params: GetSsoTokenParams = {
                source: {
                    kind: 'IamIdentityCenter',
                    profileName: 'test-profile',
                },
                clientName: 'test-client',
            };
            const mockResult: GetSsoTokenResult = {
                ssoToken: {
                    id: 'token-id',
                    accessToken: 'access-token',
                },
                updateCredentialsParams: {
                    data: {
                        token: 'bearer-token',
                    },
                },
            };

            mockConnection.sendRequest.resolves(mockResult);

            const result = await lspAwsHandlers.sendGetSsoToken(params);

            expect(mockConnection.sendRequest.calledOnce).toBe(true);
            expect(mockConnection.sendRequest.firstCall.args[0]).toBe(GetSsoTokenRequest.type);
            expect(mockConnection.sendRequest.firstCall.args[1]).toBe(params);
            expect(result).toEqual(mockResult);
        });

        it('should send invalidate SSO token request', async () => {
            const params: InvalidateSsoTokenParams = {
                ssoTokenId: 'token-id',
            };
            const mockResult: InvalidateSsoTokenResult = {};

            mockConnection.sendRequest.resolves(mockResult);

            const result = await lspAwsHandlers.sendInvalidateSsoToken(params);

            expect(mockConnection.sendRequest.calledOnce).toBe(true);
            expect(mockConnection.sendRequest.firstCall.args[0]).toBe(InvalidateSsoTokenRequest.type);
            expect(mockConnection.sendRequest.firstCall.args[1]).toBe(params);
            expect(result).toEqual(mockResult);
        });
    });

    describe('bidirectional handlers', () => {
        it('should register SSO token changed handler', () => {
            const mockHandler = vi.fn();

            lspAwsHandlers.onSsoTokenChanged(mockHandler);

            expect(mockConnection.onNotification.calledOnce).toBe(true);
            expect(mockConnection.onNotification.firstCall.args[0]).toBe(SsoTokenChangedNotification.type);
        });

        it('should send SSO token changed notification', async () => {
            const params: SsoTokenChangedParams = {
                kind: 'Expired',
                ssoTokenId: 'token-id',
            };

            await lspAwsHandlers.sendSsoTokenChanged(params);

            expect(mockConnection.sendNotification.calledOnce).toBe(true);
            expect(mockConnection.sendNotification.firstCall.args[0]).toBe(SsoTokenChangedNotification.type);
        });
    });

    describe('error handling', () => {
        it('should handle request failures gracefully', async () => {
            mockConnection.sendRequest.rejects(new Error('Connection failed'));

            // The method should propagate the error, not handle it gracefully
            await expect(lspAwsHandlers.sendListProfiles({})).rejects.toThrow('Connection failed');
        });

        it('should handle null responses', async () => {
            mockConnection.sendRequest.resolves(null);

            const result = await lspAwsHandlers.sendListProfiles({});

            expect(result).toBeNull();
        });
    });
});
