import { randomUUID as v4 } from 'crypto';
import { join } from 'path';
import { staticInitialize } from '../../src/app/initialize';

staticInitialize(undefined, {
    telemetryEnabled: false,
    logLevel: 'info', // Enable info-level logging for long-running tests
    storageDir: join(process.cwd(), 'node_modules', '.cache', 'long-running-tests', v4()),
});
