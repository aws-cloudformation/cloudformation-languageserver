import { StubbedInstance } from 'ts-sinon';
import { describe, test, expect, beforeEach } from 'vitest';
import { CancellationToken } from 'vscode-languageserver';
import { AwsCredentials } from '../../../src/auth/AwsCredentials';
import { UpdateCredentialsParams, SsoTokenChangedParams } from '../../../src/auth/AwsLspAuthTypes';
import {
    bearerCredentialsDeleteHandler,
    bearerCredentialsUpdateHandler,
    iamCredentialsDeleteHandler,
    iamCredentialsUpdateHandler,
    ssoTokenChangedHandler,
} from '../../../src/handlers/AuthHandler';
import {
    createMockAwsCredentials,
    createMockComponents,
    MockedServerComponents,
} from '../../utils/MockServerComponents';

describe('AuthHandler', () => {
    let mockComponents: MockedServerComponents;
    let awsCredentials: StubbedInstance<AwsCredentials>;
    const mockCancellationToken = {} as CancellationToken;

    beforeEach(() => {
        awsCredentials = createMockAwsCredentials();
        mockComponents = createMockComponents({ awsCredentials });
    });

    test('iamCredentialsUpdateHandler calls handleIamCredentialsUpdate', () => {
        const params: UpdateCredentialsParams = {
            data: {
                accessKeyId: 'test',
                secretAccessKey: 'test',
                region: 'Region',
            },
        };
        iamCredentialsUpdateHandler(mockComponents)(params, mockCancellationToken);

        expect(awsCredentials.handleIamCredentialsUpdate.callCount).toBe(1);
        expect(awsCredentials.handleIamCredentialsUpdate.firstCall.args[0]).toStrictEqual(params);
    });

    test('bearerCredentialsUpdateHandler calls handleBearerCredentialsUpdate', () => {
        const params: UpdateCredentialsParams = { data: { token: 'test' } };
        bearerCredentialsUpdateHandler(mockComponents)(params, mockCancellationToken);

        expect(awsCredentials.handleBearerCredentialsUpdate.callCount).toBe(1);
        expect(awsCredentials.handleBearerCredentialsUpdate.firstCall.args[0]).toStrictEqual(params);
    });

    test('iamCredentialsDeleteHandler calls handleIamCredentialsDelete', () => {
        iamCredentialsDeleteHandler(mockComponents)();
        expect(awsCredentials.handleIamCredentialsDelete.callCount).toBe(1);
    });

    test('bearerCredentialsDeleteHandler calls handleBearerCredentialsDelete', () => {
        bearerCredentialsDeleteHandler(mockComponents)();
        expect(awsCredentials.handleBearerCredentialsDelete.callCount).toBe(1);
    });

    test('ssoTokenChangedHandler calls handleSsoTokenChanged', () => {
        const params: SsoTokenChangedParams = { kind: 'Expired', ssoTokenId: '' };
        ssoTokenChangedHandler(mockComponents)(params);

        expect(awsCredentials.handleSsoTokenChanged.callCount).toBe(1);
        expect(awsCredentials.handleSsoTokenChanged.firstCall.args[0]).toStrictEqual(params);
    });
});
