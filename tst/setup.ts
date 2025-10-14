import { LoggerFactory } from '../src/telemetry/LoggerFactory';
import { TelemetryService } from '../src/telemetry/TelemetryService';

TelemetryService.initialize(undefined, { telemetryEnabled: false });
LoggerFactory.initialize({ logLevel: 'silent' });
