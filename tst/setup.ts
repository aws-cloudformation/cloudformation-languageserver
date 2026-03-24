import { randomUUID as v4 } from 'crypto';
import { join } from 'path';
import { staticInitialize } from '../src/app/initialize';

staticInitialize(undefined, {
    telemetryEnabled: false,
    logLevel: 'silent',
    storageDir: join(process.cwd(), 'node_modules', '.cache', 'tests', v4()),
});
