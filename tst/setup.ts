import { join } from 'path';
import { v4 } from 'uuid';
import { LoggerFactory } from '../src/telemetry/LoggerFactory';
import { TelemetryService } from '../src/telemetry/TelemetryService';
import { Storage } from '../src/utils/Storage';

Storage.initialize(join(process.cwd(), 'node_modules', '.cache', 'tests', v4()));
LoggerFactory.initialize('silent');
TelemetryService.initialize(undefined, { telemetryEnabled: false });
