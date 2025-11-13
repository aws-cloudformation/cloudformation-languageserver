import { readFileSync, writeFileSync } from 'fs';
import { join } from 'path';
import { LoggerFactory } from '../telemetry/LoggerFactory';
import { Measure } from '../telemetry/TelemetryDecorator';
import { Closeable } from '../utils/Closeable';
import { AwsEnv } from '../utils/Environment';
import { downloadJson } from '../utils/RemoteDownload';
import { FeatureFlag, TargetedFeatureFlag } from './FeatureFlagI';
import { FeatureFlagSupplier, FeatureFlagConfigKey, TargetedFeatureFlagConfigKey } from './FeatureFlagSupplier';

const log = LoggerFactory.getLogger('FeatureFlagProvider');

export class FeatureFlagProvider implements Closeable {
    private config: unknown;
    private readonly supplier: FeatureFlagSupplier;

    private readonly timeout: NodeJS.Timeout;

    constructor(private readonly localFile = join(__dirname, 'assets', 'featureFlag', `${AwsEnv.toLowerCase()}.json`)) {
        this.config = JSON.parse(readFileSync(localFile, 'utf8'));

        this.supplier = new FeatureFlagSupplier(() => {
            return this.config;
        });

        // https://docs.github.com/en/rest/using-the-rest-api/rate-limits-for-the-rest-api?apiVersion=2022-11-28#primary-rate-limit-for-unauthenticated-users
        // GitHub rate limits unauthenticated users to 60 requests per minute, so our refresh cycle has to be less than that
        // Using 5 mins i.e. 12 requests in 1 hour
        this.timeout = setInterval(
            () => {
                this.refresh().catch((err) => {
                    log.error(err, `Failed to sync feature flags from remote`);
                });
            },
            5 * 60 * 1000,
        );

        this.log();
    }

    get(key: FeatureFlagConfigKey): FeatureFlag {
        // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
        return this.supplier.featureFlags.get(key)!;
    }

    getTargeted<T>(key: TargetedFeatureFlagConfigKey): TargetedFeatureFlag<T> {
        // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
        return this.supplier.targetedFeatureFlags.get(key)!;
    }

    private async refresh() {
        const newConfig = await this.getFromOnline(AwsEnv);
        this.config = newConfig;
        writeFileSync(this.localFile, JSON.stringify(newConfig, undefined, 2));

        this.log();
    }

    @Measure({ name: 'getFromOnline' })
    private async getFromOnline(env: string): Promise<unknown> {
        return await downloadJson(
            `https://raw.githubusercontent.com/aws-cloudformation/cloudformation-languageserver/refs/heads/main/assets/featureFlag/${env.toLowerCase()}.json`,
        );
    }

    private log() {
        log.info(
            `Feature flags:\n${this.supplier
                .getAll()
                .map((ff) => {
                    return ff.describe();
                })
                .join('\n')}`,
        );
    }

    close() {
        this.supplier.close();
        clearInterval(this.timeout);
    }
}
