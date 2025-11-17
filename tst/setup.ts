import { join } from 'path';
import { LoggerFactory } from '../src/telemetry/LoggerFactory';
import { TelemetryService } from '../src/telemetry/TelemetryService';

LoggerFactory.initialize(join(process.cwd(), 'node_modules', '.cache', 'tests'), 'silent');
TelemetryService.initialize(undefined, { telemetryEnabled: false });
