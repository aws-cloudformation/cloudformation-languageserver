import { compactDecrypt } from 'jose';
import { DeepReadonly } from 'ts-essentials';
import { z } from 'zod';
import { LspAuthHandlers } from '../protocol/LspAuthHandlers';
import { DefaultSettings } from '../settings/Settings';
import { SettingsManager } from '../settings/SettingsManager';
import { LoggerFactory } from '../telemetry/LoggerFactory';
import { getRegion } from '../utils/Region';
import { parseWithPrettyError } from '../utils/ZodErrorWrapper';
import { UpdateCredentialsParams, IamCredentials } from './AwsLspAuthTypes';

const DecryptedCredentialsSchema = z.object({
    data: z.object({
        profile: z.string(),
        accessKeyId: z.string(),
        secretAccessKey: z.string(),
        sessionToken: z.string().optional(),
        region: z.string(),
    }),
});

export class AwsCredentials {
    private readonly logger = LoggerFactory.getLogger(AwsCredentials);

    private iamCredentials?: IamCredentials;
    private readonly encryptionKey?: Buffer;

    constructor(
        private readonly awsHandlers: LspAuthHandlers,
        private readonly settingsManager: SettingsManager,
        encryptionKey?: string,
    ) {
        this.encryptionKey = encryptionKey ? Buffer.from(encryptionKey, 'base64') : undefined;
        this.logger.info(`AWS credentials ${encryptionKey ? 'encrypted' : 'unencrypted'}`);
    }

    getIAM(): DeepReadonly<IamCredentials> {
        if (!this.iamCredentials) {
            throw new Error('IAM credentials not configured');
        }
        return structuredClone(this.iamCredentials);
    }

    async handleIamCredentialsUpdate(params: UpdateCredentialsParams): Promise<boolean> {
        if (!this.encryptionKey) {
            this.logger.error('Authentication failed: encryption key not configured');
            return false;
        }

        try {
            const decrypted = await compactDecrypt(params.data, this.encryptionKey);
            const rawCredentials = JSON.parse(new TextDecoder().decode(decrypted.plaintext)) as unknown;

            const validatedCredentials = parseWithPrettyError(
                DecryptedCredentialsSchema.parse.bind(DecryptedCredentialsSchema),
                rawCredentials,
            );

            const region = getRegion(validatedCredentials.data.region);

            this.iamCredentials = {
                ...validatedCredentials.data,
                region,
            };

            this.settingsManager.updateProfileSettings(validatedCredentials.data.profile, region);
            return true;
        } catch (error) {
            this.iamCredentials = undefined;

            this.logger.error(error, `Failed to update IAM credentials`);
            this.settingsManager.updateProfileSettings(DefaultSettings.profile.profile, DefaultSettings.profile.region);
            return false;
        }
    }

    handleIamCredentialsDelete() {
        this.logger.info('IAM credentials deleted');
        this.iamCredentials = undefined;
    }
}
