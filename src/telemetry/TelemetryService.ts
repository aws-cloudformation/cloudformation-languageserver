import { metrics, trace } from '@opentelemetry/api';
import { MetricReader } from '@opentelemetry/sdk-metrics';
import { NodeSDK } from '@opentelemetry/sdk-node';
import { v4 } from 'uuid';
import { Closeable } from '../utils/Closeable';
import { IsAlphaApp } from '../utils/Environment';
import { extractLocationFromStack } from '../utils/Errors';
import { LoggerFactory } from './LoggerFactory';
import { otelSdk } from './OTELInstrumentation';
import { ScopedTelemetry } from './ScopedTelemetry';
import { AwsMetadata, ClientInfo, TelemetrySettings } from './TelemetryConfig';

export class TelemetryService implements Closeable {
    private static _instance: TelemetryService | undefined = undefined;

    private readonly logger = LoggerFactory.getLogger('TelemetryService');
    private readonly metricsReader?: MetricReader;
    private readonly sdk?: NodeSDK;
    private readonly enabled: boolean;

    private readonly scopedTelemetry: Map<string, ScopedTelemetry> = new Map();

    private constructor(client?: ClientInfo, metadata?: AwsMetadata) {
        if (IsAlphaApp) {
            // Always enable telemetry in alpha, unless it is a test env
            this.enabled = TelemetrySettings.isEnabled;
        } else {
            this.enabled = metadata?.telemetryEnabled ?? TelemetrySettings.isEnabled;
        }

        if (this.enabled) {
            const id = metadata?.clientInfo?.clientId ?? v4();
            const { metricsReader, sdk } = otelSdk(id, client);

            this.metricsReader = metricsReader;
            this.sdk = sdk;
            this.sdk.start();
            this.logger.info(`Telemetry enabled for ${id}`);
            this.registerSystemMetrics();
        } else {
            this.logger.info('Telemetry disabled');
            this.sdk?.shutdown().catch(this.logger.error);
        }
    }

    get(scope: string): ScopedTelemetry {
        let telemetry = this.scopedTelemetry.get(scope);
        if (telemetry !== undefined) {
            return telemetry;
        }

        if (this.enabled && this.sdk) {
            telemetry = new ScopedTelemetry(scope, metrics.getMeter(scope), trace.getTracer(scope));
        } else {
            // NoOp init when telemetry is disabled
            telemetry = new ScopedTelemetry(scope);
        }

        this.scopedTelemetry.set(scope, telemetry);
        return telemetry;
    }

    async close(): Promise<void> {
        await this.metricsReader?.forceFlush();
        await this.sdk?.shutdown().catch(this.logger.error);
    }

    private registerSystemMetrics(): void {
        const systemTelemetry = this.get('System');
        this.registerMemoryMetrics(systemTelemetry);
        this.registerCpuMetrics(systemTelemetry);
        this.registerProcessMetrics(systemTelemetry);
        this.registerErrorHandlers(systemTelemetry);
    }

    private registerMemoryMetrics(telemetry: ScopedTelemetry): void {
        telemetry.registerGaugeProvider(
            'process.memory.heap.used',
            () => {
                return process.memoryUsage().heapUsed;
            },
            { unit: 'By' },
        );

        telemetry.registerGaugeProvider(
            'process.memory.heap.total',
            () => {
                return process.memoryUsage().heapTotal;
            },
            { unit: 'By' },
        );

        telemetry.registerGaugeProvider(
            'process.memory.external',
            () => {
                return process.memoryUsage().external;
            },
            { unit: 'By' },
        );

        telemetry.registerGaugeProvider(
            'process.memory.rss',
            () => {
                return process.memoryUsage().rss;
            },
            { unit: 'By' },
        );

        telemetry.registerGaugeProvider(
            'process.memory.heap.usage_percent',
            () => {
                const usage = process.memoryUsage();
                return Math.round((usage.heapUsed / usage.heapTotal) * 100);
            },
            { unit: '%' },
        );
    }

    private registerCpuMetrics(telemetry: ScopedTelemetry): void {
        let lastCpuUsage = process.cpuUsage();
        let lastTime = performance.now();

        telemetry.registerGaugeProvider(
            'process.cpu.utilization',
            () => {
                const currentUsage = process.cpuUsage();
                const currentTime = performance.now();

                const userDiff = currentUsage.user - lastCpuUsage.user;
                const systemDiff = currentUsage.system - lastCpuUsage.system;
                const timeDiffMicros = (currentTime - lastTime) * 1000;

                if (timeDiffMicros > 0) {
                    const utilization = ((userDiff + systemDiff) / timeDiffMicros) * 100;
                    const clampedUtilization = Math.min(Math.max(Math.round(utilization * 100) / 100, 0), 100);

                    lastCpuUsage = currentUsage;
                    lastTime = currentTime;

                    return clampedUtilization;
                }
                return 0;
            },
            { unit: '%' },
        );
    }

    private registerProcessMetrics(telemetry: ScopedTelemetry): void {
        telemetry.registerGaugeProvider(
            'process.uptime',
            () => {
                return Math.round(process.uptime());
            },
            { unit: 's' },
        );
    }

    private registerErrorHandlers(telemetry: ScopedTelemetry): void {
        process.on('unhandledRejection', (reason, _promise) => {
            this.logger.error(reason, 'Unhandled promise rejection');

            const location = reason instanceof Error ? extractLocationFromStack(reason.stack) : {};
            telemetry.count('process.promise.unhandled', 1, {
                attributes: {
                    'error.type': reason instanceof Error ? reason.name : typeof reason,
                    ...location,
                },
            });

            void this.metricsReader?.forceFlush();
        });

        process.on('uncaughtException', (error, origin) => {
            this.logger.error(error, `Uncaught exception ${origin}`);

            telemetry.count('process.exception.uncaught', 1, {
                attributes: {
                    'error.type': error.name,
                    'error.origin': origin,
                    ...extractLocationFromStack(error.stack),
                },
            });

            void this.metricsReader?.forceFlush();
        });
    }

    public static get instance(): TelemetryService {
        // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
        return TelemetryService._instance!;
    }

    public static initialize(client?: ClientInfo, metadata?: AwsMetadata) {
        if (TelemetryService._instance !== undefined) {
            throw new Error('TelemetryService was already created');
        }

        TelemetryService._instance = new TelemetryService(client, metadata);
    }
}
