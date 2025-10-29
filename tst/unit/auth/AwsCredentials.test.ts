import { randomBytes } from 'crypto';
import { CompactEncrypt } from 'jose';
import { beforeEach, describe, expect, test, vi } from 'vitest';
import { AwsCredentials } from '../../../src/auth/AwsCredentials';
import { UpdateCredentialsParams } from '../../../src/auth/AwsLspAuthTypes';
import { createMockAuthHandlers, createMockSettingsManager } from '../../utils/MockServerComponents';

describe('AwsCredentials', () => {
    const encryptionKey = randomBytes(32);
    const testCredentials = {
        profile: 'SomeProfile',
        accessKeyId: 'AKIATEST',
        secretAccessKey: 'AKIASECRET',
        region: 'us-west-2',
    };

    let awsCredentials: AwsCredentials;
    let mockAwsHandlers: ReturnType<typeof createMockAuthHandlers>;
    let mockSettingsManager: any;

    beforeEach(() => {
        vi.clearAllMocks();
        mockAwsHandlers = createMockAuthHandlers();
        mockSettingsManager = createMockSettingsManager();
        mockSettingsManager.updateProfileSettings = vi.fn();
        awsCredentials = new AwsCredentials(mockAwsHandlers, mockSettingsManager, encryptionKey.toString('base64'));
    });

    describe('getIAM', () => {
        test('throws error when credentials not configured', () => {
            expect(() => awsCredentials.getIAM()).toThrow('IAM credentials not configured');
        });

        test('returns deep readonly copy of credentials', async () => {
            await awsCredentials.handleIamCredentialsUpdate(await encryptData(testCredentials));

            const result = awsCredentials.getIAM();
            expect(result.profile).toBe('SomeProfile');
            expect(result.accessKeyId).toBe('AKIATEST');
            expect(result.secretAccessKey).toBe('AKIASECRET');
            expect(result.region).toBe('us-west-2');
            expect(result.sessionToken).toBeUndefined();
            expect(result).not.toBe(testCredentials);
        });
    });

    describe('handleIamCredentialsUpdate', () => {
        test('successfully updates credentials with valid encrypted data', async () => {
            const result = await awsCredentials.handleIamCredentialsUpdate(await encryptData(testCredentials));

            expect(result).toBe(true);
            expect(mockSettingsManager.updateProfileSettings).toHaveBeenCalledWith('SomeProfile', 'us-west-2');

            const credentials = awsCredentials.getIAM();
            expect(credentials.profile).toBe('SomeProfile');
            expect(credentials.accessKeyId).toBe('AKIATEST');
            expect(credentials.secretAccessKey).toBe('AKIASECRET');
            expect(credentials.region).toBe('us-west-2');
            expect(credentials.sessionToken).toBeUndefined();
        });

        test('handles invalid encrypted data', async () => {
            const result = await awsCredentials.handleIamCredentialsUpdate({ data: 'invalid-data' as any });

            expect(result).toBe(false);
            expect(mockSettingsManager.updateProfileSettings).toHaveBeenCalledWith('default', 'us-east-1');
        });

        test('handles malformed JSON in encrypted data', async () => {
            const result = await awsCredentials.handleIamCredentialsUpdate(await encryptData('invalid-json'));

            expect(result).toBe(false);
        });

        test('handles invalid schema in decrypted data', async () => {
            const invalidData = { invalid: 'structure' };
            const encrypted = await encryptData(invalidData);

            const result = await awsCredentials.handleIamCredentialsUpdate({ data: encrypted as any });

            expect(result).toBe(false);
        });
    });

    describe('handleIamCredentialsDelete', () => {
        test('clears credentials', async () => {
            const encrypted = await encryptData(testCredentials);
            await awsCredentials.handleIamCredentialsUpdate({ data: encrypted as any });
            awsCredentials.handleIamCredentialsDelete();

            expect(() => awsCredentials.getIAM()).toThrow('IAM credentials not configured');
        });
    });

    async function encryptData(data: any): Promise<UpdateCredentialsParams> {
        const payload = new TextEncoder().encode(JSON.stringify({ data }));

        const jwt = await new CompactEncrypt(payload)
            .setProtectedHeader({ alg: 'dir', enc: 'A256GCM' })
            .encrypt(encryptionKey);

        return {
            data: jwt,
            encrypted: true,
        };
    }
});
