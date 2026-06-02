import { randomUUID as v4 } from 'crypto';
import { existsSync, mkdirSync, readdirSync, rmSync, writeFileSync } from 'fs';
import { join } from 'path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { LMDBOwnershipTracker, OwnershipPhase } from '../../../../src/datastore/lmdb/OwnershipTracker';

const OWNER_MARKER_PREFIX = 'owner.';

function markerName(pid: number, phase: OwnershipPhase): string {
    return `${OWNER_MARKER_PREFIX}${pid}.${phase}`;
}

describe('LMDBOwnershipTracker', () => {
    let testRoot: string;
    let lmdbDir: string;
    let markersDir: string;
    let onCrash: ReturnType<typeof vi.fn<() => void>>;
    const originalPid = process.pid;

    beforeEach(() => {
        testRoot = join(process.cwd(), 'node_modules', '.cache', 'lmdb-ownership-tracker-test', v4());
        lmdbDir = join(testRoot, 'lmdb');
        markersDir = join(lmdbDir, LMDBOwnershipTracker.DirName);
        mkdirSync(testRoot, { recursive: true });
        onCrash = vi.fn<() => void>();
    });

    afterEach(() => {
        vi.restoreAllMocks();
        Object.defineProperty(process, 'pid', { value: originalPid, configurable: true });
        if (existsSync(testRoot)) {
            rmSync(testRoot, { recursive: true, force: true });
        }
    });

    function asProcess(pid: number): void {
        Object.defineProperty(process, 'pid', { value: pid, configurable: true });
    }

    function ownerMarkers(): string[] {
        return readdirSync(markersDir)
            .filter((name) => name.startsWith(OWNER_MARKER_PREFIX))
            .toSorted();
    }

    /** Make every foreign PID appear dead while keeping the current process alive. */
    function killAllForeignProcesses(): void {
        vi.spyOn(process, 'kill').mockImplementation((pid: number) => {
            if (pid === process.pid) return true;
            throw Object.assign(new Error('ESRCH'), { code: 'ESRCH' });
        });
    }

    describe('beginStartup', () => {
        it('does not report a crash and records an opening marker on a fresh directory', async () => {
            const tracker = new LMDBOwnershipTracker(lmdbDir);

            await tracker.beginStartup(onCrash);

            expect(onCrash).not.toHaveBeenCalled();
            expect(ownerMarkers()).toEqual([markerName(process.pid, OwnershipPhase.opening)]);
        });

        it('reports a crash when a dead owner is stuck in the opening phase', async () => {
            mkdirSync(markersDir, { recursive: true });
            writeFileSync(join(markersDir, markerName(123456, OwnershipPhase.opening)), 'dead');
            killAllForeignProcesses();

            const tracker = new LMDBOwnershipTracker(lmdbDir);
            await tracker.beginStartup(onCrash);

            expect(onCrash).toHaveBeenCalledTimes(1);
        });

        it('does not report a crash for a dead owner that reached the running phase', async () => {
            mkdirSync(markersDir, { recursive: true });
            writeFileSync(join(markersDir, markerName(123456, OwnershipPhase.running)), 'dead-but-healthy');
            killAllForeignProcesses();

            const tracker = new LMDBOwnershipTracker(lmdbDir);
            await tracker.beginStartup(onCrash);

            expect(onCrash).not.toHaveBeenCalled();
        });

        it('does not report a crash while another process owns the directory (multi-IDE)', async () => {
            mkdirSync(markersDir, { recursive: true });
            const liveForeignPid = 99999;
            writeFileSync(join(markersDir, markerName(liveForeignPid, OwnershipPhase.opening)), String(liveForeignPid));
            vi.spyOn(process, 'kill').mockImplementation((pid: number) => {
                if (pid === liveForeignPid || pid === process.pid) return true;
                throw Object.assign(new Error('ESRCH'), { code: 'ESRCH' });
            });

            const tracker = new LMDBOwnershipTracker(lmdbDir);
            await tracker.beginStartup(onCrash);

            expect(onCrash).not.toHaveBeenCalled();
            expect(existsSync(join(markersDir, markerName(liveForeignPid, OwnershipPhase.opening)))).toBe(true);
        });

        it('preserves a live owner marker but clears dead ones', async () => {
            mkdirSync(markersDir, { recursive: true });
            const liveForeignPid = 99998;
            writeFileSync(join(markersDir, markerName(123456, OwnershipPhase.running)), 'dead');
            writeFileSync(join(markersDir, markerName(liveForeignPid, OwnershipPhase.opening)), String(liveForeignPid));
            vi.spyOn(process, 'kill').mockImplementation((pid: number) => {
                if (pid === liveForeignPid || pid === process.pid) return true;
                throw Object.assign(new Error('ESRCH'), { code: 'ESRCH' });
            });

            const tracker = new LMDBOwnershipTracker(lmdbDir);
            await tracker.beginStartup(onCrash);

            expect(existsSync(join(markersDir, markerName(123456, OwnershipPhase.running)))).toBe(false);
            expect(existsSync(join(markersDir, markerName(liveForeignPid, OwnershipPhase.opening)))).toBe(true);
            expect(existsSync(join(markersDir, markerName(process.pid, OwnershipPhase.opening)))).toBe(true);
        });

        it('treats a marker with a non-numeric PID as a removable, non-crash file', async () => {
            mkdirSync(markersDir, { recursive: true });
            writeFileSync(join(markersDir, `${OWNER_MARKER_PREFIX}not-a-pid.${OwnershipPhase.opening}`), 'garbage');

            const tracker = new LMDBOwnershipTracker(lmdbDir);
            await tracker.beginStartup(onCrash);

            expect(onCrash).not.toHaveBeenCalled();
            expect(existsSync(join(markersDir, `${OWNER_MARKER_PREFIX}not-a-pid.${OwnershipPhase.opening}`))).toBe(
                false,
            );
        });

        it('ignores markers with an unrecognised phase', async () => {
            mkdirSync(markersDir, { recursive: true });
            writeFileSync(join(markersDir, `${OWNER_MARKER_PREFIX}123456.bogus`), 'dead');
            killAllForeignProcesses();

            const tracker = new LMDBOwnershipTracker(lmdbDir);
            await tracker.beginStartup(onCrash);

            expect(onCrash).not.toHaveBeenCalled();
        });

        it('treats EPERM from process.kill as a live owner', async () => {
            mkdirSync(markersDir, { recursive: true });
            const protectedPid = 99996;
            writeFileSync(join(markersDir, markerName(protectedPid, OwnershipPhase.opening)), String(protectedPid));
            vi.spyOn(process, 'kill').mockImplementation((pid: number) => {
                if (pid === protectedPid) throw Object.assign(new Error('EPERM'), { code: 'EPERM' });
                if (pid === process.pid) return true;
                throw Object.assign(new Error('ESRCH'), { code: 'ESRCH' });
            });

            const tracker = new LMDBOwnershipTracker(lmdbDir);
            await tracker.beginStartup(onCrash);

            expect(onCrash).not.toHaveBeenCalled();
        });

        it('recovers a crash left by a predecessor that reused this process PID', async () => {
            mkdirSync(markersDir, { recursive: true });
            writeFileSync(join(markersDir, markerName(process.pid, OwnershipPhase.opening)), 'recycled-pid');

            const tracker = new LMDBOwnershipTracker(lmdbDir);
            await tracker.beginStartup(onCrash);

            expect(onCrash).toHaveBeenCalledTimes(1);
            expect(ownerMarkers()).toEqual([markerName(process.pid, OwnershipPhase.opening)]);
        });

        it('does not report a crash on retry from its own earlier opening marker', async () => {
            killAllForeignProcesses();
            const tracker = new LMDBOwnershipTracker(lmdbDir);

            // First attempt claims an opening marker, then "fails" before markRunning(),
            // leaving the marker on disk. A retry must recognise it as our own, not a crash.
            await tracker.beginStartup(onCrash);
            expect(existsSync(join(markersDir, markerName(process.pid, OwnershipPhase.opening)))).toBe(true);

            await tracker.beginStartup(onCrash);

            expect(onCrash).not.toHaveBeenCalled();
            expect(ownerMarkers()).toEqual([markerName(process.pid, OwnershipPhase.opening)]);
        });

        it('serializes concurrent startups so only one observes the crash', async () => {
            mkdirSync(markersDir, { recursive: true });
            writeFileSync(join(markersDir, markerName(123456, OwnershipPhase.opening)), 'dead');

            const pidA = 50001;
            const pidB = 50002;
            vi.spyOn(process, 'kill').mockImplementation((pid: number) => {
                if (pid === pidA || pid === pidB) return true;
                throw Object.assign(new Error('ESRCH'), { code: 'ESRCH' });
            });

            asProcess(pidA);
            const trackerA = new LMDBOwnershipTracker(lmdbDir);
            asProcess(pidB);
            const trackerB = new LMDBOwnershipTracker(lmdbDir);

            let crashes = 0;
            await Promise.all([trackerA.beginStartup(() => crashes++), trackerB.beginStartup(() => crashes++)]);

            expect(crashes).toBe(1);
        });

        it('proceeds without a crash when marker setup fails', async () => {
            mkdirSync(markersDir, { recursive: true });
            const tracker = new LMDBOwnershipTracker(lmdbDir);
            vi.spyOn(process, 'kill').mockImplementation(() => {
                throw Object.assign(new Error('ESRCH'), { code: 'ESRCH' });
            });
            writeFileSync(join(markersDir, markerName(123456, OwnershipPhase.opening)), 'dead');
            rmSync(markersDir, { recursive: true, force: true });
            writeFileSync(markersDir, 'not a directory');

            await expect(tracker.beginStartup(onCrash)).resolves.toBeUndefined();
            expect(onCrash).not.toHaveBeenCalled();
        });
    });

    describe('markRunning', () => {
        it('promotes the opening marker to running', async () => {
            const tracker = new LMDBOwnershipTracker(lmdbDir);
            await tracker.beginStartup(onCrash);

            tracker.markRunning();

            expect(ownerMarkers()).toEqual([markerName(process.pid, OwnershipPhase.running)]);
        });

        it('records a running marker even if no opening marker exists', () => {
            mkdirSync(markersDir, { recursive: true });
            const tracker = new LMDBOwnershipTracker(lmdbDir);

            tracker.markRunning();

            expect(existsSync(join(markersDir, markerName(process.pid, OwnershipPhase.running)))).toBe(true);
        });
    });

    describe('release', () => {
        it('removes this process markers in either phase', async () => {
            const tracker = new LMDBOwnershipTracker(lmdbDir);
            await tracker.beginStartup(onCrash);
            tracker.markRunning();

            tracker.release();

            expect(ownerMarkers()).toEqual([]);
        });

        it('is idempotent without a prior claim', () => {
            const tracker = new LMDBOwnershipTracker(lmdbDir);

            expect(() => tracker.release()).not.toThrow();
        });

        it('is idempotent when called twice', async () => {
            const tracker = new LMDBOwnershipTracker(lmdbDir);
            await tracker.beginStartup(onCrash);
            tracker.release();

            expect(() => tracker.release()).not.toThrow();
        });
    });
});
