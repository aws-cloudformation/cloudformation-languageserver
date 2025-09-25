import { diag, DiagConsoleLogger, DiagLogLevel } from '@opentelemetry/api';
import { getNodeAutoInstrumentations } from '@opentelemetry/auto-instrumentations-node';
import { PinoInstrumentation } from '@opentelemetry/instrumentation-pino';
import { resourceFromAttributes } from '@opentelemetry/resources';
import { BatchLogRecordProcessor, ConsoleLogRecordExporter } from '@opentelemetry/sdk-logs';
import { PeriodicExportingMetricReader, ConsoleMetricExporter } from '@opentelemetry/sdk-metrics';
import { NodeSDK } from '@opentelemetry/sdk-node';
import { TraceIdRatioBasedSampler } from '@opentelemetry/sdk-trace-base/build/src/sampler/TraceIdRatioBasedSampler';
import { AlwaysOnSampler, BatchSpanProcessor, ConsoleSpanExporter } from '@opentelemetry/sdk-trace-node';
import { ATTR_SERVICE_NAME, ATTR_SERVICE_VERSION } from '@opentelemetry/semantic-conventions';
import { isDev } from '../utils/Environment';
import { ExtensionName, ExtensionVersion } from '../utils/ExtensionConfig';
import { StdOutLogger } from './LoggerFactory';

export function setupOpenTelemetry() {
    try {
        const sdk = new NodeSDK({
            resource: resourceFromAttributes({
                [ATTR_SERVICE_NAME]: ExtensionName,
                [ATTR_SERVICE_VERSION]: ExtensionVersion,
                ['process.env.NODE_ENV']: process.env.NODE_ENV,
                ['process.env.AWS_ENV']: process.env.AWS_ENV,
            }),
            sampler: isDev ? new AlwaysOnSampler() : new TraceIdRatioBasedSampler(0.5),
            spanProcessors: [new BatchSpanProcessor(new ConsoleSpanExporter())],
            spanLimits: {
                attributeCountLimit: 128,
                eventCountLimit: 128,
                linkCountLimit: 128,
            },
            metricReader: new PeriodicExportingMetricReader({
                exporter: new ConsoleMetricExporter(),
                exportIntervalMillis: isDev ? 5 * 60 * 1000 : 60 * 1000,
            }),
            logRecordProcessors: [new BatchLogRecordProcessor(new ConsoleLogRecordExporter())],
            instrumentations: isDev ? [] : [getNodeAutoInstrumentations(), new PinoInstrumentation()],
        });
        sdk.start();
        return sdk;
    } catch (error) {
        StdOutLogger.error({ error }, 'Failed to startup Telemetry');
        return;
    }
}

export function configureDiagnostics() {
    if (isDev) {
        diag.setLogger(new DiagConsoleLogger(), DiagLogLevel.INFO);
    } else {
        diag.setLogger(new DiagConsoleLogger(), DiagLogLevel.ERROR);
    }
}
