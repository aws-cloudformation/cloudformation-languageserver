import { arch, platform, type, release, machine } from 'os';
import { diag, DiagConsoleLogger, DiagLogLevel } from '@opentelemetry/api';
import { getNodeAutoInstrumentations } from '@opentelemetry/auto-instrumentations-node';
import { OTLPMetricExporter } from '@opentelemetry/exporter-metrics-otlp-http';
import { resourceFromAttributes } from '@opentelemetry/resources';
import {
    AggregationTemporality,
    PeriodicExportingMetricReader,
    AggregationType,
    ViewOptions,
} from '@opentelemetry/sdk-metrics';
import { NodeSDK } from '@opentelemetry/sdk-node';
import { v4 } from 'uuid';
import { isBeta, isAlpha, isProd, isTest } from '../utils/Environment';
import { ExtensionName, ExtensionVersion } from '../utils/ExtensionConfig';
import { ExtendedClientMetadata, ClientInfo } from './TelemetryConfig';

const DurationHistogramBoundaries = [
    0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 16, 32, 64, 128, 256, 512, 1024, 2048, 4096, 8192, 16_384, 32_768, 65_536,
]; // Boundaries for buckets - latency (ms) usually grows exponentially
const ExportIntervalSeconds = 30;

export function otelSdk(client?: ClientInfo, metadata?: ExtendedClientMetadata) {
    configureDiagnostics();
    const url = telemetryBaseUrl();

    return new NodeSDK({
        resource: resourceFromAttributes({
            ['service.clientId']: metadata?.clientId ?? v4(),
            ['service.name']: ExtensionName,
            ['service.version']: ExtensionVersion,
            ['service.NODE_ENV']: process.env.NODE_ENV,
            ['service.AWS_ENV']: process.env.AWS_ENV,
            ['lspClient.name']: client?.name,
            ['lspClient.version']: client?.version,
            ['os.type']: type(),
            ['os.release']: release(),
            ['os.arch']: arch(),
            ['os.platform']: platform(),
            ['os.machine']: machine(),
            ['process.arch']: process.arch,
            ['process.platform']: process.platform,
            ['process.version']: process.version,
        }),
        resourceDetectors: [],
        metricReader: new PeriodicExportingMetricReader({
            exporter: new OTLPMetricExporter({
                url: `${url}/v1/metrics`,
                temporalityPreference: AggregationTemporality.DELTA,
            }),
            exportIntervalMillis: ExportIntervalSeconds * 1000,
        }),
        views: [
            {
                instrumentName: '*.duration',
                aggregation: {
                    type: AggregationType.EXPLICIT_BUCKET_HISTOGRAM,
                    options: {
                        boundaries: DurationHistogramBoundaries,
                        recordMinMax: true,
                    },
                },
            } satisfies ViewOptions,
        ],
        instrumentations: [getNodeAutoInstrumentations()],
    });
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
