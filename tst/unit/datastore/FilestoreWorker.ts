import { join } from 'path';
import { v4 } from 'uuid';
import { staticInitialize } from '../../../src/app/initialize';
import { EncryptedFileStore } from '../../../src/datastore/file/EncryptedFileStore';
import { encryptionKey } from '../../../src/datastore/file/Encryption';

// Worker script for multiprocess FileStore testing
staticInitialize(undefined, {
    telemetryEnabled: false,
    logLevel: 'silent',
    storageDir: join(process.cwd(), 'node_modules', '.cache', 'filedb-worker', v4()),
});

const [encTestDir, workerId, numWrites] = process.argv.slice(2);
const key = encryptionKey(2);

async function main() {
    const store = new EncryptedFileStore(key, 'test', encTestDir);

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
