import { StubbedInstance } from 'ts-sinon';
import { describe, test, expect, beforeEach } from 'vitest';
import { CancellationToken } from 'vscode-languageserver';
import { AwsCredentials } from '../../../src/auth/AwsCredentials';
import { UpdateCredentialsParams } from '../../../src/auth/AwsLspAuthTypes';
import { iamCredentialsDeleteHandler, iamCredentialsUpdateHandler } from '../../../src/handlers/AuthHandler';
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

    test('iamCredentialsUpdateHandler calls handleIamCredentialsUpdate', async () => {
        const params: UpdateCredentialsParams = {
            data: JSON.stringify({
                profile: 'test-profile',
                accessKeyId: 'test',
                secretAccessKey: 'test',
                region: 'Region',
            }),
        };
        awsCredentials.handleIamCredentialsUpdate.resolves(true);
        const result = await iamCredentialsUpdateHandler(mockComponents)(params, mockCancellationToken);

        expect(awsCredentials.handleIamCredentialsUpdate.callCount).toBe(1);
        expect(awsCredentials.handleIamCredentialsUpdate.firstCall.args[0]).toStrictEqual(params);
        expect(result).toEqual({ success: true });
    });

    test('iamCredentialsDeleteHandler calls handleIamCredentialsDelete', () => {
        iamCredentialsDeleteHandler(mockComponents)();
        expect(awsCredentials.handleIamCredentialsDelete.callCount).toBe(1);
    });
});
