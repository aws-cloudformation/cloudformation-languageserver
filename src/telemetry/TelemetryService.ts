import { metrics, trace } from '@opentelemetry/api';
import { NodeSDK } from '@opentelemetry/sdk-node';
import { Closeable, Configurable } from '../server/ServerComponents';
import { DefaultSettings, SettingsSubscription, TelemetrySettings, ISettingsSubscriber } from '../settings/Settings';
import { CoralTelemetry } from './CoralTelemetry';
import { StdOutLogger } from './LoggerFactory';
import { configureDiagnostics, setupOpenTelemetry } from './OpenTelemetryInstrumentation';

export class TelemetryService implements Configurable, Closeable {
    public static readonly instance = new TelemetryService();

    private sdk?: NodeSDK;
    private setting: TelemetrySettings = DefaultSettings.telemetry;
    private readonly scopedTelemetry: Map<string, CoralTelemetry> = new Map();
    private settingsSubscription?: SettingsSubscription;

    private constructor() {
        configureDiagnostics();
        this.setupTelemetry();
    }

    configure(settingsManager: ISettingsSubscriber): void {
        // Clean up existing subscription if present
        if (this.settingsSubscription) {
            this.settingsSubscription.unsubscribe();
        }

        // Get initial settings
        this.setting = settingsManager.getCurrentSettings().telemetry;
        this.setupTelemetry();

        // Subscribe to telemetry settings changes
        this.settingsSubscription = settingsManager.subscribe('telemetry', (newTelemetrySettings) => {
            this.onSettingsChanged(newTelemetrySettings);
        });
    }

    private onSettingsChanged(settings: TelemetrySettings): void {
        this.setting = settings;
        this.setupTelemetry();
    }

    get(scope: string): CoralTelemetry {
        let telemetry = this.scopedTelemetry.get(scope);
        if (telemetry !== undefined) {
            return telemetry;
        }

        if (this.setting.enabled) {
            telemetry = new CoralTelemetry(scope, metrics.getMeter(scope), trace.getTracer(scope));
            this.scopedTelemetry.set(scope, telemetry);
            return telemetry;
        }

        return new CoralTelemetry(scope);
    }

    private setupTelemetry() {
        if (this.setting.enabled && this.sdk === undefined) {
            this.sdk = setupOpenTelemetry();

            if (this.sdk) {
                this.registerSystemMetrics();
                StdOutLogger.info('Telemetry enabled');
            }
        } else if (!this.setting.enabled) {
            this.sdk
                ?.shutdown()
                .then(() => {
                    this.sdk = undefined;
                    StdOutLogger.info('Telemetry shutdown');
                })
                .catch((error: unknown) => {
                    StdOutLogger.error({ error }, 'Telemetry could not be shutdown');
                });
        }
    }

    async close(): Promise<void> {
        if (this.settingsSubscription) {
            this.settingsSubscription.unsubscribe();
            this.settingsSubscription = undefined;
        }

        if (this.sdk) {
            await this.sdk.shutdown();
            this.sdk = undefined;
        }
    }

    private registerSystemMetrics(): void {
        const systemTelemetry = this.get('system');
        this.registerMemoryMetrics(systemTelemetry);
        this.registerCpuMetrics(systemTelemetry);
        this.registerProcessMetrics(systemTelemetry);
        this.registerErrorHandlers(systemTelemetry);
    }

    private registerMemoryMetrics(telemetry: CoralTelemetry): void {
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

    private registerCpuMetrics(telemetry: CoralTelemetry): void {
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

    private registerProcessMetrics(telemetry: CoralTelemetry): void {
        telemetry.registerGaugeProvider(
            'process.uptime',
            () => {
                return Math.round(process.uptime());
            },
            { description: 'Process uptime', unit: 's' },
        );
    }

    private registerErrorHandlers(telemetry: CoralTelemetry): void {
        process.on('uncaughtExceptionMonitor', (error, origin) => {
            StdOutLogger.error(
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
            StdOutLogger.error(
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
            StdOutLogger.error(
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
}
