import fs from 'fs';
import { join } from 'path';
import { open } from 'lmdb';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { StoreName } from '../../../src/datastore/DataStore';
import { LMDBStoreFactory } from '../../../src/datastore/LMDBStoreFactory';
import { LMDBOwnershipTracker, OwnershipPhase } from '../../../src/datastore/lmdb/OwnershipTracker';

vi.mock('lmdb', async () => {
    const actual = await vi.importActual<typeof import('lmdb')>('lmdb');
    return {
        ...actual,
        open: vi.fn().mockImplementation(actual.open),
    };
});

const mockedOpen = vi.mocked(open);

const OWNER_MARKER_PREFIX = 'owner.';

function markerName(pid: number, phase: OwnershipPhase): string {
    return `${OWNER_MARKER_PREFIX}${pid}.${phase}`;
}

describe('LMDB startup corruption recovery', () => {
    let testDir: string;

    beforeEach(async () => {
        mockedOpen.mockReset();
        const actual = await vi.importActual<typeof import('lmdb')>('lmdb');
        mockedOpen.mockImplementation(actual.open);
        testDir = join(process.cwd(), 'node_modules', '.cache', 'lmdb-startup-recovery-test', `test-${Date.now()}`);
        fs.mkdirSync(testDir, { recursive: true });
    });

    afterEach(async () => {
        vi.restoreAllMocks();
        await new Promise((resolve) => setTimeout(resolve, 100));
        if (fs.existsSync(testDir)) {
            fs.rmSync(testDir, { recursive: true, force: true });
        }
    });

    it('should recover when createEnv fails with corruption on startup', async () => {
        const actual = await vi.importActual<typeof import('lmdb')>('lmdb');

        // First call throws, second call (after delete) succeeds
        mockedOpen
            .mockImplementationOnce(() => {
                throw new Error('MDB_CORRUPTED: Located page was wrong type');
            })
            .mockImplementation(actual.open);

        const factory = new LMDBStoreFactory(testDir);
        await factory.initialize();
        const store = factory.get(StoreName.public_schemas);

        await store.put('key', 'value');
        expect(store.get('key')).toBe('value');

        await factory.close();
    });

    it('should recover when openDB fails with corruption on startup', async () => {
        const actual = await vi.importActual<typeof import('lmdb')>('lmdb');
        let callCount = 0;

        // open() succeeds but returns an env whose openDB throws on first call
        mockedOpen.mockImplementation((config: any) => {
            const env = actual.open(config);
            if (callCount === 0) {
                callCount++;
                const origOpenDB = env.openDB.bind(env);
                env.openDB = () => {
                    env.openDB = origOpenDB;
                    throw new Error('MDB_CORRUPTED: Located page was wrong type');
                };
            }
            return env;
        });

        const factory = new LMDBStoreFactory(testDir);
        await factory.initialize();
        const store = factory.get(StoreName.public_schemas);

        await store.put('key', 'value');
        expect(store.get('key')).toBe('value');

        await factory.close();
    });

    it('should close the partially opened environment before deleting the version directory', async () => {
        // An open handle keeps data.mdb locked, so deleting first fails with EBUSY on Windows.
        const actual = await vi.importActual<typeof import('lmdb')>('lmdb');
        const order: string[] = [];
        let firstEnv = true;

        mockedOpen.mockImplementation((config: any) => {
            const env = actual.open(config);
            if (firstEnv) {
                firstEnv = false;
                const realClose = env.close.bind(env);
                env.close = async () => {
                    order.push('close');
                    return await realClose();
                };
                const realOpenDB = env.openDB.bind(env);
                env.openDB = () => {
                    env.openDB = realOpenDB;
                    throw new Error('MDB_CORRUPTED: Located page was wrong type');
                };
            }
            return env;
        });

        const factory = new LMDBStoreFactory(testDir);
        const internals = factory as unknown as { deleteVersionDir: (cause: unknown) => void };
        const realDelete = internals.deleteVersionDir.bind(factory);
        internals.deleteVersionDir = (cause: unknown) => {
            order.push('delete');
            realDelete(cause);
        };

        await factory.initialize();

        expect(order).toEqual(['close', 'delete']);

        await factory.close();
    });

    it('should delete the version directory during env recovery', async () => {
        const actual = await vi.importActual<typeof import('lmdb')>('lmdb');
        const versionDir = join(testDir, 'lmdb', 'v7');

        fs.mkdirSync(versionDir, { recursive: true });
        fs.writeFileSync(join(versionDir, 'dummy'), 'data');

        mockedOpen
            .mockImplementationOnce(() => {
                throw new Error('MDB_CORRUPTED: Located page was wrong type');
            })
            .mockImplementation(actual.open);

        const factory = new LMDBStoreFactory(testDir);
        await factory.initialize();

        // The dummy file should be gone (directory was deleted and recreated)
        expect(fs.existsSync(join(versionDir, 'dummy'))).toBe(false);

        await factory.close();
    });
});

