import { randomUUID as v4 } from 'crypto';
import { existsSync, mkdirSync, rmSync, statSync, utimesSync } from 'fs';
import { join } from 'path';
import { afterEach, beforeEach, describe, it, expect } from 'vitest';
import {
    HeartbeatFileName,
    isOlderVersionDirectory,
    isRecentlyUsed,
    RecentUseWindowMs,
    touchHeartbeat,
} from '../../../src/datastore/VersionDirectory';

describe('version directory heartbeat', () => {
    let versionDir: string;
    const now = Date.now();
    const twoDaysAgo = new Date(now - 2 * RecentUseWindowMs);

    beforeEach(() => {
        versionDir = join(process.cwd(), 'node_modules', '.cache', 'version-directory', v4(), 'v3');
        mkdirSync(versionDir, { recursive: true });
        utimesSync(versionDir, twoDaysAgo, twoDaysAgo);
    });

    afterEach(() => {
        rmSync(join(versionDir, '..'), { recursive: true, force: true });
    });

    it('creates the heartbeat marker on first touch and refreshes it afterwards', () => {
        const first = new Date(now - 60_000);

        expect(touchHeartbeat(versionDir, first)).toBe(true);
        expect(existsSync(join(versionDir, HeartbeatFileName))).toBe(true);
        expect(statSync(join(versionDir, HeartbeatFileName)).mtimeMs).toBeCloseTo(first.getTime(), -3);

        expect(touchHeartbeat(versionDir, new Date(now))).toBe(true);
        expect(statSync(join(versionDir, HeartbeatFileName)).mtimeMs).toBeCloseTo(now, -3);
    });

    it('reports failure instead of throwing when the directory is gone', () => {
        rmSync(versionDir, { recursive: true, force: true });

        expect(touchHeartbeat(versionDir)).toBe(false);
    });

    it('treats a directory with a fresh heartbeat as recently used', () => {
        touchHeartbeat(versionDir, new Date(now));

        expect(isRecentlyUsed(versionDir, RecentUseWindowMs, now)).toBe(true);
    });

    it('treats a directory whose heartbeat is older than the window as unused', () => {
        touchHeartbeat(versionDir, twoDaysAgo);
        utimesSync(versionDir, twoDaysAgo, twoDaysAgo);

        expect(isRecentlyUsed(versionDir, RecentUseWindowMs, now)).toBe(false);
    });

    it('falls back to the directory mtime when no heartbeat was ever written', () => {
        expect(isRecentlyUsed(versionDir, RecentUseWindowMs, now)).toBe(false);

        const recent = new Date(now - 60_000);
        utimesSync(versionDir, recent, recent);

        expect(isRecentlyUsed(versionDir, RecentUseWindowMs, now)).toBe(true);
    });

    it('treats a directory that no longer exists as unused', () => {
        rmSync(versionDir, { recursive: true, force: true });

        expect(isRecentlyUsed(versionDir, RecentUseWindowMs, now)).toBe(false);
    });
});

describe('isOlderVersionDirectory', () => {
    const currentVersion = 6;

    it('should return true for a strictly older version directory', () => {
        expect(isOlderVersionDirectory('v1', currentVersion)).toBe(true);
        expect(isOlderVersionDirectory('v5', currentVersion)).toBe(true);
    });

    it('should treat v0 as an older version directory', () => {
        expect(isOlderVersionDirectory('v0', currentVersion)).toBe(true);
    });

    it('should return false for the current version directory', () => {
        expect(isOlderVersionDirectory('v6', currentVersion)).toBe(false);
    });

    it('should return false for a newer version directory', () => {
        expect(isOlderVersionDirectory('v7', currentVersion)).toBe(false);
        expect(isOlderVersionDirectory('v100', currentVersion)).toBe(false);
    });

    it('should return false for non-version directory names', () => {
        for (const name of ['markers', 'backup', 'lmdb', 'v', 'version1', 'V1', '1', '']) {
            expect(isOlderVersionDirectory(name, currentVersion)).toBe(false);
        }
    });

    it('should return false for names that only partially match the version format', () => {
        for (const name of ['v1.0', 'v-1', 'v1 ', ' v1', 'v1a', 'av1', 'v1/', 'v_1']) {
            expect(isOlderVersionDirectory(name, currentVersion)).toBe(false);
        }
    });

    it('should return false for a numeric value too large to compare as a safe integer', () => {
        const overflowing = `v${'9'.repeat(30)}`;
        expect(isOlderVersionDirectory(overflowing, currentVersion)).toBe(false);
    });
});
