import { randomUUID as v4 } from 'crypto';
import { join } from 'path';
import { staticInitialize } from '../../../src/app/initialize';

// Initialize BEFORE importing modules that call factories like Logger at the top level
staticInitialize(undefined, {
    telemetryEnabled: false,
    logLevel: 'silent',
    storageDir: join(process.cwd(), 'node_modules', '.cache', 'filedb-worker', v4()),
});

const [encTestDir, workerId, numWrites] = process.argv.slice(2);

async function main() {
    const { encryptionKey } = await import('../../../src/datastore/file/Encryption');
    const { KeyedFileStore } = await import('../../../src/datastore/file/KeyedFileStore');

    const key = encryptionKey(2);
    const store = new KeyedFileStore(key, 'test', encTestDir);

    for (let i = 0; i < Number.parseInt(numWrites); i++) {
        await store.put(`worker${workerId}_key${i}`, `worker${workerId}_value${i}`);
    }
}

/* eslint-disable unicorn/no-process-exit, unicorn/prefer-top-level-await */
main()
    .then(() => process.exit(0))
    .catch((err) => {
        console.error(err); // eslint-disable-line no-console
        process.exit(1);
    });
