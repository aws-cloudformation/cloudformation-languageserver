import { join } from 'path';
import { v4 } from 'uuid';
import { staticInitialize } from '../src/app/initialize';

staticInitialize(undefined, {
    telemetryEnabled: false,
    logLevel: 'silent',
    storageDir: join(process.cwd(), 'node_modules', '.cache', 'tests', v4()),
});
