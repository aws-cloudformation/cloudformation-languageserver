import { arch, platform, type, release, machine } from 'os';
import { diag, DiagConsoleLogger, DiagLogLevel } from '@opentelemetry/api';
import { getNodeAutoInstrumentations } from '@opentelemetry/auto-instrumentations-node';
import { OTLPMetricExporter } from '@opentelemetry/exporter-metrics-otlp-http';
import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-http';
import { resourceFromAttributes } from '@opentelemetry/resources';
import {
    AggregationTemporality,
    PeriodicExportingMetricReader,
    AggregationType,
    ViewOptions,
} from '@opentelemetry/sdk-metrics';
import { NodeSDK } from '@opentelemetry/sdk-node';
import { isBeta, isAlpha, isProd, isTest, IsAppEnvironment } from '../utils/Environment';
import { ExtensionName, ExtensionVersion } from '../utils/ExtensionConfig';
import { ClientInfo } from './TelemetryConfig';

const ExportIntervalSeconds = 30;

export function otelSdk(clientId: string, client?: ClientInfo) {
    configureDiagnostics();
    const telemetryUrl = telemetryBaseUrl();

    const metricsReader = new PeriodicExportingMetricReader({
        exporter: new OTLPMetricExporter({
            url: `${telemetryUrl}/v1/metrics`,
            temporalityPreference: AggregationTemporality.DELTA,
        }),
        exportIntervalMillis: ExportIntervalSeconds * 1000,
    });

    let traceExporter: OTLPTraceExporter | undefined;

    // Only enable in alpha environment (excluding test env)
    if (isAlpha && IsAppEnvironment) {
        traceExporter = new OTLPTraceExporter({
            url: `${telemetryUrl}/v1/traces`,
        });
    }

    const sdk = new NodeSDK({
        resource: resourceFromAttributes({
            ['service']: `${ExtensionName}-${ExtensionVersion}`,
            ['service.env']: `${process.env.NODE_ENV}-${process.env.AWS_ENV}`,
            ['client.id']: clientId,
            ['client.type']: `${client?.name ?? 'Unknown'}-${client?.version ?? 'Unknown'}`,
            ['machine.type']: `${type()}-${platform()}-${arch()}-${machine()}-${release()}`,
            ['process.type']: `${process.platform}-${process.arch}`,
            ['process.version']: `node=${process.versions.node} v8=${process.versions.v8} uv=${process.versions.uv} modules=${process.versions.modules}`,
        }),
        resourceDetectors: [],
        metricReader: metricsReader,
        traceExporter: traceExporter,
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
        ],
        instrumentations: [
            getNodeAutoInstrumentations({
                '@opentelemetry/instrumentation-pino': {
                    enabled: false,
                },
                '@opentelemetry/instrumentation-http': {
                    ignoreOutgoingRequestHook: (request) => {
                        if (!request.hostname) {
                            return false;
                        }

                        return telemetryUrl.includes(request.hostname);
                    },
                },
                '@opentelemetry/instrumentation-runtime-node': {
                    monitoringPrecision: ExportIntervalSeconds * 1000,
                },
            }),
        ],
    });

    return { sdk, metricsReader };
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
        return 'http://locahost:1234';
    } else if (isAlpha) {
        return 'https://development-ide-telemetry.cloudformation.aws.dev';
    } else if (isBeta) {
        return 'https://preview-ide-telemetry.cloudformation.aws.dev';
    }

    throw new Error('Unknown endpoint');
}
