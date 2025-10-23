import { readFileSync, writeFileSync, existsSync } from 'fs';
import { join } from 'path';
import axios from 'axios';
import { LoggerFactory } from '../telemetry/LoggerFactory';
import { Measure } from '../telemetry/TelemetryDecorator';
import { Closeable } from '../utils/Closeable';
import { AwsEnv } from '../utils/Environment';
import { extractErrorMessage } from '../utils/Errors';
import { FeatureFlagConfig, FeatureFlagConfigKey, TargetedFeatureFlagConfigKey } from './FeatureFlagConfig';
import { Describable, FeatureFlag, TargetedFeatureFlag } from './FeatureFlagI';

const log = LoggerFactory.getLogger('FeatureFlagProvider');

export class FeatureFlagProvider implements Closeable {
    private static readonly LocalFile = join(__dirname, 'assets', 'featureFlag', `${AwsEnv.toLowerCase()}.json`);

    private config: FeatureFlagConfig;
    private readonly timeout: NodeJS.Timeout;

    constructor() {
        if (existsSync(FeatureFlagProvider.LocalFile)) {
            const file = readFileSync(FeatureFlagProvider.LocalFile, 'utf8');
            this.config = FeatureFlagConfig.fromJsonString(file);
        } else {
            this.config = new FeatureFlagConfig();
        }

        logFeatureFlags(this.config);

        // https://docs.github.com/en/rest/using-the-rest-api/rate-limits-for-the-rest-api?apiVersion=2022-11-28#primary-rate-limit-for-unauthenticated-users
        // GitHub rate limits unauthenticated users to 60 requests per minute, so our refresh cycle has to be less than that
        // Using 5 mins i.e. 12 requests in 1 hour
        this.timeout = setInterval(
            () => {
                this.refresh().catch((err) => {
                    log.error(`Failed to sync feature flags from remote: ${extractErrorMessage(err)}`);
                });
            },
            5 * 60 * 1000,
        );
    }

    get(key: FeatureFlagConfigKey): FeatureFlag {
        return this.config.get(key);
    }

    getTargeted<T>(key: TargetedFeatureFlagConfigKey): TargetedFeatureFlag<T> {
        return this.config.getTargeted(key);
    }

    private async refresh() {
        const newConfig = await this.getFromOnline(AwsEnv);
        this.config = new FeatureFlagConfig(newConfig);

        writeFileSync(FeatureFlagProvider.LocalFile, JSON.stringify(newConfig, undefined, 2));
        logFeatureFlags(this.config);
    }

    @Measure({ name: 'getFromOnline' })
    private async getFromOnline(env: string): Promise<unknown> {
        const response = await axios<unknown>({
            method: 'get',
            url: `https://raw.githubusercontent.com/aws-cloudformation/cloudformation-languageserver/refs/head/main/assets/featureFlag/${env.toLowerCase()}.json`,
        });

        return response.data;
    }

    close() {
        clearInterval(this.timeout);
    }
}

function logFeatureFlags(config: Describable) {
    log.info(`Feature flags:\n${config.describe()}`);
}
