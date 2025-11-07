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
import { ClientInfo } from '../server/InitParams';
import { isBeta, isAlpha, isProd, isTest } from '../utils/Environment';
import { ExtensionId, ExtensionVersion } from '../utils/ExtensionConfig';

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

    const sdk = new NodeSDK({
        resource: resourceFromAttributes({
            ['service']: `${ExtensionId}-${ExtensionVersion}`,
            ['service.env']: `${process.env.NODE_ENV}-${process.env.AWS_ENV}`,
            ['client.id']: clientId,
            ['client.type']: `${client?.name ?? 'Unknown'}-${client?.version ?? 'Unknown'}`,
            ['machine.type']: `${type()}-${platform()}-${arch()}-${machine()}-${release()}`,
            ['process.type']: `${process.platform}-${process.arch}`,
            ['process.version']: `node=${process.versions.node} v8=${process.versions.v8} uv=${process.versions.uv} modules=${process.versions.modules}`,
        }),
        resourceDetectors: [],
        metricReader: metricsReader,
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
                '@opentelemetry/instrumentation-amqplib': { enabled: false },
                '@opentelemetry/instrumentation-aws-lambda': { enabled: false },
                '@opentelemetry/instrumentation-bunyan': { enabled: false },
                '@opentelemetry/instrumentation-cassandra-driver': { enabled: false },
                '@opentelemetry/instrumentation-connect': { enabled: false },
                '@opentelemetry/instrumentation-cucumber': { enabled: false },
                '@opentelemetry/instrumentation-dataloader': { enabled: false },
                '@opentelemetry/instrumentation-dns': { enabled: false },
                '@opentelemetry/instrumentation-express': { enabled: false },
                '@opentelemetry/instrumentation-fastify': { enabled: false },
                '@opentelemetry/instrumentation-fs': { enabled: false },
                '@opentelemetry/instrumentation-generic-pool': { enabled: false },
                '@opentelemetry/instrumentation-graphql': { enabled: false },
                '@opentelemetry/instrumentation-grpc': { enabled: false },
                '@opentelemetry/instrumentation-hapi': { enabled: false },
                '@opentelemetry/instrumentation-http': { enabled: false },
                '@opentelemetry/instrumentation-ioredis': { enabled: false },
                '@opentelemetry/instrumentation-kafkajs': { enabled: false },
                '@opentelemetry/instrumentation-knex': { enabled: false },
                '@opentelemetry/instrumentation-koa': { enabled: false },
                '@opentelemetry/instrumentation-lru-memoizer': { enabled: false },
                '@opentelemetry/instrumentation-memcached': { enabled: false },
                '@opentelemetry/instrumentation-mongodb': { enabled: false },
                '@opentelemetry/instrumentation-mongoose': { enabled: false },
                '@opentelemetry/instrumentation-mysql2': { enabled: false },
                '@opentelemetry/instrumentation-mysql': { enabled: false },
                '@opentelemetry/instrumentation-nestjs-core': { enabled: false },
                '@opentelemetry/instrumentation-net': { enabled: false },
                '@opentelemetry/instrumentation-oracledb': { enabled: false },
                '@opentelemetry/instrumentation-pg': { enabled: false },
                '@opentelemetry/instrumentation-pino': { enabled: false },
                '@opentelemetry/instrumentation-redis': { enabled: false },
                '@opentelemetry/instrumentation-restify': { enabled: false },
                '@opentelemetry/instrumentation-router': { enabled: false },
                '@opentelemetry/instrumentation-socket.io': { enabled: false },
                '@opentelemetry/instrumentation-tedious': { enabled: false },
                '@opentelemetry/instrumentation-undici': { enabled: false },
                '@opentelemetry/instrumentation-winston': { enabled: false },
                '@opentelemetry/instrumentation-aws-sdk': { enabled: false },

                // Only enable system level instrumentation
                '@opentelemetry/instrumentation-runtime-node': {
                    enabled: true,
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
