import { metrics, trace } from '@opentelemetry/api';
import { NodeSDK } from '@opentelemetry/sdk-node';
import { Closeable } from '../utils/Closeable';
import { LoggerFactory } from './LoggerFactory';
import { otelSdk } from './OTELInstrumentation';
import { ScopedTelemetry } from './ScopedTelemetry';
import { ExtendedClientMetadata, ClientInfo, TelemetrySettings } from './TelemetryConfig';

export class TelemetryService implements Closeable {
    private static _instance: TelemetryService | undefined = undefined;

    private readonly logger = LoggerFactory.getLogger('TelemetryService');
    private readonly sdk: NodeSDK;
    private readonly enabled: boolean;

    private readonly scopedTelemetry: Map<string, ScopedTelemetry> = new Map();

    private constructor(client?: ClientInfo, metadata?: ExtendedClientMetadata) {
        this.sdk = otelSdk(client, metadata);
        this.enabled = metadata?.telemetryEnabled ?? TelemetrySettings.isEnabled;

        if (this.enabled) {
            this.sdk.start();
            this.logger.info('Telemetry enabled');
            this.registerSystemMetrics();
        } else {
            this.logger.info('Telemetry disabled');
            this.sdk.shutdown().catch(this.logger.error);
        }
    }

    get(scope: string): ScopedTelemetry {
        let telemetry = this.scopedTelemetry.get(scope);
        if (telemetry !== undefined) {
            return telemetry;
        }

        if (this.enabled) {
            telemetry = new ScopedTelemetry(scope, metrics.getMeter(scope), trace.getTracer(scope));
        } else {
            // NoOp init when telemetry is disabled
            telemetry = new ScopedTelemetry(scope);
        }

        this.scopedTelemetry.set(scope, telemetry);
        return telemetry;
    }

    async close(): Promise<void> {
        await this.sdk.shutdown().catch(this.logger.error);
    }

    private registerSystemMetrics(): void {
        const systemTelemetry = this.get('system');
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
            { description: 'Process heap memory used', unit: 'By' },
        );

        telemetry.registerGaugeProvider(
            'process.memory.heap.total',
            () => {
                return process.memoryUsage().heapTotal;
            },
            { description: 'Process heap memory total', unit: 'By' },
        );

        telemetry.registerGaugeProvider(
            'process.memory.external',
            () => {
                return process.memoryUsage().external;
            },
            { description: 'Process external memory', unit: 'By' },
        );

        telemetry.registerGaugeProvider(
            'process.memory.rss',
            () => {
                return process.memoryUsage().rss;
            },
            { description: 'Process resident set size', unit: 'By' },
        );

        telemetry.registerGaugeProvider(
            'process.memory.heap.usage_percent',
            () => {
                const usage = process.memoryUsage();
                return Math.round((usage.heapUsed / usage.heapTotal) * 100);
            },
            { description: 'Heap memory usage percentage', unit: '%' },
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
            { description: 'CPU utilization percentage', unit: '%' },
        );
    }

    private registerProcessMetrics(telemetry: ScopedTelemetry): void {
        telemetry.registerGaugeProvider(
            'process.uptime',
            () => {
                return Math.round(process.uptime());
            },
            { description: 'Process uptime', unit: 's' },
        );
    }

    private registerErrorHandlers(telemetry: ScopedTelemetry): void {
        process.on('uncaughtExceptionMonitor', (error, origin) => {
            this.logger.error(
                {
                    error,
                    origin,
                },
                'Uncaught exception monitor',
            );
            telemetry.count('process.uncaught_exception_monitor', 1, undefined, {
                origin,
                error_name: error?.name ?? 'Unknown',
                error_type: 'uncaught_exception_monitor',
            });
        });

        process.on('unhandledRejection', (reason, promise) => {
            this.logger.error(
                {
                    reason,
                    promise,
                },
                'Unhandled promise rejection',
            );
            telemetry.count('process.unhandled_rejection', 1, undefined, {
                error_type: 'unhandled_rejection',
            });
        });

        process.on('uncaughtException', (error, origin) => {
            this.logger.error(
                {
                    error,
                    origin,
                },
                'Uncaught exception',
            );
            telemetry.count('process.uncaught_exception', 1, undefined, {
                error_type: 'uncaught_exception',
            });
        });
    }

    public static get instance(): TelemetryService {
        // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
        return TelemetryService._instance!;
    }

    public static initialize(client?: ClientInfo, metadata?: ExtendedClientMetadata) {
        if (TelemetryService._instance !== undefined) {
            throw new Error('TelemetryService was already created');
        }

        TelemetryService._instance = new TelemetryService(client, metadata);
    }
}