describe('LMDB startup crash detection', () => {
    let testDir: string;
    let markersDir: string;
    let versionDir: string;

    beforeEach(async () => {
        testDir = join(process.cwd(), 'node_modules', '.cache', 'lmdb-startup-crash-test', `test-${Date.now()}`);
        markersDir = join(testDir, 'lmdb', LMDBOwnershipTracker.DirName);
        versionDir = join(testDir, 'lmdb', 'v7');
        fs.mkdirSync(testDir, { recursive: true });

        const actual = await vi.importActual<typeof import('lmdb')>('lmdb');
        mockedOpen.mockReset();
        mockedOpen.mockImplementation(actual.open);
    });

    afterEach(async () => {
        vi.restoreAllMocks();
        await new Promise((resolve) => setTimeout(resolve, 100));
        if (fs.existsSync(testDir)) {
            fs.rmSync(testDir, { recursive: true, force: true });
        }
    });

    function killAllForeignProcesses(): void {
        vi.spyOn(process, 'kill').mockImplementation((pid: number) => {
            if (pid === process.pid) return true;
            throw Object.assign(new Error('ESRCH'), { code: 'ESRCH' });
        });
    }

    it('should wipe version directory when a dead owner crashed mid-open', async () => {
        fs.mkdirSync(versionDir, { recursive: true });
        fs.writeFileSync(join(versionDir, 'stale-data.mdb'), 'pretend-corrupt');
        fs.mkdirSync(markersDir, { recursive: true });
        fs.writeFileSync(join(markersDir, markerName(123456, OwnershipPhase.opening)), '123456');
        killAllForeignProcesses();

        const factory = new LMDBStoreFactory(testDir);
        await factory.initialize();

        expect(fs.existsSync(join(versionDir, 'stale-data.mdb'))).toBe(false);

        await factory.close();
    });

    it('should wipe version directory when a stale opening marker PID was recycled to a live process', async () => {
        // Reproduces the PID-recycling gap: a mid-open crash left an opening marker whose PID the
        // OS later handed to an unrelated, still-live process. A bare liveness check would count it
        // as a live owner and suppress recovery; the marker's stale timestamp proves it is a crash.
        fs.mkdirSync(versionDir, { recursive: true });
        fs.writeFileSync(join(versionDir, 'stale-data.mdb'), 'pretend-corrupt');
        fs.mkdirSync(markersDir, { recursive: true });
        const recycledPid = 99994;
        const staleIso = new Date(Date.now() - 10 * 60 * 1000).toISOString();
        fs.writeFileSync(
            join(markersDir, markerName(recycledPid, OwnershipPhase.opening)),
            `${recycledPid}\n${staleIso}`,
        );
        vi.spyOn(process, 'kill').mockImplementation((pid: number) => {
            if (pid === recycledPid || pid === process.pid) return true; // recycled PID reads as alive
            throw Object.assign(new Error('ESRCH'), { code: 'ESRCH' });
        });

        const factory = new LMDBStoreFactory(testDir);
        await factory.initialize();

        expect(fs.existsSync(join(versionDir, 'stale-data.mdb'))).toBe(false);

        await factory.close();
    });

    it('should preserve version directory when a dead owner shut down healthily', async () => {
        fs.mkdirSync(versionDir, { recursive: true });
        const sentinel = join(versionDir, 'must-not-be-wiped');
        fs.mkdirSync(markersDir, { recursive: true });
        fs.writeFileSync(join(markersDir, markerName(123456, OwnershipPhase.running)), '123456');
        fs.writeFileSync(sentinel, 'keep-me');
        killAllForeignProcesses();

        const factory = new LMDBStoreFactory(testDir);
        await factory.initialize();

        expect(fs.existsSync(sentinel)).toBe(true);

        await factory.close();
    });

    it('should preserve version directory when a marker PID is still alive (multi-IDE)', async () => {
        fs.mkdirSync(versionDir, { recursive: true });
        const sentinel = join(versionDir, 'must-not-be-wiped');
        fs.mkdirSync(markersDir, { recursive: true });
        const liveForeignPid = 99995;
        fs.writeFileSync(join(markersDir, markerName(liveForeignPid, OwnershipPhase.opening)), String(liveForeignPid));
        vi.spyOn(process, 'kill').mockImplementation((pid: number) => {
            if (pid === liveForeignPid || pid === process.pid) return true;
            throw Object.assign(new Error('ESRCH'), { code: 'ESRCH' });
        });
        fs.writeFileSync(sentinel, 'keep-me');

        const factory = new LMDBStoreFactory(testDir);
        await factory.initialize();

        expect(fs.existsSync(sentinel)).toBe(true);
        expect(fs.existsSync(join(markersDir, markerName(liveForeignPid, OwnershipPhase.opening)))).toBe(true);

        await factory.close();
    });

    it('should record a running marker after a successful open and remove it on clean close', async () => {
        const factory = new LMDBStoreFactory(testDir);
        await factory.initialize();
        const ownMarker = join(markersDir, markerName(process.pid, OwnershipPhase.running));
        expect(fs.existsSync(ownMarker)).toBe(true);

        await factory.close();

        expect(fs.existsSync(ownMarker)).toBe(false);
    });

    it('should not wipe data on clean restart', async () => {
        const first = new LMDBStoreFactory(testDir);
        await first.initialize();
        const store = first.get(StoreName.public_schemas);
        await store.put('persist-key', 'persist-value');
        await first.close();

        const second = new LMDBStoreFactory(testDir);
        await second.initialize();
        const secondStore = second.get(StoreName.public_schemas);

        expect(secondStore.get<string>('persist-key')).toBe('persist-value');

        await second.close();
    });

    it('should not wipe data when a healthy server was killed abruptly', async () => {
        const first = new LMDBStoreFactory(testDir);
        await first.initialize();
        const store = first.get(StoreName.public_schemas);
        await store.put('survives-key', 'survives-value');
        await simulateAbruptKill(first);

        killAllForeignProcesses();
        const second = new LMDBStoreFactory(testDir);
        await second.initialize();
        const secondStore = second.get(StoreName.public_schemas);

        expect(secondStore.get<string>('survives-key')).toBe('survives-value');

        await second.close();
    });

    it('should wipe data when the prior instance crashed mid-open (simulated crash loop)', async () => {
        const first = new LMDBStoreFactory(testDir);
        await first.initialize();
        const store = first.get(StoreName.public_schemas);
        await store.put('doomed-key', 'doomed-value');
        await simulateAbruptKill(first);

        // A startup crash leaves an `opening` marker for a now-dead PID.
        fs.renameSync(
            join(markersDir, markerName(process.pid, OwnershipPhase.running)),
            join(markersDir, markerName(123456, OwnershipPhase.opening)),
        );
        killAllForeignProcesses();

        const second = new LMDBStoreFactory(testDir);
        await second.initialize();
        const secondStore = second.get(StoreName.public_schemas);

        expect(secondStore.get<string>('doomed-key')).toBeUndefined();

        await second.close();
    });
});

async function simulateAbruptKill(factory: LMDBStoreFactory): Promise<void> {
    // Release OS resources without the marker cleanup that a clean close() performs.
    await (factory as any).env.close();
    (factory as any).closed = true;
    if ((factory as any).metricsInterval !== undefined) clearInterval((factory as any).metricsInterval);
    if ((factory as any).cleanupTimeout !== undefined) clearTimeout((factory as any).cleanupTimeout);
}
