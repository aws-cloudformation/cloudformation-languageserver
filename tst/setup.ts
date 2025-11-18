import { join } from 'path';
import { v4 } from 'uuid';
import { LoggerFactory } from '../src/telemetry/LoggerFactory';
import { TelemetryService } from '../src/telemetry/TelemetryService';

LoggerFactory.initialize('silent', join(process.cwd(), 'node_modules', '.cache', 'tests', v4()));
TelemetryService.initialize(undefined, { telemetryEnabled: false });
