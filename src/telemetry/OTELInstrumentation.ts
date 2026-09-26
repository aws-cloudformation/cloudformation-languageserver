import { arch, platform, type, release, machine } from 'os';
import { diag, DiagConsoleLogger, DiagLogLevel } from '@opentelemetry/api';
import { OTLPMetricExporter } from '@opentelemetry/exporter-metrics-otlp-http';
import { RuntimeNodeInstrumentation } from '@opentelemetry/instrumentation-runtime-node';
import { resourceFromAttributes } from '@opentelemetry/resources';
import {
    AggregationTemporality,
    MeterProvider,
    MetricReader,
    PeriodicExportingMetricReader,
    AggregationType,
    ViewOptions,
} from '@opentelemetry/sdk-metrics';
import { ClientInfo } from '../server/InitParams';
import { isBeta, isAlpha, isProd, isTest, ServiceEnv, ProcessType, Service } from '../utils/Environment';

const ExportIntervalSeconds = 60;

export type OtelSdk = {
    meterProvider: MeterProvider;
    metricsReader: MetricReader;
    instrumentation: RuntimeNodeInstrumentation;
};

export function otelSdk(clientId: string, client?: ClientInfo, awsClientInfo?: ClientInfo): OtelSdk {
    configureDiagnostics();
    const telemetryUrl = telemetryBaseUrl();

    const metricsReader = new PeriodicExportingMetricReader({
        exporter: new OTLPMetricExporter({
            url: `${telemetryUrl}/v1/metrics`,
            temporalityPreference: AggregationTemporality.DELTA,
        }),
        exportIntervalMillis: ExportIntervalSeconds * 1000,
    });

    const meterProvider = new MeterProvider({
        resource: resourceFromAttributes({
            ['service']: Service,
            ['service.env']: ServiceEnv,
            ['client.id']: clientId,
            ['client.type']: `${client?.name ?? 'Unknown'}-${client?.version ?? 'Unknown'}`,
            ['aws.client.type']: `${awsClientInfo?.name ?? 'Unknown'}-${awsClientInfo?.version ?? 'Unknown'}`,
            ['machine.type']: `${type()}-${platform()}-${arch()}-${machine()}-${release()}`,
            ['process.type']: ProcessType,
            ['process.version']: `node=${process.versions.node} v8=${process.versions.v8} uv=${process.versions.uv} modules=${process.versions.modules}`,
        }),
        readers: [metricsReader],
        views: [
            {
                instrumentName: '*.duration',
                aggregation: {
                    type: AggregationType.EXPONENTIAL_HISTOGRAM,
                    options: {
                        recordMinMax: true,
                    },
                },
            } satisfies ViewOptions,
            {
                instrumentName: '*.latency',
                aggregation: {
                    type: AggregationType.EXPONENTIAL_HISTOGRAM,
                    options: {
                        recordMinMax: true,
                    },
                },
            } satisfies ViewOptions,
            {
                instrumentName: '*.bytes',
                aggregation: {
                    type: AggregationType.EXPONENTIAL_HISTOGRAM,
                    options: {
                        recordMinMax: true,
                    },
                },
            } satisfies ViewOptions,
            {
                instrumentName: '*.percent',
                aggregation: {
                    type: AggregationType.EXPONENTIAL_HISTOGRAM,
                    options: {
                        recordMinMax: true,
                    },
                },
            } satisfies ViewOptions,
            {
                instrumentName: 'documents.template.size.lines',
                aggregation: {
                    type: AggregationType.EXPONENTIAL_HISTOGRAM,
                    options: {
                        recordMinMax: true,
                    },
                },
            } satisfies ViewOptions,
            {
                instrumentName: '*.length',
                aggregation: {
                    type: AggregationType.EXPONENTIAL_HISTOGRAM,
                    options: {
                        recordMinMax: true,
                    },
                },
            } satisfies ViewOptions,
        ],
    });

    const instrumentation = new RuntimeNodeInstrumentation({
        monitoringPrecision: ExportIntervalSeconds * 1000,
    });

    return { meterProvider, metricsReader, instrumentation };
}

function configureDiagnostics() {
    if (isProd) {
        diag.setLogger(new DiagConsoleLogger(), DiagLogLevel.ERROR);
    } else {
        diag.setLogger(new DiagConsoleLogger(), DiagLogLevel.INFO);
    }
}

function telemetryBaseUrl() {
    if (isTest) {
        return 'http://localhost:1234';
    } else if (isAlpha) {
        return 'https://development-ide-telemetry.cloudformation.aws.dev';
    } else if (isBeta) {
        return 'https://preview-ide-telemetry.cloudformation.aws.dev';
    } else if (isProd) {
        return 'https://ide-telemetry.cloudformation.aws.dev';
    }

    throw new Error('Unknown endpoint');
}
